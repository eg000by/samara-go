"""Общие фикстуры. Интеграционные тесты ходят в реальный Supabase
(нужен SUPABASE_ANON_KEY и выключенный «Confirm email»)."""

import os
import pathlib
import time

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import text

# Подтягиваем backend/.env в окружение (для SUPABASE_ANON_KEY, который не входит в Settings).
_ENV = pathlib.Path(__file__).resolve().parents[1] / ".env"
if _ENV.exists():
    for line in _ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from app.config import settings  # noqa: E402  (после загрузки .env)
from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402

ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Помечаем тесты, которым нужен живой Supabase — в CI без ключей они скипнутся.
needs_supabase = pytest.mark.skipif(
    not (ANON_KEY and SERVICE_KEY), reason="нет SUPABASE_ANON_KEY/SERVICE_KEY"
)


@pytest_asyncio.fixture
async def client():
    """HTTP-клиент к приложению напрямую (ASGI, без uvicorn)."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def test_user():
    """Создаёт через admin API подтверждённого пользователя, отдаёт токен,
    потом удаляет его (надёжнее signup — не зависит от настройки Confirm email)."""
    email = f"pytest-{time.time_ns()}@example.com"
    password = "Test123456!"
    svc_headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as h:
        cr = await h.post("/auth/v1/admin/users", headers=svc_headers,
                          json={"email": email, "password": password, "email_confirm": True})
        uid = cr.json()["id"]
        r = await h.post("/auth/v1/token", params={"grant_type": "password"},
                         headers={"apikey": ANON_KEY},
                         json={"email": email, "password": password})
        token = r.json()["access_token"]

    yield {"id": uid, "token": token, "headers": {"Authorization": f"Bearer {token}"}}

    # чистим события, затем удаляем пользователя целиком (каскадит профиль/инвентарь/поле)
    async with engine.begin() as c:
        await c.execute(text("delete from events where user_id = :u"), {"u": uid})
    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as h:
        await h.delete(f"/auth/v1/admin/users/{uid}", headers=svc_headers)
