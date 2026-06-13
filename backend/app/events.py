"""Хелпер записи в events — основу аналитики.
Каждое игровое действие зовёт log_event(). Коммит делает вызывающий код."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from .models import Event


async def log_event(
    session: AsyncSession,
    type_: str,
    user_id: UUID | None = None,
    payload: dict | None = None,
) -> None:
    session.add(Event(user_id=user_id, type=type_, payload=payload or {}))
