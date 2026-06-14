"""Настройки приложения. Всё читается из переменных окружения (.env локально,
env vars на Render). Секретов в коде нет."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- БД ---
    DATABASE_URL: str                 # transaction pooler (6543) — рантайм
    DATABASE_URL_DIRECT: str = ""     # direct/session (5432) — для Alembic

    # --- Auth / секреты ---
    # URL проекта Supabase. Из него строим JWKS-эндпоинт для проверки ES256-токенов.
    SUPABASE_URL: str = ""
    CRON_SECRET: str = ""

    # --- CORS ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # --- Игровые константы (Санкт-Петербург, Дворцовая площадь) ---
    CENTER_LAT: float = 59.9398
    CENTER_LON: float = 30.3146
    COLLECT_RADIUS_M: int = 50        # радиус сбора семени
    # Спавн идёт по зонам-районам (см. SPAWN_ZONES в game.py), а не по одному кругу.
    MAP_VIEW_RADIUS_M: int = 1500     # радиус видимости семян на карте
    SEED_TTL_MINUTES: int = 30        # время жизни семени на карте
    FIELD_SIZE: int = 6               # максимум стороны поля (6x6 -> 36 клеток)
    FIELD_START_SIDE: int = 3         # стартовый размер грядки (3x3)
    FIELD_EXPAND_COST_PER_SIDE: int = 50  # цена расширения = текущая_сторона * это

    # Авто-досыпка: если активных семян меньше порога — при чтении карты
    # бэкенд досыпает до целевого числа (на случай, если cron задержался).
    # 7 зон спавна → держим ~5 семян на зону, чтобы каждый район не пустовал.
    MIN_ACTIVE_SEEDS: int = 21
    REFILL_TO_SEEDS: int = 42


settings = Settings()
