# CodeFx

**Live Ops Intelligence for F1 Racing**

CodeFx is a real-time analytics platform for Formula 1 operations, featuring AI-powered pitstop video analysis using YOLO object detection, zone-based timing analysis, performance dashboards, and race strategy tools.

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)
![YOLO](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF)

---

## Features

### 🏎️ Pitstop Analysis
- Upload race footage for AI-powered pitstop analysis
- **Two processing modes:**
  - **Classic Mode**: YOLO-based object detection with bounding boxes
  - **Time-in-Zone Mode**: Zone-based timing analysis with configurable regions
- Real-time processing with progress tracking
- Annotated output video with bounding boxes and zone overlays
- Timing metrics breakdown persisted to database

### 📊 Metrics & Analytics
- **Zone timing metrics**: Track time spent in configurable zones
- **Breakdown summary**: Fuel time, tyre change times, driver in/out times
- **Run history**: View past jobs with full details and metrics
- **REST API**: Read and write metrics programmatically

### 📈 Dashboard
- Race performance overview
- Lap time analytics
- Position tracking

### 🛞 Tyre Strategy
- Compound analysis
- Degradation modeling
- Strategy recommendations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  • Material UI • TypeScript • Vite • Framer Motion • ECharts    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  • Job Management • Video Processing • Storage Abstraction       │
│  • Persistence Layer • Zone Timing Analysis                      │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│   PostgreSQL    │  │   YOLO Model    │  │   File Storage      │
│   (Jobs +       │  │   (Detection +  │  │   (Local/S3)        │
│    Metrics)     │  │    Tracking)    │  │                     │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Docker** (for PostgreSQL)
- **ffmpeg** (for video transcoding)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd codefx-poc
```

### 2. Place YOLO Model Weights

⚠️ **Important**: Place your trained YOLO weights file at:

```
backend/model_weights/best.pt
```

Without this file, pitstop analysis will fail. Contact the team for the weights file.

### 3. Start the Backend

```bash
# Start PostgreSQL
cd backend
docker compose up -d

# Wait for Postgres to be ready
docker compose logs -f postgres
# Look for: "database system is ready to accept connections"

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API is now running at http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### 4. Start the Frontend

```bash
# From project root (in a new terminal)
npm install
npm run dev
```

The app is now running at http://localhost:5173

---

## Project Structure

```
codefx-poc/
├── src/                          # Frontend (React + TypeScript)
│   ├── api/                      # API client functions
│   │   └── pitstopClient.ts      # Job & metrics API calls
│   ├── components/               # Reusable UI components
│   │   ├── pitstop/              # Pitstop-specific components
│   │   │   ├── JobProgress.tsx
│   │   │   ├── MetricsPanel.tsx  # Displays timing metrics
│   │   │   ├── ResultsPanel.tsx
│   │   │   ├── RunDetailsDrawer.tsx  # Job details + metrics tabs
│   │   │   ├── RunHistoryTable.tsx
│   │   │   └── UploadPanel.tsx
│   │   ├── GlassCard.tsx
│   │   ├── SideNav.tsx
│   │   └── TopBar.tsx
│   ├── pages/                    # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── PitstopPage.tsx       # Main pitstop analysis page
│   │   └── TyreStrategyPage.tsx
│   ├── types/                    # TypeScript type definitions
│   │   └── pitstop.ts
│   ├── App.tsx                   # Main app with routing
│   ├── theme.ts                  # Material UI theme
│   └── main.tsx                  # Entry point
│
├── backend/                      # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── api/
│   │   │   └── routes_pitstop.py # API endpoints
│   │   ├── db/
│   │   │   ├── models.py         # SQLAlchemy models (PitstopJob, PitstopBreakdownSummary)
│   │   │   ├── session.py        # Database session
│   │   │   └── migrations/       # Alembic migrations
│   │   ├── model/
│   │   │   ├── pitstop_yolo_runner.py  # Classic YOLO video processor
│   │   │   └── zone_timing/      # Zone-based timing module
│   │   │       ├── time_in_zone.py     # Zone timing processor
│   │   │       ├── zones.py            # Zone configuration loader
│   │   │       └── zones_config.json   # Zone definitions
│   │   ├── schemas/
│   │   │   └── pitstop.py        # Pydantic schemas
│   │   ├── services/
│   │   │   ├── pitstop_service.py       # Business logic
│   │   │   ├── pitstop_persistence.py   # Database operations
│   │   │   └── storage/          # Storage abstraction
│   │   ├── main.py               # FastAPI app
│   │   └── settings.py           # Configuration
│   ├── model_weights/            # YOLO weights (place best.pt here)
│   ├── storage/                  # Local file storage
│   │   ├── input/                # Uploaded videos
│   │   └── output/               # Processed videos
│   ├── scripts/                  # Development/test scripts
│   │   ├── run_local_runner.py   # Test YOLO runner directly
│   │   ├── test_time_in_zone.py  # Test zone timing
│   │   └── test_draw_zones.py    # Visualize zone config
│   ├── docker-compose.yml        # PostgreSQL container
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile
│
├── package.json                  # Node.js dependencies
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

---

## API Reference

### Health Check

```
GET /api/health → {"status": "ok"}
```

### Pitstop Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pitstop/jobs` | Upload video and create job |
| GET | `/api/pitstop/jobs` | List recent jobs (paginated) |
| GET | `/api/pitstop/jobs/{job_id}` | Get job status and details |
| GET | `/api/pitstop/jobs/{job_id}/output` | Stream/download output video |
| DELETE | `/api/pitstop/jobs/{job_id}` | Delete job and files |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pitstop/jobs/{job_id}/metrics` | Get timing metrics for a job |
| POST | `/api/pitstop/jobs/{job_id}/metrics` | Manually set metrics (for testing) |

### Example: Upload and Process Video

```bash
# Upload a video
curl -X POST http://localhost:8000/api/pitstop/jobs \
  -F "file=@/path/to/pitstop_video.mp4" \
  -F "series=F1" \
  -F "race=Monaco GP"

# Response includes job_id
# {"job_id": "550e8400-...", "status": "QUEUED", ...}

# Poll for status
curl http://localhost:8000/api/pitstop/jobs/550e8400-...

# Get metrics after completion
curl http://localhost:8000/api/pitstop/jobs/550e8400-.../metrics

# Manually set metrics (for UI testing)
curl -X POST http://localhost:8000/api/pitstop/jobs/550e8400-.../metrics \
  -H "Content-Type: application/json" \
  -d '{"fuel_time_s": 0.42, "front_left_tyre_time_s": 0.38}'

# Download output when complete
curl -OJ http://localhost:8000/api/pitstop/jobs/550e8400-.../output
```

---

## Processing Modes

CodeFx supports two processing modes, configured via the `PITSTOP_MODE` environment variable:

### Classic Mode (`PITSTOP_MODE=classic`)

Traditional YOLO-based object detection:
- Detects crew members, equipment, and vehicles
- Draws bounding boxes with class labels and confidence
- Multi-object tracking with persistence
- Outputs annotated video

### Time-in-Zone Mode (`PITSTOP_MODE=time_in_zone`)

Zone-based timing analysis:
- Configurable polygon zones (pit entry, pit box, wheel areas, pit exit)
- Tracks objects entering/exiting zones
- Measures time spent in each zone
- Overlay visualization with zone colors and timing stats
- Persists zone summary metrics to database

**Zone Configuration** (`backend/app/model/zone_timing/zones_config.json`):
```json
{
  "zones": [
    {
      "name": "pit_entry",
      "points": [[100, 300], [300, 300], [300, 500], [100, 500]],
      "color": [255, 165, 0]
    },
    {
      "name": "wheel_area_front",
      "points": [[400, 200], [600, 200], [600, 400], [400, 400]],
      "color": [0, 255, 255]
    }
  ]
}
```

---

## Processing Pipeline

The YOLO processing pipeline runs through these stages:

| Stage | Progress | Description |
|-------|----------|-------------|
| UPLOAD | 0-15% | File received and stored |
| DETECTING | 15-40% | YOLO object detection on frames |
| TRACKING | 40-70% | Multi-object tracking |
| RENDERING | 70-90% | Writing annotated frames |
| TRANSCODING | 90-100% | H.264 conversion for web playback |
| COMPLETE | 100% | Output video ready |

**Tech Stack:**
- **Ultralytics YOLOv8** for object detection
- **Supervision** for zone polygon detection and tracking
- **OpenCV** for video processing
- **ffmpeg** for H.264 transcoding
- **ThreadPoolExecutor** for non-blocking inference

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://codefx:codefx@localhost:5432/codefx` | PostgreSQL connection |
| `STORAGE_BACKEND` | `local` | Storage backend (`local` or `s3`) |
| `MAX_FILE_SIZE_MB` | `5120` | Max upload size (5GB) |
| `PITSTOP_MODE` | `time_in_zone` | Processing mode (`classic` or `time_in_zone`) |
| `PITSTOP_YOLO_WEIGHTS_PATH` | `model_weights/best.pt` | Path to YOLO weights |
| `PITSTOP_YOLO_THRESHOLD` | `0.5` | Detection confidence (0.0-1.0) |
| `PITSTOP_ZONES_CONFIG_PATH` | `app/model/zone_timing/zones_config.json` | Zone config for time_in_zone mode |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_PITSTOP_API_BASE` | `http://localhost:8000` | Backend API URL |

---

## Development

### Frontend Development

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Development

```bash
cd backend
source venv/bin/activate

# Start with auto-reload
uvicorn app.main:app --reload --port 8000

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Reset database
docker compose down -v && docker compose up -d && alembic upgrade head
```

### Testing YOLO Runner Directly

```bash
# Classic mode
python backend/scripts/run_local_runner.py \
    --input path/to/video.mp4 \
    --output path/to/output.mp4 \
    --weights backend/model_weights/best.pt \
    --threshold 0.5

# Zone timing mode
python backend/scripts/test_time_in_zone.py
```

### Testing Zone Configuration

```bash
# Visualize zones on a sample frame
python backend/scripts/test_draw_zones.py
```

---

## Database Schema

### pitstop_jobs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| status | ENUM | QUEUED, PROCESSING, COMPLETE, FAILED |
| stage | VARCHAR | UPLOAD, DETECTING, TRACKING, RENDERING, COMPLETE |
| progress | FLOAT | 0.0 to 1.0 |
| mode | VARCHAR | Processing mode (`classic` or `time_in_zone`) |
| series | VARCHAR | Optional metadata |
| race | VARCHAR | Optional metadata |
| notes | TEXT | Optional notes |
| input_path | VARCHAR | Storage key for input file |
| input_filename | VARCHAR | Original filename |
| input_size_bytes | INTEGER | Input file size |
| output_path | VARCHAR | Storage key for output file |
| output_filename | VARCHAR | Output filename |
| output_size_bytes | INTEGER | Output file size |
| error_message | TEXT | Error details if FAILED |
| logs | TEXT | Processing logs |
| created_at | TIMESTAMP | Job creation time |
| updated_at | TIMESTAMP | Last update time |

### pitstop_breakdown_summary

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| job_id | UUID | Foreign key to pitstop_jobs (unique, 1:1) |
| fuel_time_s | FLOAT | Fuel time in seconds |
| front_left_tyre_time_s | FLOAT | FL tyre change time |
| front_right_tyre_time_s | FLOAT | FR tyre change time |
| back_left_tyre_time_s | FLOAT | BL tyre change time |
| back_right_tyre_time_s | FLOAT | BR tyre change time |
| driver_out_time_s | FLOAT | Driver exit time |
| driver_in_time_s | FLOAT | Driver entry time |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

**Relationship**: One PitstopJob has one PitstopBreakdownSummary (1:1, enforced by unique constraint on job_id).

---

## Deployment

### Production Considerations

1. **YOLO Weights**: Move to S3 or model registry
2. **Storage**: Switch to S3 backend for scalability
3. **Database**: Use managed PostgreSQL (RDS, Cloud SQL)
4. **API**: Deploy behind load balancer with HTTPS
5. **Frontend**: Build and serve via CDN

### Docker Deployment

```bash
# Build backend image
cd backend
docker build -t codefx-backend .

# Run with environment variables
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://... \
  -e STORAGE_BACKEND=s3 \
  -e AWS_S3_BUCKET=your-bucket \
  -e PITSTOP_MODE=time_in_zone \
  codefx-backend
```

---

## Troubleshooting

### Video playback issues
- Ensure **ffmpeg** is installed and in PATH
- Check that output video was transcoded to H.264
- Verify browser supports the video format

### YOLO processing fails
- Verify `backend/model_weights/best.pt` exists
- Check Python environment has ultralytics installed
- Review job logs via API or database

### Database connection errors
- Ensure PostgreSQL container is running: `docker compose ps`
- Check `DATABASE_URL` environment variable
- Run `alembic upgrade head` after container restart

### MissingGreenlet / SQLAlchemy async errors
- Ensure all database operations use `await`
- Call `await db.refresh(obj)` after commits to reload attributes
- Don't access lazy-loaded attributes outside async context

### CORS errors
- Backend must be running at http://localhost:8000
- Check `CORS_ORIGINS` in backend settings includes frontend origin
- A 500 error can mask as CORS if response has no headers

### Zone timing not working
- Check `zones_config.json` exists and is valid JSON
- Verify zone coordinates match your video resolution
- Set `PITSTOP_MODE=time_in_zone` in environment

---

## Team

CodeFx - F1 Live Ops Intelligence Platform
