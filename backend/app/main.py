"""Точка входа FastAPI. Запуск: uvicorn app.main:app"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import cron, game, health, me

app = FastAPI(title="Piter-Go API", version="0.1.0")

# CORS: пускаем только домен фронтенда (локально Vite, на проде — Firebase).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(me.router)
app.include_router(game.router)
app.include_router(cron.router)


@app.get("/")
async def root() -> dict:
    return {"service": "piter-go", "docs": "/docs"}
