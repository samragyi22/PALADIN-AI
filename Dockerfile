# =============================================================================
# Enterprise AI Analyst — Unified Dockerfile
# =============================================================================
# Multi-stage build to compile frontend and serve it through FastAPI backend.
# =============================================================================

# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

# Copy package configurations and install dependencies
COPY frontend/package*.json ./
RUN npm install --silent

# Copy frontend source code and compile static assets
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Create Production FastAPI Runner ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies including Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend app source code
COPY backend/app ./app

# Copy the built React assets from Stage 1 into /app/frontend/dist
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Create storage directory for SQLite, ChromaDB, and logs
RUN mkdir -p /data/documents /data/sqlite /data/chroma /data/logs

# Define default environment variables
ENV DATA_DIR=/data
ENV ENV=production
ENV HOST=0.0.0.0
ENV PORT=8000

# Expose server port (8000 for standard Docker, overridden by Hugging Face/Render dynamically)
EXPOSE 8000

# Health check to ensure service starts successfully
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python3 -c "import urllib.request; import os; urllib.request.urlopen('http://localhost:' + os.environ.get('PORT', '8000') + '/health')" || exit 1

# Launch FastAPI using shell form to resolve environment variable PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
