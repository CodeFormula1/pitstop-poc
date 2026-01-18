import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
INPUT_DIR = STORAGE_DIR / "input"
OUTPUT_DIR = STORAGE_DIR / "output"
LOGS_DIR = STORAGE_DIR / "logs"

# Model weights directory
MODEL_WEIGHTS_DIR = BASE_DIR / "model_weights"

# Ensure directories exist
INPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

# YOLO model configuration
PITSTOP_YOLO_WEIGHTS_PATH = os.getenv(
    "PITSTOP_YOLO_WEIGHTS_PATH",
    str(MODEL_WEIGHTS_DIR / "best.pt")
)
PITSTOP_YOLO_THRESHOLD = float(os.getenv("PITSTOP_YOLO_THRESHOLD", "0.5"))

# Database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://codefx:codefx@localhost:5433/codefx"
)

# CORS origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# API settings
API_PREFIX = "/api"

# Storage configuration
# Set STORAGE_BACKEND=s3 to use S3 storage (requires additional S3 config)
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")

# File upload limits
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "5120")) * 1024 * 1024  # Default 5GB

# AWS S3 configuration (for future use)
# These will be used when STORAGE_BACKEND=s3
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "")
AWS_S3_REGION = os.getenv("AWS_S3_REGION", "us-east-1")
AWS_S3_INPUT_PREFIX = os.getenv("AWS_S3_INPUT_PREFIX", "input/")
AWS_S3_OUTPUT_PREFIX = os.getenv("AWS_S3_OUTPUT_PREFIX", "output/")

