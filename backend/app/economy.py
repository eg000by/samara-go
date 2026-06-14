"""Экономика поля: цена открытия следующей клетки (геометрическая прогрессия)."""

from .config import settings


def expand_cost(unlocked: int) -> int | None:
    """Сколько стоит открыть следующую клетку при `unlocked` уже открытых.
    None — если открыты все (PLOTS_MAX). Цена = base * ratio^(unlocked - start)."""
    if unlocked >= settings.PLOTS_MAX:
        return None
    steps = max(0, unlocked - settings.PLOTS_START)
    return settings.FIELD_EXPAND_COST_BASE * (settings.FIELD_EXPAND_COST_RATIO ** steps)
