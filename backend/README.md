# CodeFx Backend API

FastAPI backend for the CodeFx racing analytics platform. Provides video upload, YOLO-based pitstop analysis, and job management.

## Features

- **Video Upload**: Accept video files (mp4, mov, mkv, avi, webm) up to 5GB
- **YOLO Processing**: Real YOLO model inference with bounding box overlays
- **Job Processing**: Full pipeline (DETECTING → TRACKING → RENDERING)
- **Storage Abstraction**: Pluggable storage backend (LocalStorage now, S3 ready)
- **PostgreSQL**: Persistent job metadata with Alembic migrations
- **Real-time Logs**: Processing logs stored and retrievable via API

## Quick Start

### 1. Place YOLO Model Weights

**Important**: Place your trained YOLO weights file at:

```
backend/model_weights/best.pt
```

Without this file, job processing will fail. Contact the team for the weights file or train your own model.

### 2. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

Wait for Postgres to be ready:
```bash
docker compose logs -f postgres
# Look for: "database system is ready to accept connections"
```

### 3. Install ffmpeg (required for video output)

The output video is transcoded to browser-compatible H.264 using ffmpeg.

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH.

Verify installation:
```bash
ffmpeg -version
```

### 4. Set up Python environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Note**: This installs `ultralytics` and `opencv-python` for YOLO inference.

### 5. Run database migrations

```bash
alembic upgrade head
```

### 6. Start the API server

```bash
uvicorn app.main:app --reload --port 8000
```

The API is now running at http://localhost:8000

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/api/health

## API Endpoints

### Health Check

```
GET /api/health
```

Returns `{"status": "ok"}` when the API is running.

### Pitstop Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pitstop/jobs` | Upload video and create job |
| GET | `/api/pitstop/jobs` | List recent jobs (default 20) |
| GET | `/api/pitstop/jobs/{job_id}` | Get job status, logs, output info |
| GET | `/api/pitstop/jobs/{job_id}/output` | Download output video (must be COMPLETE) |
| DELETE | `/api/pitstop/jobs/{job_id}` | Delete job and files |

## Curl Examples

### Upload a video and create a job

```bash
curl -X POST http://localhost:8000/api/pitstop/jobs \
  -F "file=@/path/to/video.mp4" \
  -F "series=F1" \
  -F "race=Monaco GP" \
  -F "notes=Testing pitstop analysis"
```

Response:
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "QUEUED",
  "stage": "UPLOAD",
  "progress": 0.0,
  "series": "F1",
  "race": "Monaco GP",
  "notes": "Testing pitstop analysis",
  "input_filename": "video.mp4",
  "input_size_bytes": 1048576,
  "logs": [
    "[12:34:56] INFO Job created, file uploaded successfully",
    "[12:34:56] INFO Input file: video.mp4 (1,048,576 bytes)"
  ],
  "output": {
    "available": false,
    "filename": null,
    "size_bytes": null
  },
  "created_at": "2026-01-17T12:34:56Z",
  "updated_at": "2026-01-17T12:34:56Z"
}
```

### Poll job status

```bash
# Replace with your actual job_id
curl http://localhost:8000/api/pitstop/jobs/550e8400-e29b-41d4-a716-446655440000
```

Response (while processing):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "stage": "TRACKING",
  "progress": 0.55,
  "logs": [
    "[12:34:56] INFO Job created, file uploaded successfully",
    "[12:34:57] INFO Starting object detection pipeline...",
    "[12:34:58] INFO Loading YOLOv8 model weights...",
    "[12:34:59] INFO Running multi-object tracking (ByteTrack)...",
    "[12:35:00] INFO Tracking wheel gun operators..."
  ],
  "output": {
    "available": false
  }
}
```

Response (when complete):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETE",
  "stage": "COMPLETE",
  "progress": 1.0,
  "output": {
    "available": true,
    "filename": "550e8400-e29b-41d4-a716-446655440000_output.mp4",
    "size_bytes": 1048576
  }
}
```

### Download output video

```bash
# Downloads the annotated output video
curl -OJ http://localhost:8000/api/pitstop/jobs/550e8400-e29b-41d4-a716-446655440000/output
```

If job is not complete, returns 409:
```json
{
  "detail": "Job is not complete. Current status: PROCESSING, stage: TRACKING"
}
```

### List recent jobs

```bash
# Default: 20 most recent jobs
curl "http://localhost:8000/api/pitstop/jobs"

# With pagination
curl "http://localhost:8000/api/pitstop/jobs?limit=10&offset=0"
```

Response:
```json
{
  "jobs": [
    {
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "COMPLETE",
      "stage": "COMPLETE",
      "progress": 1.0,
      "series": "F1",
      "race": "Monaco GP",
      "input_filename": "video.mp4",
      "input_size_bytes": 1048576,
      "has_output": true,
      "created_at": "2026-01-17T12:34:56Z",
      "updated_at": "2026-01-17T12:35:10Z"
    }
  ],
  "total": 1
}
```

### Delete a job

```bash
curl -X DELETE http://localhost:8000/api/pitstop/jobs/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "message": "Job deleted successfully",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## End-to-End Test

Complete local test workflow:

```bash
# 1. Ensure weights are in place
ls backend/model_weights/best.pt

# 2. Start Postgres
cd backend && docker compose up -d && cd ..

# 3. Run migrations
cd backend && alembic upgrade head && cd ..

# 4. Start the API (in a terminal)
cd backend && uvicorn app.main:app --reload --port 8000

# 5. Upload a test video (in another terminal)
curl -X POST http://localhost:8000/api/pitstop/jobs \
  -F "file=@/path/to/test_video.mp4" \
  -F "series=F1" \
  -F "race=Test Race"

# Note the job_id from the response

# 6. Poll for status until COMPLETE
curl http://localhost:8000/api/pitstop/jobs/<job_id>

# 7. Download the output
curl -OJ http://localhost:8000/api/pitstop/jobs/<job_id>/output

# 8. Test Range request support (for browser video playback)
curl -I -H "Range: bytes=0-1000" http://localhost:8000/api/pitstop/jobs/<job_id>/output
# Should return: HTTP/1.1 206 Partial Content
# Headers should include:
#   Content-Range: bytes 0-1000/<total_size>
#   Accept-Ranges: bytes
```

## Storage Abstraction

The backend uses a pluggable storage system designed for easy migration from local filesystem to S3.

### Current: LocalStorage

Files are stored in:
- `storage/input/` - Uploaded videos (named `{job_id}_{original_filename}`)
- `storage/output/` - Processed videos (named `{job_id}_output.mp4`)

### Switching to S3Storage (future)

1. Create `app/services/storage/s3.py` implementing the `Storage` interface
2. Update `app/services/storage/__init__.py` to return `S3Storage`
3. Set environment variables:

```bash
export STORAGE_BACKEND=s3
export AWS_S3_BUCKET=your-bucket-name
export AWS_S3_REGION=us-east-1
export AWS_S3_INPUT_PREFIX=input/
export AWS_S3_OUTPUT_PREFIX=output/
```

### Storage Interface

```python
class Storage(ABC):
    async def save_input(content, original_filename, job_id) -> StoredObject
    async def save_output_from_input(job_id, input_key) -> StoredObject
    def open_output_stream(output_key) -> (Path | BinaryIO, content_type)
    def get_output_path(output_key) -> str
    def file_exists(key, is_input) -> bool
    async def delete_file(key, is_input) -> bool
    def get_file_size(key, is_input) -> int | None
```

## Local Runner Test Script

Test the YOLO runner directly without the API:

```bash
# From the project root
python backend/scripts/run_local_runner.py \
    --input path/to/test_video.mp4 \
    --output path/to/output.mp4 \
    --weights backend/model_weights/best.pt

# With custom confidence threshold
python backend/scripts/run_local_runner.py \
    --input path/to/test_video.mp4 \
    --output path/to/output.mp4 \
    --weights backend/model_weights/best.pt \
    --threshold 0.7
```

## YOLO Model Weights

Place the YOLO weights file at:

```
backend/model_weights/best.pt
```

This file is loaded locally during Pitstop processing. The path is configured via:
- Default: `model_weights/best.pt` (relative to backend directory)
- Override: Set `PITSTOP_YOLO_WEIGHTS_PATH` environment variable

**Git hygiene**: 
- The `.gitkeep` file is committed to preserve the directory structure
- Model weights (`*.pt`, `*.pth`, `*.onnx`) are excluded via `.gitignore`
- Do not commit model weights to the repository

**AWS migration path**:
For production deployment, the weights will be moved to S3 or a model registry. This requires:
1. Update `PITSTOP_YOLO_WEIGHTS_PATH` to point to a local cache path
2. Add S3 download logic at startup (or use EFS/model registry)
3. The runner itself requires no changes—it only needs a local file path

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://codefx:codefx@localhost:5432/codefx` | PostgreSQL connection string |
| `STORAGE_BACKEND` | `local` | Storage backend (`local` or `s3`) |
| `MAX_FILE_SIZE_MB` | `5120` | Maximum file size in MB (default 5GB) |
| `PITSTOP_YOLO_WEIGHTS_PATH` | `model_weights/best.pt` | Path to YOLO weights file |
| `PITSTOP_YOLO_THRESHOLD` | `0.5` | Detection confidence threshold (0.0-1.0) |
| `AWS_S3_BUCKET` | - | S3 bucket name (when using S3) |
| `AWS_S3_REGION` | `us-east-1` | AWS region |
| `AWS_S3_INPUT_PREFIX` | `input/` | S3 key prefix for input files |
| `AWS_S3_OUTPUT_PREFIX` | `output/` | S3 key prefix for output files |

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes_pitstop.py    # API endpoints
│   ├── db/
│   │   ├── models.py            # SQLAlchemy models (PitstopJob)
│   │   ├── session.py           # Database session
│   │   └── migrations/          # Alembic migrations
│   │       └── versions/
│   │           └── 001_create_pitstop_jobs.py
│   ├── model/                   # YOLO model integration
│   │   ├── __init__.py
│   │   └── pitstop_yolo_runner.py  # YOLO video processor
│   ├── schemas/
│   │   └── pitstop.py           # Pydantic schemas
│   ├── services/
│   │   ├── pitstop_service.py   # Business logic + YOLO orchestration
│   │   └── storage/             # Storage abstraction
│   │       ├── __init__.py      # get_storage() factory
│   │       ├── base.py          # Storage interface
│   │       └── local.py         # LocalStorage implementation
│   ├── main.py                  # FastAPI app
│   └── settings.py              # Configuration
├── model_weights/               # YOLO model weights (place best.pt here)
│   └── .gitkeep
├── scripts/
│   └── run_local_runner.py      # CLI tool to test YOLO runner directly
├── storage/
│   ├── input/                   # Uploaded videos
│   └── output/                  # Generated videos
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

## Database Schema

### Table: pitstop_jobs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| status | ENUM | QUEUED, PROCESSING, COMPLETE, FAILED |
| stage | VARCHAR(50) | UPLOAD, DETECTING, TRACKING, RENDERING, COMPLETE |
| progress | FLOAT | 0.0 to 1.0 |
| series | VARCHAR(100) | Optional metadata |
| race | VARCHAR(100) | Optional metadata |
| notes | TEXT | Optional metadata |
| input_path | VARCHAR(500) | Storage key for input file |
| input_filename | VARCHAR(255) | Original filename |
| input_size_bytes | BIGINT | Input file size |
| output_path | VARCHAR(500) | Storage key for output file |
| output_filename | VARCHAR(255) | Output filename |
| output_size_bytes | BIGINT | Output file size |
| logs | TEXT | Processing logs |
| created_at | TIMESTAMP | Job creation time |
| updated_at | TIMESTAMP | Last update time |

## Development

### Create a new migration

```bash
alembic revision --autogenerate -m "description"
```

### Reset database

```bash
docker compose down -v
docker compose up -d
alembic upgrade head
```

### Run with auto-reload

```bash
uvicorn app.main:app --reload --port 8000
```

### Check logs

```bash
# PostgreSQL logs
docker compose logs -f postgres

# API logs (when running with uvicorn)
# Logs appear in the terminal where uvicorn is running
```

## Processing Pipeline

The YOLO processing pipeline runs through these stages:

1. **UPLOAD** (0-15%) - File received and stored
2. **DETECTING** (15-40%) - YOLO object detection running on frames
3. **TRACKING** (40-70%) - Multi-object tracking and frame processing
4. **RENDERING** (70-90%) - Writing annotated frames with OpenCV
5. **TRANSCODING** (90-100%) - Converting to browser-compatible H.264 with ffmpeg
6. **COMPLETE** (100%) - Processing finished, output available

The pipeline uses:
- **Ultralytics YOLOv8** for object detection
- **OpenCV** for video reading and frame annotation
- **ffmpeg** for H.264 transcoding (browser-compatible output)
- **ThreadPoolExecutor** for non-blocking inference

Each stage updates the job progress and appends log entries that can be retrieved via the API.

### Important Notes

- The YOLO model weights (`best.pt`) must be placed in `backend/model_weights/`
- **ffmpeg must be installed** for video output to play in browsers
- Processing runs in a background thread to avoid blocking the API
- Progress callbacks update every 10 frames; logs update every 150 frames
- Output videos are H.264 encoded with faststart for web streaming

## Error Handling

| Status Code | Scenario |
|-------------|----------|
| 400 | Invalid file type, file too large, empty file |
| 404 | Job not found, output file not found |
| 409 | Attempting to download output before job is complete |
| 500 | Internal server error |
