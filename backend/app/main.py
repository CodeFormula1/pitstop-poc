from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes_pitstop import router as pitstop_router
from app.settings import API_PREFIX, CORS_ORIGINS


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("🏎️  CodeFx API starting up...")
    yield
    # Shutdown
    print("🏁 CodeFx API shutting down...")


app = FastAPI(
    title="CodeFx API",
    description="Backend API for CodeFx racing analytics platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pitstop_router, prefix=API_PREFIX)


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint (available at both /health and /api/health)."""
    return {"status": "ok", "service": "codefx-api"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "CodeFx API",
        "docs": "/docs",
        "health": "/api/health",
    }


# Serve frontend static files (Vite build) - must be last to not override API routes
app.mount("/", StaticFiles(directory="/app/frontend_dist", html=True), name="frontend")

