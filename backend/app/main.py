from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.config import settings
import os

app = FastAPI(
    title="Enterprise AI Analyst API",
    description="Backend services for hybrid document RAG, SQL generation, and automated analytics.",
    version="1.0.0"
)

# Configure CORS
# ALLOWED_ORIGINS env var: comma-separated list of allowed origins.
# e.g. "https://enterprise-ai-analyst.onrender.com"
# Defaults to "*" for local development only.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
if _raw_origins == "*":
    _allowed_origins = ["*"]
else:
    _allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi import Request

from app.api.auth import router as auth_router

@app.middleware("http")
async def csrf_validation_middleware(request: Request, call_next):
    """
    CSRF Double Submit Cookie Middleware.
    For state-changing requests (POST, PUT, DELETE, PATCH), if a csrf_token cookie is present,
    validates that X-CSRF-Token header matches csrf_token cookie.
    Excludes public auth endpoints (/api/auth/login, /api/auth/signup).
    """
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        path = request.url.path
        if not path.startswith("/api/auth/login") and not path.startswith("/api/auth/signup"):
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            if csrf_cookie and (not csrf_header or csrf_header != csrf_cookie):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF validation failed: X-CSRF-Token header does not match csrf_token cookie."}
                )
    return await call_next(request)

# Include API routes
app.include_router(auth_router)
app.include_router(api_router)

# Check if front-end production build folder exists and serve it
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Resolve the frontend dist path
# Docker structure:  /app/app/main.py  →  /app/frontend/dist  (2 levels up)
# Local structure:   .../backend/app/main.py  →  .../frontend/dist  (3 levels up)
_two_up   = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend/dist"))
_three_up = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend/dist"))
# Prefer Docker path (/app/frontend/dist); fall back to local path
frontend_dist_path = _two_up if os.path.exists(_two_up) else _three_up

if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
else:
    @app.get("/")
    def read_root():
        return {
            "app": "Enterprise AI Analyst Backend",
            "status": "online",
            "docs_url": "/docs"
        }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "env": settings.ENV,
        "llm_provider": settings.LLM_PROVIDER
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=(settings.ENV == "development")
    )
