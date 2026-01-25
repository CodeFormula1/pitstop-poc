"""Create pitstop_breakdown_summary table.

Revision ID: 002
Revises: 001
Create Date: 2026-01-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pitstop_breakdown_summary",
        sa.Column("run_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("fuel_time_s", sa.Float(), nullable=True),
        sa.Column("front_left_tyre_time_s", sa.Float(), nullable=True),
        sa.Column("front_right_tyre_time_s", sa.Float(), nullable=True),
        sa.Column("back_left_tyre_time_s", sa.Float(), nullable=True),
        sa.Column("back_right_tyre_time_s", sa.Float(), nullable=True),
        sa.Column("driver_out_time_s", sa.Float(), nullable=True),
        sa.Column("driver_in_time_s", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("pitstop_breakdown_summary")


