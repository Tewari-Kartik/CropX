"""
CropX Advisory Engine — Application Entry Point
FastAPI application with CORS, health probes, and structured logging.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import HOST, MODEL_VERSION, PORT
from app.routes import router

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-30s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("advisory-engine")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once at startup: log readiness."""
    logger.info("Advisory Engine %s starting …", MODEL_VERSION)
    logger.info("Advisory Engine ready on %s:%s", HOST, PORT)
    yield
    logger.info("Advisory Engine shutting down.")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CropX Advisory Engine",
    description=(
        "AI‑powered personalised crop advisory generator.  Analyses weather, "
        "crop growth stage, market trends, and irrigation data to produce "
        "actionable farming recommendations in multiple languages."
    ),
    version=MODEL_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Node.js backend (and dev tools) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(router)


# ── Health & readiness probes ─────────────────────────────────────────────────
@app.get("/health", tags=["ops"], summary="Liveness probe")
async def health():
    """Returns 200 if the service is alive."""
    return {"status": "ok", "version": MODEL_VERSION}


@app.get("/ready", tags=["ops"], summary="Readiness probe")
async def ready():
    """
    Returns 200 if the service is ready to accept advisory requests.
    The rule-based engine is always ready (no model training needed).
    """
    return {"status": "ready", "engine": "rule_based"}


# ── Standalone execution ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
