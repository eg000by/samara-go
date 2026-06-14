"""Профиль игрока. /me вызывается фронтендом при входе:
создаёт профиль (если триггер почему-то не сработал) и пишет событие login."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..db import get_session
from ..economy import expand_cost
from ..events import log_event
from ..models import User
from ..schemas import UserProfile

router = APIRouter(tags=["profile"])


@router.get("/me", response_model=UserProfile)
async def me(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfile:
    profile = await session.get(User, user.id)
    if profile is None:
        # подстраховка: обычно профиль создаёт триггер on_auth_user_created
        profile = User(id=user.id, username=(user.email or "").split("@")[0] or None)
        session.add(profile)

    await log_event(session, "login", user_id=user.id)
    await session.commit()
    await session.refresh(profile)
    return UserProfile(
        id=profile.id,
        username=profile.username,
        currency=profile.currency,
        plots_unlocked=profile.plots_unlocked,
        expand_cost=expand_cost(profile.plots_unlocked),
    )
