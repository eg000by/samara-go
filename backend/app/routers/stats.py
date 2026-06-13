"""Read-only аналитика для текущего игрока (для Recharts на фронте).
Большая аналитика по всем игрокам — в DataLens (Шаг 5)."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import CurrentUser, get_current_user
from ..db import get_session
from ..schemas import DailyStat, StatsResponse, StatsTotals

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
async def stats(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StatsResponse:
    totals_rows = (await session.execute(
        text("""
            select type, count(*) as c
            from events
            where user_id = :u and type in ('collect', 'plant', 'harvest')
            group by type
        """),
        {"u": str(user.id)},
    )).mappings().all()
    t = {r["type"]: r["c"] for r in totals_rows}

    # последние 7 дней с заполнением нулями (generate_series), чтобы график был ровным
    by_day = (await session.execute(
        text("""
            with days as (
                select generate_series(
                    date_trunc('day', now()) - interval '6 days',
                    date_trunc('day', now()),
                    interval '1 day'
                ) as d
            )
            select to_char(days.d, 'YYYY-MM-DD') as day,
                   count(e.id) filter (where e.type = 'collect') as collect,
                   count(e.id) filter (where e.type = 'harvest') as harvest
            from days
            left join events e
                   on e.user_id = :u and date_trunc('day', e.created_at) = days.d
            group by days.d
            order by days.d
        """),
        {"u": str(user.id)},
    )).mappings().all()

    return StatsResponse(
        totals=StatsTotals(
            collect=t.get("collect", 0), plant=t.get("plant", 0), harvest=t.get("harvest", 0)
        ),
        by_day=[
            DailyStat(day=r["day"], collect=r["collect"], harvest=r["harvest"]) for r in by_day
        ],
    )
