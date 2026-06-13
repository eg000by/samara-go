-- =============================================================================
-- Проверка Шага 1. Выполнять в Supabase SQL Editor ПОСЛЕ schema.sql.
-- =============================================================================

-- 1. PostGIS реально установлен?
select postgis_full_version();

-- 2. Все таблицы на месте?
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
-- ожидаем: events, field_cells, inventory, seeds_on_map, users

-- 3. Положим тестовое семя у Дворцовой площади (центр карты).
insert into public.seeds_on_map (geom, seed_type, rarity, expires_at)
values (
    ST_MakePoint(30.3146, 59.9398)::geography,  -- ВАЖНО: (lon, lat)!
    'wheat', 'common', now() + interval '30 minutes'
);

-- 4. Ключевой геозапрос: какие семена в радиусе 50 м от игрока?
--    Игрок стоит в ~30 м от центра — семя должно найтись.
select
    id,
    seed_type,
    round(ST_Distance(geom, ST_MakePoint(30.3151, 59.9399)::geography)::numeric, 1) as dist_m
from public.seeds_on_map
where collected_by is null
  and ST_DWithin(geom, ST_MakePoint(30.3151, 59.9399)::geography, 50);

-- 5. Уборка теста.
delete from public.seeds_on_map where seed_type = 'wheat' and collected_by is null;
