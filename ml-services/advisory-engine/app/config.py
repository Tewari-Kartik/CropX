"""
CropX Advisory Engine — Configuration
All tuneable parameters in one place, overridable via environment variables.
"""

import os


# ── Server ────────────────────────────────────────────────────────────────────
PORT: int = int(os.getenv("PORT", "8001"))
HOST: str = os.getenv("HOST", "0.0.0.0")

# ── Model metadata ────────────────────────────────────────────────────────────
MODEL_VERSION: str = os.getenv("MODEL_VERSION", "advisory-v1.0.0")

# ── Weather thresholds ────────────────────────────────────────────────────────
# Rainfall ≥ this value (mm) within upcoming records → skip irrigation
RAIN_THRESHOLD_MM: float = float(os.getenv("RAIN_THRESHOLD_MM", "5.0"))

# Temperature ≥ this value (°C) → heat stress advisory
HEAT_STRESS_THRESHOLD_C: float = float(os.getenv("HEAT_STRESS_THRESHOLD_C", "38.0"))

# Temperature ≤ this value (°C) → frost risk advisory
FROST_RISK_THRESHOLD_C: float = float(os.getenv("FROST_RISK_THRESHOLD_C", "4.0"))

# Total rainfall across all records ≤ this value (mm) → drought advisory
DROUGHT_THRESHOLD_TOTAL_MM: float = float(os.getenv("DROUGHT_THRESHOLD_TOTAL_MM", "2.0"))

# Humidity ≥ this value (%) → fungal / pest risk advisory
HIGH_HUMIDITY_THRESHOLD_PCT: float = float(os.getenv("HIGH_HUMIDITY_THRESHOLD_PCT", "85.0"))

# ── Market thresholds ────────────────────────────────────────────────────────
# Fraction of market records with "down" trend → hold/store suggestion
MARKET_DOWN_RATIO_THRESHOLD: float = float(os.getenv("MARKET_DOWN_RATIO_THRESHOLD", "0.5"))

# ── Supported languages ──────────────────────────────────────────────────────
DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "en")
