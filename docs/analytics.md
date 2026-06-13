# Аналитика — Yandex DataLens (Шаг 5)

Дашборд строится по таблице `events` через **read-only** роль `datalens_ro`
(создаётся в `db/schema.sql`). DataLens — облачный сервис, ходит снаружи, поэтому
подключаемся через **connection pooler Supabase (IPv4)**: прямой хост
`db.*.supabase.co` — IPv6-only и снаружи часто недоступен.

## Подключение в DataLens
DataLens → Подключения → создать **PostgreSQL**:

| Поле | Значение |
|---|---|
| Host | `aws-0-<РЕГИОН>.pooler.supabase.com` |
| Port | `5432` (session pooler) |
| Database | `postgres` |
| Username | `datalens_ro.<PROJECT_REF>` |
| Password | пароль роли `datalens_ro` (из `db/schema.sql`) |
| SSL | включить (require) |

> Username именно в формате `<роль>.<project_ref>` — так пулер Supavisor
> маршрутизирует подключение к нужному проекту.

Проверка доступа (локально): роль видит `events` и не может писать —
любой `insert/update` отклоняется (`InsufficientPrivilege`).

## Датасеты и графики
В DataLens каждый график — это **датасет из SQL-запроса** («SQL-запрос» при
создании датасета), поверх него чарт. Готовые запросы:

### 1. DAU — уникальные игроки по дням
```sql
select date_trunc('day', created_at)::date as d,
       count(distinct user_id) as dau
from events
where user_id is not null
group by 1
order by 1;
```
Чарт: линейный, X = `d`, Y = `dau`.

### 2. Воронка spawn → collect → plant → harvest
```sql
select type, count(*) as n
from events
where type in ('spawn','collect','plant','harvest')
group by type
order by array_position(array['spawn','collect','plant','harvest'], type);
```
Чарт: столбчатый (или «воронка»), X = `type`, Y = `n`.

### 3. Тепловая карта сбора (по координатам)
```sql
select (payload->>'lon')::float8 as lon,
       (payload->>'lat')::float8 as lat
from events
where type = 'collect' and payload ? 'lon';
```
В датасете создай поле-геоточку: `GEOPOINT([lat], [lon])`.
Чарт: «Карта» → слой **Тепловая карта** по геоточке.

### 4. Retention D1 (вернулись на следующий день)
```sql
with first_day as (
    select user_id, min(created_at::date) as d0
    from events where user_id is not null
    group by user_id
),
activity as (
    select distinct user_id, created_at::date as d
    from events where user_id is not null
)
select f.d0 as cohort,
       count(distinct f.user_id) as users,
       count(distinct a.user_id) filter (where a.d = f.d0 + 1) as retained_d1
from first_day f
left join activity a on a.user_id = f.user_id
group by f.d0
order by f.d0;
```
Чарт: таблица или столбчатый; retention% = `retained_d1 / users`.

## Дашборд
Собери 4 чарта на один дашборд (DataLens → Дашборд → добавить чарты).
Добавь селектор периода по `created_at`, если нужно.
