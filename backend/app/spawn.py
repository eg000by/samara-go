"""Логика спавна семян. Общая для /cron/spawn и для авто-досыпки в /map.

Авто-досыпка нужна, потому что бесплатный GitHub-cron сильно задерживает
запуски (порой раз в час+), а TTL семени — минуты. Поэтому карта чинит себя
сама: если активных семян мало, бэкенд при чтении карты досыпает партию.
"""

import math
import random

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .events import log_event
from .game import pick_random_seed, pick_spawn_zone


async def spawn_seeds(session: AsyncSession, count: int) -> int:
    """Создать `count` случайных семян, разбросав их по зонам спавна (районы Питера).
    Коммит делает вызывающий код. Возвращает число созданных семян."""
    if count <= 0:
        return 0

    clons, clats, dists, azimuths, types, rarities = [], [], [], [], [], []
    for _ in range(count):
        sd = pick_random_seed()
        z = pick_spawn_zone()           # для каждого семени — своя зона (свой центр и радиус)
        clons.append(z.lon)
        clats.append(z.lat)
        # R·√U — равномерно по площади круга зоны (а не сгущая к центру)
        dists.append(z.radius_m * math.sqrt(random.random()))
        azimuths.append(random.random() * 2 * math.pi)  # ST_Project ждёт радианы
        types.append(sd.seed_type)
        rarities.append(sd.rarity)

    rows = (await session.execute(
        text("""
            insert into seeds_on_map (geom, seed_type, rarity, expires_at)
            select ST_Project(ST_MakePoint(clon, clat)::geography, d, a),
                   st, rar,
                   now() + make_interval(mins => :ttl)
            from unnest(
                cast(:clons as float8[]), cast(:clats as float8[]),
                cast(:dists as float8[]), cast(:azs as float8[]),
                cast(:types as text[]),   cast(:rars as text[])
            ) as t(clon, clat, d, a, st, rar)
            returning id, seed_type, ST_X(geom::geometry) as lon, ST_Y(geom::geometry) as lat
        """),
        {
            "ttl": settings.SEED_TTL_MINUTES,
            "clons": clons, "clats": clats,
            "dists": dists, "azs": azimuths, "types": types, "rars": rarities,
        },
    )).mappings().all()

    for r in rows:
        await log_event(session, "spawn", None,
                        {"seed_id": r["id"], "seed_type": r["seed_type"],
                         "lon": r["lon"], "lat": r["lat"]})
    return len(rows)


async def active_seed_count(session: AsyncSession) -> int:
    return (await session.execute(
        text("select count(*) from seeds_on_map where collected_by is null and expires_at > now()")
    )).scalar_one()
