"""add users.field_side (расширяемая грядка)

Сторона открытой грядки игрока (3..FIELD_SIZE). Растёт за монеты через
POST /field/expand. Существующим игрокам ставим стартовые 3×3.

Revision ID: a1f2c3d4e5f6
Revises: 31ea77f2cc13
Create Date: 2026-06-14 15:40:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1f2c3d4e5f6"
down_revision: Union[str, None] = "31ea77f2cc13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("alter table public.users add column if not exists field_side smallint not null default 3")


def downgrade() -> None:
    op.execute("alter table public.users drop column if exists field_side")
