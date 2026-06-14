"""rename users.field_side -> plots_unlocked

Поле стало фиксированным 3×3, а колонка теперь хранит число ОТКРЫТЫХ клеток
(3..9), а не сторону. Старые игроки сохраняют значение как число открытых клеток.

Revision ID: b2c3d4e5f6a7
Revises: a1f2c3d4e5f6
Create Date: 2026-06-14 18:10:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1f2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        do $$ begin
          if exists (select 1 from information_schema.columns where table_name='users' and column_name='field_side')
             and not exists (select 1 from information_schema.columns where table_name='users' and column_name='plots_unlocked')
          then alter table public.users rename column field_side to plots_unlocked;
          end if;
        end $$;
    """)


def downgrade() -> None:
    op.execute("""
        do $$ begin
          if exists (select 1 from information_schema.columns where table_name='users' and column_name='plots_unlocked')
          then alter table public.users rename column plots_unlocked to field_side;
          end if;
        end $$;
    """)
