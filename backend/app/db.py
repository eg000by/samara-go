"""Async-движок SQLAlchemy и фабрика сессий.

Тонкий момент Supabase: ходим через transaction-pooler (pgbouncer). В этом
режиме сервер мультиплексирует соединения и НЕ поддерживает prepared statements
asyncpg — без настроек ниже словишь "prepared statement ... already exists".
"""

from collections.abc import AsyncGenerator
from uuid import uuid4

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from .config import settings


def _to_asyncpg(url: str) -> str:
    """Supabase отдаёт postgresql://..., а драйверу нужен postgresql+asyncpg://."""
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url.replace("postgresql://", "postgresql+asyncpg://", 1)


engine = create_async_engine(
    _to_asyncpg(settings.DATABASE_URL),
    # Соединения уже пулит pgbouncer на стороне Supabase — свой пул не нужен.
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,            # отключаем кэш prepared у asyncpg
        "prepared_statement_cache_size": 0,   # ...и у диалекта SQLAlchemy
        # уникальные имена стейтментов — на случай переиспользования бэкендов pgbouncer
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
    },
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI-зависимость: одна сессия на запрос."""
    async with SessionLocal() as session:
        yield session
