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
    SPAWN_RADIUS_M: int = 2000        # радиус спавна вокруг центра
    MAP_VIEW_RADIUS_M: int = 1500     # радиус видимости семян на карте
    SEED_TTL_MINUTES: int = 30        # время жизни семени на карте
    FIELD_SIZE: int = 6               # поле 6x6 -> 36 клеток

    # Авто-досыпка: если активных семян меньше порога — при чтении карты
    # бэкенд досыпает до целевого числа (на случай, если cron задержался).
    MIN_ACTIVE_SEEDS: int = 12
    REFILL_TO_SEEDS: int = 20


settings = Settings()
