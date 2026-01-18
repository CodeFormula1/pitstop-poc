"""Create pitstop_jobs table

Revision ID: 001
Revises:
Create Date: 2026-01-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type first
    job_status_enum = postgresql.ENUM(
        "QUEUED", "PROCESSING", "COMPLETE", "FAILED",
        name="jobstatus",
        create_type=False,
    )
    job_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "pitstop_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "status",
            postgresql.ENUM("QUEUED", "PROCESSING", "COMPLETE", "FAILED", name="jobstatus", create_type=False),
            nullable=False,
            server_default="QUEUED",
        ),
        sa.Column("stage", sa.String(50), nullable=False, server_default="UPLOAD"),
        sa.Column("progress", sa.Float(), nullable=False, server_default="0.0"),
        # Metadata
        sa.Column("series", sa.String(100), nullable=True),
        sa.Column("race", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        # Input file
        sa.Column("input_path", sa.String(500), nullable=False),
        sa.Column("input_filename", sa.String(255), nullable=False),
        sa.Column("input_size_bytes", sa.BigInteger(), nullable=False),
        # Output file
        sa.Column("output_path", sa.String(500), nullable=True),
        sa.Column("output_filename", sa.String(255), nullable=True),
        sa.Column("output_size_bytes", sa.BigInteger(), nullable=True),
        # Logs
        sa.Column("logs", sa.Text(), nullable=False, server_default=""),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # Create indexes
    op.create_index("ix_pitstop_jobs_status", "pitstop_jobs", ["status"])
    op.create_index("ix_pitstop_jobs_created_at", "pitstop_jobs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_pitstop_jobs_created_at")
    op.drop_index("ix_pitstop_jobs_status")
    op.drop_table("pitstop_jobs")

    # Drop enum type
    job_status_enum = postgresql.ENUM("QUEUED", "PROCESSING", "COMPLETE", "FAILED", name="jobstatus")
    job_status_enum.drop(op.get_bind(), checkfirst=True)
