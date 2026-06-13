"""Pydantic-схемы ответов API (типизируем для OpenAPI и фронтенда)."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str | None
    currency: int


class PlayerPos(BaseModel):
    """Геопозиция игрока (тело запроса для сбора семени)."""

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class CatalogEntry(BaseModel):
    seed_type: str
    name: str
    rarity: str
    spawn_weight: float
    grow_seconds: int
    reward: int


class SeedOnMapOut(BaseModel):
    id: int
    seed_type: str
    name: str
    rarity: str
    lat: float
    lon: float
    dist_m: float
    can_collect: bool  # игрок в радиусе сбора?


class CollectResult(BaseModel):
    seed_type: str
    name: str
    qty: int  # сколько стало в инвентаре


class InventoryItemOut(BaseModel):
    seed_type: str
    name: str
    rarity: str
    qty: int


class FieldCellOut(BaseModel):
    cell_index: int
    empty: bool
    seed_type: str | None = None
    name: str | None = None
    stage: int = 0          # 0..4, 4 = спелое
    progress: float = 0.0   # 0..1
    ready: bool = False
    seconds_left: int = 0


class PlantIn(BaseModel):
    cell_index: int = Field(ge=0, le=35)
    seed_type: str


class HarvestIn(BaseModel):
    cell_index: int = Field(ge=0, le=35)


class HarvestResult(BaseModel):
    cell_index: int
    seed_type: str
    reward: int
    currency: int  # новый баланс


class StatsTotals(BaseModel):
    collect: int = 0
    plant: int = 0
    harvest: int = 0


class DailyStat(BaseModel):
    day: str  # YYYY-MM-DD
    collect: int
    harvest: int


class StatsResponse(BaseModel):
    totals: StatsTotals
    by_day: list[DailyStat]  # последние 7 дней
