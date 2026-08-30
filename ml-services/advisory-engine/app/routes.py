"""
CropX Advisory Engine — API Routes
Exposes the internal endpoint consumed by the Node.js API Gateway.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import MODEL_VERSION
from app.rule_engine import generate_advisory
from app.schemas import AdvisoryRequest, AdvisoryResponse
from app.text_generator import render_advisory

logger = logging.getLogger("advisory-engine.routes")

router = APIRouter()


@router.post(
    "/internal/advisory/generate",
    response_model=AdvisoryResponse,
    summary="Generate personalised crop advisory",
    description=(
        "Accepts farmer profile, crop details, weather observations, and "
        "market data. Returns a personalised, language-aware advisory with "
        "actionable farming recommendations."
    ),
)
async def generate_advisory_endpoint(payload: AdvisoryRequest) -> AdvisoryResponse:
    """
    Main advisory endpoint — called by the Node.js backend via
    ``POST /internal/advisory/generate``.
    """
    start = time.perf_counter()

    # 1️⃣  Run rule engine
    result = generate_advisory(payload)

    # 2️⃣  Render advisory text in the requested language
    advisory_text = render_advisory(
        fragments=result.fragments,
        lang=payload.lang,
        crop_name=payload.crop.crop_name,
    )

    # 3️⃣  Build response
    advisory_id = str(uuid.uuid4())
    generated_at = datetime.now(timezone.utc).isoformat()
    sources = sorted(result.sources)

    elapsed_ms = (time.perf_counter() - start) * 1000
    farmer_name = payload.farmer.full_name or payload.farmer.farmer_id or "unknown"
    logger.info(
        "farmer=%s  crop=%s  lang=%s  fragments=%d  sources=%s  latency=%.1fms",
        farmer_name,
        payload.crop.crop_name,
        payload.lang,
        len(result.fragments),
        sources,
        elapsed_ms,
    )

    return AdvisoryResponse(
        advisory_id=advisory_id,
        advisory_text=advisory_text,
        language=payload.lang,
        audio_url="",
        generated_at=generated_at,
        sources=sources,
        model_version=MODEL_VERSION,
    )
