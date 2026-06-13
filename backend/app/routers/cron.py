"""Защищённый эндпоинт спавна семян. Дёргается внешним cron (Шаг 4)
с заголовком X-Cron-Secret. Публичным быть не должен."""

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..spawn import spawn_seeds

router = APIRouter(tags=["cron"])


async def require_cron_secret(x_cron_secret: str | None = Header(default=None)) -> None:
    """Пускаем только обладателя секрета. Сравнение постоянного времени."""
    if not settings.CRON_SECRET:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "cron secret not configured")
    if not x_cron_secret or not hmac.compare_digest(x_cron_secret, settings.CRON_SECRET):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "bad cron secret")


@router.post("/cron/spawn", dependencies=[Depends(require_cron_secret)])
async def spawn(
    count: int = Query(default=35, ge=1, le=80),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Создать `count` случайных семян, разбросав их по зонам спавна (районы Питера)."""
    n = await spawn_seeds(session, count)
    await session.commit()
    return {"spawned": n}
