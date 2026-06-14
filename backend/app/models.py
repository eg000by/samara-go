"""ORM-модели. Отражают таблицы, созданные в db/schema.sql.
Источник правды по DDL дальше — Alembic (под-шаг 2.x)."""

from datetime import datetime
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    SmallInteger,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# Все временные колонки в БД — timestamptz. Без timezone=True SQLAlchemy мапит
# их в TIMESTAMP WITHOUT TIME ZONE и ломается на tz-aware datetime.
_TS = DateTime(timezone=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    username: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    # сколько клеток поля открыто (3..9); остальные открываются за монеты
    plots_unlocked: Mapped[int] = mapped_column(SmallInteger, default=3, server_default=text("3"))
    created_at: Mapped[datetime] = mapped_column(_TS, server_default=text("now()"))


class SeedOnMap(Base):
    __tablename__ = "seeds_on_map"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    # geography(Point,4326): расстояния в ST_DWithin сразу в метрах.
    # spatial_index=False — GIST-индекс заводим вручную (idx_seeds_geom), иначе
    # geoalchemy2 при autogenerate создаст дублирующий индекс со своим именем.
    geom: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=False))
    seed_type: Mapped[str] = mapped_column(Text)
    rarity: Mapped[str] = mapped_column(Text)
    spawned_at: Mapped[datetime] = mapped_column(_TS, server_default=text("now()"))
    expires_at: Mapped[datetime] = mapped_column(_TS)
    collected_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    collected_at: Mapped[datetime | None] = mapped_column(_TS)


class InventoryItem(Base):
    __tablename__ = "inventory"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    seed_type: Mapped[str] = mapped_column(Text, primary_key=True)
    qty: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))


class FieldCell(Base):
    __tablename__ = "field_cells"
    __table_args__ = (CheckConstraint("cell_index between 0 and 35", name="cell_index_range"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    cell_index: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    planted_seed_type: Mapped[str | None] = mapped_column(Text)
    planted_at: Mapped[datetime | None] = mapped_column(_TS)
    harvested_at: Mapped[datetime | None] = mapped_column(_TS)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    type: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(_TS, server_default=text("now()"))
