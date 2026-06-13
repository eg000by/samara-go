"""Игровой каталог семян и чистые функции игровой логики.
Каталог живёт в коде (а не в БД): рост и награды считаем на сервере,
в БД хранится только seed_type строкой. См. docs/game-design.md."""

import random
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class SeedDef:
    seed_type: str
    name_ru: str
    rarity: str
    spawn_weight: float  # суммарно = 100 → это сразу проценты выпадения
    grow_seconds: int
    reward: int


_SEEDS = [
    SeedDef("wheat", "Пшеница", "common", 35.0, 120, 5),
    SeedDef("potato", "Картофель", "common", 25.0, 300, 10),
    SeedDef("tomato", "Томат", "uncommon", 15.0, 600, 25),
    SeedDef("cucumber", "Огурец", "uncommon", 12.0, 600, 22),
    SeedDef("strawberry", "Клубника", "rare", 7.0, 1200, 60),
    SeedDef("apple", "Антоновка", "rare", 4.0, 1800, 90),
    SeedDef("grape", "Виноград", "epic", 1.6, 3600, 200),
    SeedDef("white_night_lily", "Лилия белых ночей", "legendary", 0.4, 7200, 600),
]

SEED_CATALOG: dict[str, SeedDef] = {s.seed_type: s for s in _SEEDS}

MAX_STAGE = 4  # 0..4, спелое = 4


def pick_random_seed(rng: random.Random | None = None) -> SeedDef:
    """Случайный тип семени с учётом редкости (для спавна)."""
    rng = rng or random
    return rng.choices(_SEEDS, weights=[s.spawn_weight for s in _SEEDS], k=1)[0]


def growth_progress(planted_at: datetime, grow_seconds: int, now: datetime | None = None) -> float:
    """Прогресс роста в [0, 1]. Лениво — из planted_at и текущего времени."""
    now = now or datetime.now(timezone.utc)
    if planted_at.tzinfo is None:
        planted_at = planted_at.replace(tzinfo=timezone.utc)
    elapsed = (now - planted_at).total_seconds()
    if grow_seconds <= 0:
        return 1.0
    return max(0.0, min(1.0, elapsed / grow_seconds))


def growth_stage(planted_at: datetime, grow_seconds: int, now: datetime | None = None) -> int:
    """Стадия 0..4. 4 = спелое, можно собирать урожай."""
    return min(MAX_STAGE, int(growth_progress(planted_at, grow_seconds, now) * MAX_STAGE))


def is_ready(planted_at: datetime, grow_seconds: int, now: datetime | None = None) -> bool:
    return growth_stage(planted_at, grow_seconds, now) >= MAX_STAGE
