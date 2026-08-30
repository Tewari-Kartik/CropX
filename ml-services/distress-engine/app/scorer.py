"""
CropX Distress Engine — Scoring Models
Two scoring strategies:
  1. Rule‑Based Scorer  — weighted‑sum formula; deterministic & explainable.
  2. ML Scorer          — XGBoost trained on synthetic data at startup.
Both consume a ``FeatureVector`` and return (risk_score, risk_band).
"""

from __future__ import annotations

import logging
import random
from typing import Optional, Tuple

import numpy as np

from app.config import (
    CRITICAL_THRESHOLD,
    HIGH_THRESHOLD,
    MEDIUM_THRESHOLD,
    SYNTHETIC_SAMPLES,
    WEIGHT_DROUGHT_STREAK,
    WEIGHT_HUMIDITY_STRESS,
    WEIGHT_LOAN_EXPOSURE,
    WEIGHT_LOAN_OVERDUE,
    WEIGHT_LOAN_UTILIZATION,
    WEIGHT_MARKET_PRICE_DROP,
    WEIGHT_NEGATIVE_TREND,
    WEIGHT_OVERDUE_COUNT,
    WEIGHT_PRICE_VOLATILITY,
    WEIGHT_RAINFALL_DEFICIT,
    WEIGHT_TEMP_EXTREME,
)
from app.feature_engineering import FeatureVector

logger = logging.getLogger("distress-engine.scorer")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def classify_risk_band(score: float) -> str:
    """Map a 0–100 score to a risk band label."""
    if score >= CRITICAL_THRESHOLD:
        return "critical"
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


# ─── Rule‑Based Scorer ───────────────────────────────────────────────────────

def _normalize(value: float, max_expected: float) -> float:
    """Normalize a raw value to 0–100 scale relative to an expected max."""
    if max_expected <= 0:
        return 0.0
    return _clamp(value / max_expected * 100.0)


def rule_based_score(fv: FeatureVector) -> float:
    """
    Compute distress risk using a weighted linear combination.
    Each raw feature is first normalized to a 0–100 scale, then multiplied
    by its weight.  The final score is clamped to [0, 100].
    """
    components = [
        WEIGHT_RAINFALL_DEFICIT   * _normalize(fv.rainfall_deficit_pct, 100.0),
        WEIGHT_DROUGHT_STREAK     * _normalize(fv.drought_streak_days, 60),
        WEIGHT_TEMP_EXTREME       * _normalize(fv.temp_extreme_days, 30),
        WEIGHT_HUMIDITY_STRESS    * _normalize(fv.humidity_stress_days, 30),
        WEIGHT_MARKET_PRICE_DROP  * _normalize(fv.market_price_drop_pct, 80.0),
        WEIGHT_PRICE_VOLATILITY   * _normalize(fv.price_volatility, 1.0),
        WEIGHT_NEGATIVE_TREND     * _normalize(fv.negative_trend_ratio, 1.0),
        WEIGHT_LOAN_OVERDUE       * _normalize(fv.loan_overdue_days, 180),
        WEIGHT_LOAN_EXPOSURE      * _normalize(fv.total_loan_exposure, 500_000),
        WEIGHT_OVERDUE_COUNT      * _normalize(fv.overdue_loan_count, 5),
        WEIGHT_LOAN_UTILIZATION   * _normalize(fv.loan_utilization_ratio, 1.0),
    ]

    raw = sum(components)
    return round(_clamp(raw), 1)


# ─── ML Scorer (XGBoost) ─────────────────────────────────────────────────────

class MLScorer:
    """
    XGBoost‑based scorer trained on synthetic farmer scenarios.
    Falls back to rule‑based scoring if training fails.
    """

    def __init__(self) -> None:
        self.model: Optional[object] = None
        self._ready = False

    @property
    def is_ready(self) -> bool:
        return self._ready

    def train(self) -> None:
        """Generate synthetic data and train an XGBoost regressor."""
        try:
            from xgboost import XGBRegressor  # noqa: delayed import

            logger.info(
                "Training ML scorer on %d synthetic samples …", SYNTHETIC_SAMPLES
            )
            X, y = self._generate_synthetic_data(SYNTHETIC_SAMPLES)
            self.model = XGBRegressor(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                random_state=42,
                verbosity=0,
            )
            self.model.fit(X, y)
            self._ready = True
            logger.info("ML scorer trained successfully.")
        except Exception as exc:
            logger.warning("ML scorer training failed: %s — will use rule‑based.", exc)
            self._ready = False

    def predict(self, fv: FeatureVector) -> float:
        """Return a risk score 0–100 using the trained model."""
        if not self._ready or self.model is None:
            return rule_based_score(fv)

        arr = np.array([fv.to_array()])
        pred = float(self.model.predict(arr)[0])
        return round(_clamp(pred), 1)

    # ── Synthetic data generator ──────────────────────────────────────────

    @staticmethod
    def _generate_synthetic_data(
        n: int,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create labelled training data by generating random feature vectors
        and scoring them with the rule‑based formula (which we treat as
        ground truth for the hackathon).
        """
        rng = random.Random(42)
        rows = []
        targets = []

        for _ in range(n):
            fv = FeatureVector(
                rainfall_deficit_pct=rng.uniform(0, 100),
                drought_streak_days=rng.randint(0, 60),
                avg_temperature_c=rng.uniform(10, 48),
                temp_extreme_days=rng.randint(0, 30),
                humidity_stress_days=rng.randint(0, 30),
                market_price_drop_pct=rng.uniform(0, 80),
                price_volatility=rng.uniform(0, 1),
                negative_trend_ratio=rng.uniform(0, 1),
                loan_overdue_days=rng.randint(0, 180),
                total_loan_exposure=rng.uniform(0, 500_000),
                overdue_loan_count=rng.randint(0, 5),
                loan_utilization_ratio=rng.uniform(0, 1),
            )
            rows.append(fv.to_array())
            targets.append(rule_based_score(fv))

        return np.array(rows), np.array(targets)


# ── Module‑level singleton ────────────────────────────────────────────────────
ml_scorer = MLScorer()
