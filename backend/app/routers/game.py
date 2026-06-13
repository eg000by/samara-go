"""Игровые роуты: карта, сбор, инвентарь, поле, посадка, урожай.
Каждое значимое действие пишет строку в events (основа аналитики)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..config import settings
from ..db import get_session
from ..events import log_event
from ..game import SEED_CATALOG, growth_progress, growth_stage, is_ready
from ..models import FieldCell, InventoryItem, User
from ..schemas import (
    CatalogEntry,
    CollectResult,
    FieldCellOut,
    HarvestIn,
    HarvestResult,
    InventoryItemOut,
    PlantIn,
    PlayerPos,
    SeedOnMapOut,
)

router = APIRouter(tags=["game"])

# Точка игрока в SQL: (lon, lat) — в PostGIS долгота первой!
_PLAYER_POINT = "ST_MakePoint(:lon, :lat)::geography"


def _name(seed_type: str) -> str:
    sd = SEED_CATALOG.get(seed_type)
    return sd.name_ru if sd else seed_type


@router.get("/catalog", response_model=list[CatalogEntry])
async def catalog() -> list[CatalogEntry]:
    """Справочник семян для фронтенда (без авторизации)."""
    return [
        CatalogEntry(
            seed_type=s.seed_type, name=s.name_ru, rarity=s.rarity,
            spawn_weight=s.spawn_weight, grow_seconds=s.grow_seconds, reward=s.reward,
        )
        for s in SEED_CATALOG.values()
    ]


@router.get("/map", response_model=list[SeedOnMapOut])
async def get_map(
    lat: float, lon: float,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[SeedOnMapOut]:
    """Активные семена в радиусе видимости вокруг игрока."""
    rows = (await session.execute(
        text(f"""
            select id, seed_type, rarity,
                   ST_Y(geom::geometry) as lat,
                   ST_X(geom::geometry) as lon,
                   ST_Distance(geom, {_PLAYER_POINT}) as dist_m,
                   ST_DWithin(geom, {_PLAYER_POINT}, :collect_r) as can_collect
            from seeds_on_map
            where collected_by is null
              and expires_at > now()
              and ST_DWithin(geom, {_PLAYER_POINT}, :view_r)
            order by dist_m
        """),
        {"lat": lat, "lon": lon, "collect_r": settings.COLLECT_RADIUS_M, "view_r": settings.MAP_VIEW_RADIUS_M},
    )).mappings().all()

    return [
        SeedOnMapOut(
            id=r["id"], seed_type=r["seed_type"], name=_name(r["seed_type"]),
            rarity=r["rarity"], lat=r["lat"], lon=r["lon"],
            dist_m=round(r["dist_m"], 1), can_collect=r["can_collect"],
        )
        for r in rows
    ]


@router.post("/collect/{seed_id}", response_model=CollectResult)
async def collect(
    seed_id: int, pos: PlayerPos,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CollectResult:
    """Собрать семя. Дистанцию проверяем НА СЕРВЕРЕ (анти-чит), строку лочим."""
    row = (await session.execute(
        text(f"""
            select seed_type, rarity,
                   ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lon,
                   ST_DWithin(geom, {_PLAYER_POINT}, :collect_r) as in_range,
                   (expires_at > now()) as alive,
                   collected_by
            from seeds_on_map
            where id = :id
            for update
        """),
        {"id": seed_id, "lat": pos.lat, "lon": pos.lon, "collect_r": settings.COLLECT_RADIUS_M},
    )).mappings().first()

    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "seed not found")
    if row["collected_by"] is not None or not row["alive"]:
        raise HTTPException(status.HTTP_410_GONE, "seed already collected or expired")
    if not row["in_range"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "too far from seed")

    seed_type = row["seed_type"]
    await session.execute(
        text("update seeds_on_map set collected_by = :u, collected_at = now() where id = :id"),
        {"u": str(user.id), "id": seed_id},
    )
    await session.execute(
        pg_insert(InventoryItem)
        .values(user_id=user.id, seed_type=seed_type, qty=1)
        .on_conflict_do_update(
            index_elements=["user_id", "seed_type"],
            set_={"qty": InventoryItem.qty + 1},
        )
    )
    new_qty = (await session.execute(
        select(InventoryItem.qty).where(
            InventoryItem.user_id == user.id, InventoryItem.seed_type == seed_type
        )
    )).scalar_one()

    await log_event(session, "collect", user.id,
                    {"seed_id": seed_id, "seed_type": seed_type, "lon": row["lon"], "lat": row["lat"]})
    await session.commit()
    return CollectResult(seed_type=seed_type, name=_name(seed_type), qty=new_qty)


@router.get("/inventory", response_model=list[InventoryItemOut])
async def inventory(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[InventoryItemOut]:
    rows = (await session.execute(
        select(InventoryItem)
        .where(InventoryItem.user_id == user.id, InventoryItem.qty > 0)
        .order_by(InventoryItem.seed_type)
    )).scalars().all()
    return [
        InventoryItemOut(
            seed_type=i.seed_type, name=_name(i.seed_type),
            rarity=(SEED_CATALOG.get(i.seed_type).rarity if SEED_CATALOG.get(i.seed_type) else "unknown"),
            qty=i.qty,
        )
        for i in rows
    ]


@router.get("/field", response_model=list[FieldCellOut])
async def field(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[FieldCellOut]:
    """Поле 6x6. Стадия роста вычисляется ЛЕНИВО из planted_at — без таймеров."""
    rows = (await session.execute(
        select(FieldCell).where(FieldCell.user_id == user.id)
    )).scalars().all()
    by_idx = {c.cell_index: c for c in rows}

    cells: list[FieldCellOut] = []
    n = settings.FIELD_SIZE * settings.FIELD_SIZE
    for i in range(n):
        c = by_idx.get(i)
        if c is None or c.planted_seed_type is None:
            cells.append(FieldCellOut(cell_index=i, empty=True))
            continue
        sd = SEED_CATALOG[c.planted_seed_type]
        prog = growth_progress(c.planted_at, sd.grow_seconds)
        cells.append(FieldCellOut(
            cell_index=i, empty=False, seed_type=c.planted_seed_type, name=sd.name_ru,
            stage=growth_stage(c.planted_at, sd.grow_seconds),
            progress=round(prog, 3),
            ready=is_ready(c.planted_at, sd.grow_seconds),
            seconds_left=max(0, int(sd.grow_seconds * (1 - prog))),
        ))
    return cells


@router.post("/plant", response_model=FieldCellOut)
async def plant(
    body: PlantIn,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FieldCellOut:
    if body.seed_type not in SEED_CATALOG:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "unknown seed_type")

    inv = (await session.execute(
        select(InventoryItem)
        .where(InventoryItem.user_id == user.id, InventoryItem.seed_type == body.seed_type)
        .with_for_update()
    )).scalar_one_or_none()
    if inv is None or inv.qty < 1:
        raise HTTPException(status.HTTP_409_CONFLICT, "no seeds of this type in inventory")

    cell = (await session.execute(
        select(FieldCell)
        .where(FieldCell.user_id == user.id, FieldCell.cell_index == body.cell_index)
        .with_for_update()
    )).scalar_one_or_none()
    if cell is not None and cell.planted_seed_type is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "cell already occupied")

    now = datetime.now(timezone.utc)
    if cell is None:
        cell = FieldCell(user_id=user.id, cell_index=body.cell_index)
        session.add(cell)
    cell.planted_seed_type = body.seed_type
    cell.planted_at = now
    cell.harvested_at = None
    inv.qty -= 1

    await log_event(session, "plant", user.id, {"cell_index": body.cell_index, "seed_type": body.seed_type})
    await session.commit()

    sd = SEED_CATALOG[body.seed_type]
    return FieldCellOut(
        cell_index=body.cell_index, empty=False, seed_type=body.seed_type, name=sd.name_ru,
        stage=0, progress=0.0, ready=False, seconds_left=sd.grow_seconds,
    )


@router.post("/harvest", response_model=HarvestResult)
async def harvest(
    body: HarvestIn,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> HarvestResult:
    cell = (await session.execute(
        select(FieldCell)
        .where(FieldCell.user_id == user.id, FieldCell.cell_index == body.cell_index)
        .with_for_update()
    )).scalar_one_or_none()
    if cell is None or cell.planted_seed_type is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cell is empty")

    sd = SEED_CATALOG[cell.planted_seed_type]
    if not is_ready(cell.planted_at, sd.grow_seconds):
        raise HTTPException(status.HTTP_409_CONFLICT, "not ready yet")

    seed_type = cell.planted_seed_type
    reward = sd.reward

    user_row = await session.get(User, user.id, with_for_update=True)
    user_row.currency += reward

    cell.planted_seed_type = None
    cell.planted_at = None
    cell.harvested_at = datetime.now(timezone.utc)

    await log_event(session, "harvest", user.id,
                    {"cell_index": body.cell_index, "seed_type": seed_type, "reward": reward})
    await session.commit()
    return HarvestResult(cell_index=body.cell_index, seed_type=seed_type, reward=reward, currency=user_row.currency)
