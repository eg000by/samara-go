-- =============================================================================
-- Samara-Go — схема БД (Шаг 1)
-- Выполнять в Supabase → SQL Editor.
-- Идемпотентно: можно гонять повторно (IF NOT EXISTS / CREATE OR REPLACE).
-- =============================================================================

-- 1. Расширения -------------------------------------------------------------
create extension if not exists postgis;     -- геометрия/география, ST_DWithin
create extension if not exists pgcrypto;     -- gen_random_uuid()

-- =============================================================================
-- 2. users — профиль игрока.
--    id совпадает с Supabase Auth (auth.users.id). Запись создаётся
--    автоматически триггером при регистрации (см. ниже).
-- =============================================================================
create table if not exists public.users (
    id         uuid primary key references auth.users(id) on delete cascade,
    username   text,
    currency   integer not null default 0 check (currency >= 0),
    field_side smallint not null default 3,  -- сторона открытой грядки (3..6), растёт за монеты
    created_at timestamptz not null default now()
);

-- Авто-создание профиля при регистрации в Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.users (id, username)
    values (new.id, split_part(new.email, '@', 1))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =============================================================================
-- 3. seeds_on_map — семена, лежащие на карте города.
--    geom — geography(Point,4326): метры «из коробки» в ST_DWithin.
-- =============================================================================
create table if not exists public.seeds_on_map (
    id           bigint generated always as identity primary key,
    geom         geography(Point, 4326) not null,
    seed_type    text not null,
    rarity       text not null,
    spawned_at   timestamptz not null default now(),
    expires_at   timestamptz not null,
    collected_by uuid references public.users(id) on delete set null,
    collected_at timestamptz
);

-- GIST по geom — обязателен, иначе ST_DWithin делает seq scan.
create index if not exists idx_seeds_geom on public.seeds_on_map using gist (geom);

-- Частичный индекс: «активные» семена = не собраны и не протухли.
-- Именно по ним идёт запрос карты, поэтому держим его узким и быстрым.
create index if not exists idx_seeds_active
    on public.seeds_on_map (expires_at)
    where collected_by is null;

-- =============================================================================
-- 4. inventory — собранные семена (ещё не посаженные).
--    Композитный ключ (user_id, seed_type): по строке на тип.
-- =============================================================================
create table if not exists public.inventory (
    user_id   uuid not null references public.users(id) on delete cascade,
    seed_type text not null,
    qty       integer not null default 0 check (qty >= 0),
    primary key (user_id, seed_type)
);

-- =============================================================================
-- 5. field_cells — клетки поля 6x6 (cell_index 0..35).
--    Стадию роста НЕ храним — вычисляем из planted_at при чтении.
-- =============================================================================
create table if not exists public.field_cells (
    user_id           uuid not null references public.users(id) on delete cascade,
    cell_index        smallint not null check (cell_index between 0 and 35),
    planted_seed_type text,
    planted_at        timestamptz,
    harvested_at      timestamptz,
    primary key (user_id, cell_index)
);

-- =============================================================================
-- 6. events — лог всех значимых действий. Сердце аналитики.
--    user_id nullable: у системных событий (spawn от cron) игрока нет.
-- =============================================================================
create table if not exists public.events (
    id         bigint generated always as identity primary key,
    user_id    uuid references public.users(id) on delete set null,
    type       text not null,
    payload    jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Индексы под типовые аналитические выборки (период, тип, игрок).
create index if not exists idx_events_created  on public.events (created_at);
create index if not exists idx_events_type      on public.events (type);
create index if not exists idx_events_user_time on public.events (user_id, created_at);

-- =============================================================================
-- 7. Read-only роль для DataLens (Шаг 5).
--    Логинимся аналитикой под ней — она физически не может ничего изменить.
--    !!! Замени 'СМЕНИ_МЕНЯ' на свой пароль перед запуском.
-- =============================================================================
do $$
begin
    if not exists (select from pg_roles where rolname = 'datalens_ro') then
        create role datalens_ro login password 'СМЕНИ_МЕНЯ';
    end if;
end
$$;

grant connect on database postgres to datalens_ro;
grant usage on schema public to datalens_ro;
grant select on all tables in schema public to datalens_ro;
alter default privileges in schema public grant select on tables to datalens_ro;
