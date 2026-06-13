"""Юнит-тесты чистой игровой логики — без БД и сети, детерминированные."""

import random
from datetime import datetime, timedelta, timezone

from app.game import (
    MAX_STAGE,
    SEED_CATALOG,
    growth_progress,
    growth_stage,
    is_ready,
    pick_random_seed,
)


def test_catalog_has_8_seeds_weights_sum_to_100():
    assert len(SEED_CATALOG) == 8
    total = sum(s.spawn_weight for s in SEED_CATALOG.values())
    assert round(total, 6) == 100.0


def test_catalog_rarities_valid():
    valid = {"common", "uncommon", "rare", "epic", "legendary"}
    assert all(s.rarity in valid for s in SEED_CATALOG.values())


# фиксированные planted/now — чтобы расчёт был детерминированным (без «капающего» времени)
BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _at(seconds: float) -> datetime:
    return BASE + timedelta(seconds=seconds)


def test_growth_progress_clamped_0_1():
    grow = 100
    assert growth_progress(BASE, grow, now=_at(0)) == 0.0
    assert growth_progress(BASE, grow, now=_at(50)) == 0.5
    # переросло — обрезается до 1.0, не больше
    assert growth_progress(BASE, grow, now=_at(500)) == 1.0


def test_growth_stage_boundaries():
    grow = 100
    assert growth_stage(BASE, grow, now=_at(0)) == 0
    assert growth_stage(BASE, grow, now=_at(25)) == 1
    assert growth_stage(BASE, grow, now=_at(50)) == 2
    assert growth_stage(BASE, grow, now=_at(75)) == 3
    assert growth_stage(BASE, grow, now=_at(100)) == MAX_STAGE


def test_is_ready_only_when_full():
    grow = 60
    assert is_ready(BASE, grow, now=_at(59)) is False
    assert is_ready(BASE, grow, now=_at(60)) is True


def test_growth_handles_naive_datetime():
    # planted_at без таймзоны не должен ронять расчёт (внутри докидывается UTC)
    naive = BASE.replace(tzinfo=None)
    assert growth_progress(naive, 60, now=_at(30)) == 0.5


def test_pick_random_seed_respects_weights():
    rng = random.Random(42)
    counts: dict[str, int] = {}
    for _ in range(20_000):
        s = pick_random_seed(rng)
        counts[s.seed_type] = counts.get(s.seed_type, 0) + 1
    # common-пшеница (вес 35) должна выпадать чаще легендарки (вес 0.4)
    assert counts["wheat"] > counts["white_night_lily"]
    # все выпавшие типы есть в каталоге
    assert set(counts).issubset(SEED_CATALOG.keys())
