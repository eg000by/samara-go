import asyncio
from logging.config import fileConfig

import geoalchemy2  # noqa: F401  регистрирует типы PostGIS для autogenerate
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.config import settings
from app.db import _to_asyncpg
from app.models import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# URL берём из env (DATABASE_URL_DIRECT для миграций, иначе runtime-URL),
# а не из alembic.ini — секретов в файле не держим.
_db_url = settings.DATABASE_URL_DIRECT or settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", _to_asyncpg(_db_url))

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData моделей — для autogenerate будущих миграций.
target_metadata = Base.metadata

# Наши таблицы. Всё остальное (spatial_ref_sys от PostGIS, схема auth) —
# не наша зона ответственности, autogenerate их игнорирует.
_OUR_TABLES = {"users", "seeds_on_map", "inventory", "field_cells", "events"}
# Индексы и FK, заведённые сырым SQL в начальной миграции (autogenerate их не трогает).
_MANAGED_INDEXES = {
    "idx_seeds_geom", "idx_seeds_active",
    "idx_events_created", "idx_events_type", "idx_events_user_time",
}


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table":
        return name in _OUR_TABLES
    if type_ == "index":
        return name not in _MANAGED_INDEXES
    if type_ == "foreign_key_constraint" and name == "users_id_fkey":
        return False  # FK на auth.users — управляется схемой Supabase
    return True

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # отключаем prepared statements — на случай прогона через pgbouncer-пулер
        connect_args={"statement_cache_size": 0},
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
