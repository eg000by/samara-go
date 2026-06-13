"""Защищённый эндпоинт спавна семян. Дёргается внешним cron (Шаг 4)
с заголовком X-Cron-Secret. Публичным быть не должен."""

import hmac
import math
import random

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..events import log_event
from ..game import pick_random_seed

router = APIRouter(tags=["cron"])


async def require_cron_secret(x_cron_secret: str | None = Header(default=None)) -> None:
    """Пускаем только обладателя секрета. Сравнение постоянного времени."""
    if not settings.CRON_SECRET:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "cron secret not configured")
    if not x_cron_secret or not hmac.compare_digest(x_cron_secret, settings.CRON_SECRET):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "bad cron secret")


@router.post("/cron/spawn", dependencies=[Depends(require_cron_secret)])
async def spawn(
    count: int = Query(default=15, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Создать `count` случайных семян в радиусе SPAWN_RADIUS_M от центра."""
    dists, azimuths, types, rarities = [], [], [], []
    for _ in range(count):
        sd = pick_random_seed()
        # R·√U — равномерно по площади круга (а не сгущая к центру)
        dists.append(settings.SPAWN_RADIUS_M * math.sqrt(random.random()))
        azimuths.append(random.random() * 2 * math.pi)  # ST_Project ждёт радианы
        types.append(sd.seed_type)
        rarities.append(sd.rarity)

    rows = (await session.execute(
        text("""
            insert into seeds_on_map (geom, seed_type, rarity, expires_at)
            select ST_Project(ST_MakePoint(:clon, :clat)::geography, d, a),
                   st, rar,
                   now() + make_interval(mins => :ttl)
            from unnest(
                cast(:dists as float8[]), cast(:azs as float8[]),
                cast(:types as text[]),   cast(:rars as text[])
            ) as t(d, a, st, rar)
            returning id, seed_type, ST_X(geom::geometry) as lon, ST_Y(geom::geometry) as lat
        """),
        {
            "clon": settings.CENTER_LON, "clat": settings.CENTER_LAT,
            "ttl": settings.SEED_TTL_MINUTES,
            "dists": dists, "azs": azimuths, "types": types, "rars": rarities,
        },
    )).mappings().all()

    for r in rows:
        await log_event(session, "spawn", None,
                        {"seed_id": r["id"], "seed_type": r["seed_type"], "lon": r["lon"], "lat": r["lat"]})
    await session.commit()
    return {"spawned": len(rows)}
