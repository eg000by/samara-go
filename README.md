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
- [~] Шаг 2 — Бэкенд: FastAPI (`backend/`) — код готов и проверен; осталось задеплоить на Render
  - [x] 2.1 каркас, подключение к БД, `/health`
  - [x] 2.2 авторизация (Supabase JWT, ES256/JWKS), `/me`
  - [x] 2.3 игровые роуты (карта, сбор, инвентарь, поле, посадка, урожай)
  - [x] 2.4 `/cron/spawn` (спавн семян, защита секретом)
  - [x] 2.5 Alembic (миграции, `alembic check` чистый)
  - [ ] 2.6 деплой на Render
- [ ] Шаг 3 — Фронтенд: Vite + Firebase Hosting
- [ ] Шаг 4 — Keep-alive + cron спавна
- [ ] Шаг 5 — Аналитика: DataLens

## Документация
- [Игровой дизайн и параметры](docs/game-design.md)
- [Схема БД](db/schema.sql) · [проверка](db/verify.sql)
