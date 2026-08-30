"""
CropX Distress Engine — Feature Engineering
Transforms raw weather / market / loan records into a fixed‑width numeric
feature vector used by both the rule‑based and ML scorers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import List

from app.config import REGIONAL_AVG_RAINFALL_90D_MM
from app.schemas import LoanRecord, MarketRecord, WeatherRecord


@dataclass
class FeatureVector:
    """Flat numeric feature set extracted from raw input data."""

    # Weather‑derived
    rainfall_deficit_pct: float = 0.0
    drought_streak_days: int = 0
    avg_temperature_c: float = 25.0
    temp_extreme_days: int = 0
    humidity_stress_days: int = 0

    # Market‑derived
    market_price_drop_pct: float = 0.0
    price_volatility: float = 0.0
    negative_trend_ratio: float = 0.0

    # Loan‑derived
    loan_overdue_days: int = 0
    total_loan_exposure: float = 0.0
    overdue_loan_count: int = 0
    loan_utilization_ratio: float = 0.0

    def to_array(self) -> list[float]:
        """Return features as a flat list (order matters for ML scorer)."""
        return [
            self.rainfall_deficit_pct,
            float(self.drought_streak_days),
            self.avg_temperature_c,
            float(self.temp_extreme_days),
            float(self.humidity_stress_days),
            self.market_price_drop_pct,
            self.price_volatility,
            self.negative_trend_ratio,
            float(self.loan_overdue_days),
            self.total_loan_exposure,
            float(self.overdue_loan_count),
            self.loan_utilization_ratio,
        ]

    @staticmethod
    def feature_names() -> list[str]:
        return [
            "rainfall_deficit_pct",
            "drought_streak_days",
            "avg_temperature_c",
            "temp_extreme_days",
            "humidity_stress_days",
            "market_price_drop_pct",
            "price_volatility",
            "negative_trend_ratio",
            "loan_overdue_days",
            "total_loan_exposure",
            "overdue_loan_count",
            "loan_utilization_ratio",
        ]


# ─── Weather features ────────────────────────────────────────────────────────

def _extract_weather_features(records: List[WeatherRecord]) -> dict:
    """Derive weather‑related features from a list of daily observations."""
    if not records:
        return {
            "rainfall_deficit_pct": 50.0,   # assume moderate deficit if no data
            "drought_streak_days": 15,
            "avg_temperature_c": 30.0,
            "temp_extreme_days": 0,
            "humidity_stress_days": 0,
        }

    total_rainfall = sum(r.rainfall_mm for r in records)
    avg_temp = sum(r.temperature_c for r in records) / len(records)
    temp_extreme = sum(
        1 for r in records if r.temperature_c > 40.0 or r.temperature_c < 5.0
    )
    humidity_stress = sum(
        1 for r in records if r.humidity_pct < 30.0 or r.humidity_pct > 90.0
    )

    # Rainfall deficit vs regional average
    regional_avg = REGIONAL_AVG_RAINFALL_90D_MM
    if regional_avg > 0:
        deficit = max(0.0, (regional_avg - total_rainfall) / regional_avg * 100.0)
    else:
        deficit = 0.0

    # Drought streak — longest run of consecutive days with rainfall < 2 mm
    # Sort by date so streak calculation is chronological
    sorted_records = sorted(
        records, key=lambda r: r.record_date or date.min
    )
    max_streak = 0
    current_streak = 0
    for r in sorted_records:
        if r.rainfall_mm < 2.0:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 0

    return {
        "rainfall_deficit_pct": round(min(deficit, 100.0), 2),
        "drought_streak_days": max_streak,
        "avg_temperature_c": round(avg_temp, 2),
        "temp_extreme_days": temp_extreme,
        "humidity_stress_days": humidity_stress,
    }


# ─── Market features ─────────────────────────────────────────────────────────

def _extract_market_features(records: List[MarketRecord]) -> dict:
    """Derive market‑related features from price records."""
    if not records:
        return {
            "market_price_drop_pct": 25.0,  # assume moderate drop if no data
            "price_volatility": 0.3,
            "negative_trend_ratio": 0.5,
        }

    prices = [r.price_per_quintal for r in records if r.price_per_quintal > 0]
    if not prices:
        return {
            "market_price_drop_pct": 25.0,
            "price_volatility": 0.3,
            "negative_trend_ratio": 0.5,
        }

    avg_price = sum(prices) / len(prices)

    # Latest price (sort by date, take most recent)
    sorted_records = sorted(
        records, key=lambda r: r.price_date or date.min, reverse=True
    )
    latest_price = sorted_records[0].price_per_quintal if sorted_records else avg_price

    # Price drop %
    if avg_price > 0:
        drop = max(0.0, (avg_price - latest_price) / avg_price * 100.0)
    else:
        drop = 0.0

    # Volatility — coefficient of variation (std / mean)
    if len(prices) >= 2 and avg_price > 0:
        variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
        std = variance ** 0.5
        volatility = std / avg_price
    else:
        volatility = 0.0

    # Negative trend ratio
    trend_counts = [1 for r in records if r.trend and r.trend.lower() == "down"]
    neg_ratio = len(trend_counts) / len(records) if records else 0.0

    return {
        "market_price_drop_pct": round(min(drop, 100.0), 2),
        "price_volatility": round(volatility, 4),
        "negative_trend_ratio": round(neg_ratio, 4),
    }


# ─── Loan features ───────────────────────────────────────────────────────────

def _extract_loan_features(records: List[LoanRecord]) -> dict:
    """Derive loan‑related features."""
    if not records:
        return {
            "loan_overdue_days": 0,
            "total_loan_exposure": 0.0,
            "overdue_loan_count": 0,
            "loan_utilization_ratio": 0.0,
        }

    today = date.today()
    overdue_days = 0
    overdue_count = 0
    overdue_amount = 0.0
    total_amount = 0.0

    for loan in records:
        total_amount += loan.loan_amount

        is_overdue = (
            loan.repayment_status
            and loan.repayment_status.lower() == "overdue"
        )

        if is_overdue:
            overdue_count += 1
            overdue_amount += loan.loan_amount
            if loan.due_date:
                days = max(0, (today - loan.due_date).days)
                overdue_days += days
            else:
                overdue_days += 30  # assume 30 days if date missing

    utilization = overdue_amount / total_amount if total_amount > 0 else 0.0

    return {
        "loan_overdue_days": overdue_days,
        "total_loan_exposure": round(total_amount, 2),
        "overdue_loan_count": overdue_count,
        "loan_utilization_ratio": round(min(utilization, 1.0), 4),
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def extract_features(
    weather: List[WeatherRecord],
    market: List[MarketRecord],
    loans: List[LoanRecord],
) -> FeatureVector:
    """
    Master feature‑extraction pipeline.
    Takes raw DB records → returns a typed ``FeatureVector``.
    """
    w = _extract_weather_features(weather)
    m = _extract_market_features(market)
    l = _extract_loan_features(loans)

    return FeatureVector(
        rainfall_deficit_pct=w["rainfall_deficit_pct"],
        drought_streak_days=w["drought_streak_days"],
        avg_temperature_c=w["avg_temperature_c"],
        temp_extreme_days=w["temp_extreme_days"],
        humidity_stress_days=w["humidity_stress_days"],
        market_price_drop_pct=m["market_price_drop_pct"],
        price_volatility=m["price_volatility"],
        negative_trend_ratio=m["negative_trend_ratio"],
        loan_overdue_days=l["loan_overdue_days"],
        total_loan_exposure=l["total_loan_exposure"],
        overdue_loan_count=l["overdue_loan_count"],
        loan_utilization_ratio=l["loan_utilization_ratio"],
    )
