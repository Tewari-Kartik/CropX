"""
CropX Distress Engine — Application Entry Point
FastAPI application with CORS, health probes, and structured logging.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import HOST, MODEL_VERSION, PORT, SCORING_MODE
from app.routes import router
from app.scorer import ml_scorer

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-30s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("distress-engine")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once at startup: optionally train the ML scorer."""
    logger.info("Distress Engine %s starting (mode=%s) …", MODEL_VERSION, SCORING_MODE)

    if SCORING_MODE == "ml":
        ml_scorer.train()

    logger.info("Distress Engine ready on %s:%s", HOST, PORT)
    yield
    logger.info("Distress Engine shutting down.")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CropX Distress Engine",
    description=(
        "AI‑powered farmer distress risk scorer.  Consumes weather, market, "
        "and loan data to produce a 0–100 risk score with explainable "
        "per‑feature contributing factors."
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
    Returns 200 if the service is ready to accept scoring requests.
    In ``ml`` mode this checks whether the model has been trained.
    """
    if SCORING_MODE == "ml" and not ml_scorer.is_ready:
        return {"status": "not_ready", "reason": "ML model still training"}
    return {"status": "ready", "scoring_mode": SCORING_MODE}


# ── Standalone execution ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
