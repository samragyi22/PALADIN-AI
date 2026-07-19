# =============================================================================
# Enterprise AI Analyst — Backend Dockerfile
# =============================================================================
# Multi-stage build for a lean production image.
# =============================================================================

FROM python:3.11-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies first (Docker layer cache friendly)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY backend/app ./app

# Create data directories
RUN mkdir -p /data/documents /data/sqlite /data/chroma /data/logs

# Expose backend port
EXPOSE 8000

# Environment defaults (override via docker-compose or -e flags)
ENV DATA_DIR=/data
ENV ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Launch FastAPI with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
