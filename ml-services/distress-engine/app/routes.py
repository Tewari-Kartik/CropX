"""
CropX Distress Engine — API Routes
Exposes the internal endpoint consumed by the Node.js API Gateway.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter

from app.config import MODEL_VERSION, SCORING_MODE
from app.feature_engineering import extract_features
from app.schemas import ContributingFactors, DistressRequest, DistressResponse
from app.scorer import classify_risk_band, ml_scorer, rule_based_score

logger = logging.getLogger("distress-engine.routes")

router = APIRouter()


@router.post(
    "/internal/distress/score",
    response_model=DistressResponse,
    summary="Compute farmer distress risk score",
    description=(
        "Accepts weather, market, and loan data for a single farmer and "
        "returns a 0–100 risk score with per‑feature contributing factors."
    ),
)
async def compute_distress_score(payload: DistressRequest) -> DistressResponse:
    """
    Main scoring endpoint — called by the Node.js backend via
    ``POST /internal/distress/score``.
    """
    start = time.perf_counter()

    # 1️⃣  Feature engineering
    features = extract_features(
        weather=payload.weather,
        market=payload.market,
        loans=payload.loans,
    )

    # 2️⃣  Scoring
    if SCORING_MODE == "ml" and ml_scorer.is_ready:
        risk_score = ml_scorer.predict(features)
        version = f"{MODEL_VERSION}-ml"
    else:
        risk_score = rule_based_score(features)
        version = f"{MODEL_VERSION}-rules"

    risk_band = classify_risk_band(risk_score)

    # 3️⃣  Build contributing factors
    factors = ContributingFactors(
        rainfall_deficit_pct=features.rainfall_deficit_pct,
        drought_streak_days=features.drought_streak_days,
        temp_extreme_days=features.temp_extreme_days,
        humidity_stress_days=features.humidity_stress_days,
        market_price_drop_pct=features.market_price_drop_pct,
        price_volatility=features.price_volatility,
        negative_trend_ratio=features.negative_trend_ratio,
        loan_overdue_days=features.loan_overdue_days,
        total_loan_exposure=features.total_loan_exposure,
        overdue_loan_count=features.overdue_loan_count,
        loan_utilization_ratio=features.loan_utilization_ratio,
    )

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "farmer=%s  score=%.1f  band=%s  mode=%s  latency=%.1fms",
        payload.farmer_id,
        risk_score,
        risk_band,
        SCORING_MODE,
        elapsed_ms,
    )

    return DistressResponse(
        risk_score=risk_score,
        risk_band=risk_band,
        contributing_factors=factors,
        model_version=version,
    )
