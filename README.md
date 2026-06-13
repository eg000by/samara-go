# Piter-Go 🌉

> Папка репозитория — `samara-go` (историческое имя); игра переехала в Санкт-Петербург.

Location-based игра-ферма по Санкт-Петербургу: семена спавнятся на карте города, игрок
собирает их рядом со своей геопозицией, сажает на поле 6×6 и собирает урожай.
Каждое действие логируется для аналитики.

**Портфолио-проект**, показывающий три слоя навыков:
- **Frontend:** React + TypeScript (Vite), react-leaflet, Redux Toolkit, Recharts
- **Backend:** FastAPI, SQLAlchemy + Alembic, Pydantic
- **Analytics:** PostgreSQL + PostGIS, SQL, BI-дашборд (Yandex DataLens)

Весь хостинг бесплатный: Firebase Hosting + Render + Supabase + DataLens Community.

## Статус сборки
- [x] Шаг 1 — База: Supabase + PostGIS + схема (`db/`)
- [x] Шаг 2 — Бэкенд: FastAPI (`backend/`) на Render → **https://piter-go-api.onrender.com**
  - 2.1 каркас + `/health` · 2.2 авторизация (Supabase JWT ES256/JWKS) · 2.3 игровые роуты
  - 2.4 `/cron/spawn` · 2.5 Alembic (`alembic check` чистый) · 2.6 деплой (`render.yaml`)
- [x] Шаг 3 — Фронтенд: Vite + Firebase Hosting (`frontend/`)
  - авторизация Supabase · карта (react-leaflet/OSM) + сбор · поле 6×6 посадка/урожай
  - Recharts-дашборд (`/stats`) · самовосстанавливающийся спавн на `/map`
- [x] Шаг 4 — Keep-alive + cron спавна (GitHub Actions, `.github/workflows/`)
- [~] Шаг 5 — Аналитика: DataLens — read-only роль готова, SQL и инструкция в [docs/analytics.md](docs/analytics.md)

## Документация
- [Игровой дизайн и параметры](docs/game-design.md)
- [Схема БД](db/schema.sql) · [проверка](db/verify.sql)
