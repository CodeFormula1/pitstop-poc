from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import BigInteger, DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from typing import Optional as OptionalType


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


class ProcessingMode(str, enum.Enum):
    """Processing mode for pitstop analysis."""
    CLASSIC = "classic"
    TIME_IN_ZONE = "time_in_zone"


class PitstopJob(Base):
    __tablename__ = "pitstop_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus),
        default=JobStatus.QUEUED,
        nullable=False,
    )
    stage: Mapped[str] = mapped_column(
        String(50),
        default="UPLOAD",
        nullable=False,
    )
    progress: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    
    # Processing mode
    mode: Mapped[str] = mapped_column(
        String(50),
        default="classic",
        nullable=False,
    )

    # Metadata
    series: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    race: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Input file
    input_path: Mapped[str] = mapped_column(String(500), nullable=False)
    input_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    input_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Output file (populated on completion)
    output_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    output_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    output_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    
    # Error message (populated on failure)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Logs stored in DB for simplicity
    logs: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    
    # Relationship to breakdown summary (1:1)
    breakdown_summary: Mapped[Optional["PitstopBreakdownSummary"]] = relationship(
        "PitstopBreakdownSummary",
        back_populates="job",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def append_log(self, line: str) -> None:
        """Append a log line with timestamp."""
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        new_line = f"[{timestamp}] {line}\n"
        self.logs = (self.logs or "") + new_line

    def get_logs_tail(self, lines: int = 200) -> List[str]:
        """Get the last N log lines."""
        if not self.logs:
            return []
        all_lines = self.logs.strip().split("\n")
        return all_lines[-lines:]


class PitstopBreakdownSummary(Base):
    """Timing metrics breakdown for a completed pitstop analysis run.
    
    Has a 1:1 relationship with PitstopJob via job_id (unique constraint).
    """
    
    __tablename__ = "pitstop_breakdown_summary"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Foreign key to pitstop_jobs (unique enforces 1:1)
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pitstop_jobs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    
    # Timing metrics (all in seconds, nullable for runs without metrics)
    fuel_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    front_left_tyre_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    front_right_tyre_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    back_left_tyre_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    back_right_tyre_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    driver_out_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    driver_in_time_s: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    
    # Relationship back to job
    job: Mapped["PitstopJob"] = relationship(
        "PitstopJob",
        back_populates="breakdown_summary",
    )
