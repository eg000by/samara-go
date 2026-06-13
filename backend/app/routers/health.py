"""/health — лёгкий эндпоинт для keep-alive пинга (Шаг 4).

Делает SELECT 1: будит и Render (15 мин простоя), и Supabase (7 дней простоя).
Запрос тривиальный — не нагружаем БД на каждом пинге."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(text("select 1"))
    return {"status": "ok", "db": "up"}
