# ---- 1) Frontend build (Vite) ----
FROM node:20-slim AS fe-build
WORKDIR /web

COPY package.json package-lock.json* ./
RUN npm ci

COPY public ./public
COPY src ./src
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./

RUN npm run build


# ---- 2) Backend runtime (GPU) ----
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# System deps (ffmpeg for video processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Backend deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip3 install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy built frontend into a directory the backend can serve
COPY --from=fe-build /web/dist /app/frontend_dist

# Copy model weights (included in backend/model_weights)
# If weights were at repo root instead, uncomment:
# COPY model_weights /app/model_weights

# Create storage directories
RUN mkdir -p /app/backend/storage/input /app/backend/storage/output /app/backend/storage/logs

# Set PYTHONPATH so "from app.xxx" imports resolve correctly
ENV PYTHONPATH=/app/backend

EXPOSE 8000

# Start FastAPI (module path is app.main:app since PYTHONPATH includes /app/backend)
CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

