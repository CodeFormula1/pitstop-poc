"""Add mode column to pitstop_jobs and restructure breakdown_summary.

Revision ID: 003
Revises: 002
Create Date: 2026-01-18

Changes:
- Add 'mode' column to pitstop_jobs (default: 'classic')
- Add 'error_message' column to pitstop_jobs
- Restructure pitstop_breakdown_summary:
  - Add new 'id' column as primary key
  - Rename 'run_id' to 'job_id' as foreign key with unique constraint
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add mode column to pitstop_jobs
    op.add_column(
        "pitstop_jobs",
        sa.Column("mode", sa.String(50), nullable=False, server_default="classic"),
    )
    
    # Add error_message column to pitstop_jobs
    op.add_column(
        "pitstop_jobs",
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    
    # Restructure pitstop_breakdown_summary
    # Since this is a development migration, we'll drop and recreate the table
    # In production, you'd want to migrate data properly
    op.drop_table("pitstop_breakdown_summary")
    
    op.create_table(
        "pitstop_breakdown_summary",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pitstop_jobs.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
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
    
    # Create index on job_id for faster lookups
    op.create_index(
        "ix_pitstop_breakdown_summary_job_id",
        "pitstop_breakdown_summary",
        ["job_id"],
    )


def downgrade() -> None:
    # Drop the new table structure
    op.drop_index("ix_pitstop_breakdown_summary_job_id", table_name="pitstop_breakdown_summary")
    op.drop_table("pitstop_breakdown_summary")
    
    # Recreate old table structure
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
    
    # Remove columns from pitstop_jobs
    op.drop_column("pitstop_jobs", "error_message")
    op.drop_column("pitstop_jobs", "mode")


