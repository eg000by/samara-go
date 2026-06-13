"""Тесты API. Публичные — всегда; игровой цикл — при наличии Supabase-ключа."""

from sqlalchemy import text

from app.config import settings
from app.db import engine

from conftest import needs_supabase

CENTER = {"lat": settings.CENTER_LAT, "lon": settings.CENTER_LON}


@needs_supabase  # /health делает SELECT 1 — нужна живая БД (в CI скипается)
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["db"] == "up"


async def test_catalog_has_8(client):
    r = await client.get("/catalog")
    assert r.status_code == 200
    assert len(r.json()) == 8


async def test_me_requires_auth(client):
    assert (await client.get("/me")).status_code == 403


async def test_cron_spawn_rejects_without_secret(client):
    assert (await client.post("/cron/spawn")).status_code == 403


@needs_supabase
async def test_me_returns_profile(client, test_user):
    r = await client.get("/me", headers=test_user["headers"])
    assert r.status_code == 200
    assert r.json()["id"] == test_user["id"]
    assert r.json()["currency"] == 0


@needs_supabase
async def test_collect_plant_harvest_cycle(client, test_user):
    h = test_user["headers"]
    uid = test_user["id"]

    # два семени в центр карты: одно соберём, второе — для анти-чит проверки
    async with engine.begin() as c:
        ids = (await c.execute(
            text("""
                insert into seeds_on_map (geom, seed_type, rarity, expires_at)
                values (ST_MakePoint(:lon, :lat)::geography, 'wheat', 'common', now() + interval '30 min'),
                       (ST_MakePoint(:lon, :lat)::geography, 'wheat', 'common', now() + interval '30 min')
                returning id
            """),
            CENTER,
        )).scalars().all()
    seed_ok, seed_far = ids

    try:
        # карта видит оба семени и они в радиусе сбора
        mp = (await client.get("/map", params=CENTER, headers=h)).json()
        ours = [s for s in mp if s["id"] in ids]
        assert len(ours) == 2
        assert all(s["can_collect"] for s in ours)

        # анти-чит: с далёкой позиции сбор отклонён
        far = await client.post(f"/collect/{seed_far}", json={"lat": 59.97, "lon": 30.40}, headers=h)
        assert far.status_code == 403

        # валидный сбор
        ok = await client.post(f"/collect/{seed_ok}", json=CENTER, headers=h)
        assert ok.status_code == 200
        assert ok.json()["qty"] == 1

        # повторный сбор того же семени — уже собрано
        again = await client.post(f"/collect/{seed_ok}", json=CENTER, headers=h)
        assert again.status_code == 410

        # семя в инвентаре
        inv = (await client.get("/inventory", headers=h)).json()
        assert any(i["seed_type"] == "wheat" and i["qty"] == 1 for i in inv)

        # посадка
        assert (await client.post("/plant", json={"cell_index": 0, "seed_type": "wheat"}, headers=h)).status_code == 200

        # урожай рано — нельзя
        assert (await client.post("/harvest", json={"cell_index": 0}, headers=h)).status_code == 409

        # перематываем время посадки в прошлое → созрело (ленивый рост)
        async with engine.begin() as c:
            await c.execute(
                text("update field_cells set planted_at = now() - interval '10 min' where user_id = :u and cell_index = 0"),
                {"u": uid},
            )

        # теперь урожай собирается, валюта начисляется
        harvested = await client.post("/harvest", json={"cell_index": 0}, headers=h)
        assert harvested.status_code == 200
        assert harvested.json()["reward"] == 5
        assert harvested.json()["currency"] == 5

        # событие harvest записано
        async with engine.connect() as c:
            n = (await c.execute(
                text("select count(*) from events where user_id = :u and type = 'harvest'"), {"u": uid}
            )).scalar()
        assert n == 1
    finally:
        async with engine.begin() as c:
            await c.execute(text("delete from seeds_on_map where id = any(:ids)"), {"ids": ids})
