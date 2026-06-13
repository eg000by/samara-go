"""initial schema

Повторяет db/schema.sql (без read-only роли datalens_ro — это ops-настройка
с секретом, не часть схемы приложения). На уже существующей БД применять через
`alembic stamp head`, а не `upgrade`.

Revision ID: 31ea77f2cc13
Revises:
Create Date: 2026-06-13 16:33:00.716846
"""
from typing import Sequence, Union

from alembic import op

revision: str = "31ea77f2cc13"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("create extension if not exists postgis")
    op.execute("create extension if not exists pgcrypto")

    op.execute("""
        create table if not exists public.users (
            id         uuid primary key references auth.users(id) on delete cascade,
            username   text,
            currency   integer not null default 0 check (currency >= 0),
            created_at timestamptz not null default now()
        )
    """)

    op.execute("""
        create or replace function public.handle_new_user()
        returns trigger language plpgsql security definer set search_path = public as $$
        begin
            insert into public.users (id, username)
            values (new.id, split_part(new.email, '@', 1))
            on conflict (id) do nothing;
            return new;
        end;
        $$
    """)
    op.execute("drop trigger if exists on_auth_user_created on auth.users")
    op.execute("""
        create trigger on_auth_user_created
            after insert on auth.users
            for each row execute function public.handle_new_user()
    """)

    op.execute("""
        create table if not exists public.seeds_on_map (
            id           bigint generated always as identity primary key,
            geom         geography(Point, 4326) not null,
            seed_type    text not null,
            rarity       text not null,
            spawned_at   timestamptz not null default now(),
            expires_at   timestamptz not null,
            collected_by uuid references public.users(id) on delete set null,
            collected_at timestamptz
        )
    """)
    op.execute("create index if not exists idx_seeds_geom on public.seeds_on_map using gist (geom)")
    op.execute("""
        create index if not exists idx_seeds_active
            on public.seeds_on_map (expires_at) where collected_by is null
    """)

    op.execute("""
        create table if not exists public.inventory (
            user_id   uuid not null references public.users(id) on delete cascade,
            seed_type text not null,
            qty       integer not null default 0 check (qty >= 0),
            primary key (user_id, seed_type)
        )
    """)

    op.execute("""
        create table if not exists public.field_cells (
            user_id           uuid not null references public.users(id) on delete cascade,
            cell_index        smallint not null check (cell_index between 0 and 35),
            planted_seed_type text,
            planted_at        timestamptz,
            harvested_at      timestamptz,
            primary key (user_id, cell_index)
        )
    """)

    op.execute("""
        create table if not exists public.events (
            id         bigint generated always as identity primary key,
            user_id    uuid references public.users(id) on delete set null,
            type       text not null,
            payload    jsonb not null default '{}'::jsonb,
            created_at timestamptz not null default now()
        )
    """)
    op.execute("create index if not exists idx_events_created on public.events (created_at)")
    op.execute("create index if not exists idx_events_type on public.events (type)")
    op.execute("create index if not exists idx_events_user_time on public.events (user_id, created_at)")


def downgrade() -> None:
    op.execute("drop trigger if exists on_auth_user_created on auth.users")
    op.execute("drop function if exists public.handle_new_user()")
    op.execute("drop table if exists public.events")
    op.execute("drop table if exists public.field_cells")
    op.execute("drop table if exists public.inventory")
    op.execute("drop table if exists public.seeds_on_map")
    op.execute("drop table if exists public.users")
    # extensions намеренно не трогаем
