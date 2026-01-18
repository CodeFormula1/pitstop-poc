from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import BigInteger, DateTime, Enum, Float, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


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
