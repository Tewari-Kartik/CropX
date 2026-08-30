"""
CropX Distress Engine — Configuration
All tuneable parameters in one place, overridable via environment variables.
"""

import os


# ── Server ────────────────────────────────────────────────────────────────────
PORT: int = int(os.getenv("PORT", "8002"))
HOST: str = os.getenv("HOST", "0.0.0.0")

# ── Model metadata ────────────────────────────────────────────────────────────
MODEL_VERSION: str = os.getenv("MODEL_VERSION", "distress-v1.0.0")
SCORING_MODE: str = os.getenv("SCORING_MODE", "rule_based")  # "rule_based" | "ml"

# ── Feature‑engineering defaults ──────────────────────────────────────────────
# Regional average rainfall (mm) over 90 days — used when no historical
# baseline is available.  Roughly matches Indian kharif‑season average.
REGIONAL_AVG_RAINFALL_90D_MM: float = float(
    os.getenv("REGIONAL_AVG_RAINFALL_90D_MM", "450.0")
)

# ── Rule‑based scorer weights (must sum to 1.0) ──────────────────────────────
WEIGHT_RAINFALL_DEFICIT: float = 0.20
WEIGHT_DROUGHT_STREAK: float = 0.10
WEIGHT_TEMP_EXTREME: float = 0.05
WEIGHT_HUMIDITY_STRESS: float = 0.05
WEIGHT_MARKET_PRICE_DROP: float = 0.15
WEIGHT_PRICE_VOLATILITY: float = 0.05
WEIGHT_NEGATIVE_TREND: float = 0.05
WEIGHT_LOAN_OVERDUE: float = 0.20
WEIGHT_LOAN_EXPOSURE: float = 0.05
WEIGHT_OVERDUE_COUNT: float = 0.05
WEIGHT_LOAN_UTILIZATION: float = 0.05

# ── Risk‑band thresholds ─────────────────────────────────────────────────────
CRITICAL_THRESHOLD: float = 80.0
HIGH_THRESHOLD: float = 60.0
MEDIUM_THRESHOLD: float = 40.0

# ── ML scorer ─────────────────────────────────────────────────────────────────
SYNTHETIC_SAMPLES: int = int(os.getenv("SYNTHETIC_SAMPLES", "500"))
