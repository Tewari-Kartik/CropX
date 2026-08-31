"""
CropX Advisory Engine — Rule Engine
Analyses weather, crop stage, market, and irrigation data to produce
structured advisory recommendations.

Each analysis function returns a list of advisory fragments (dicts) with:
  - category: str          e.g. "weather", "crop_stage", "market", "irrigation"
  - action: str            e.g. "skip_irrigation", "apply_fertilizer"
  - params: dict           template-interpolation variables
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.config import (
    DROUGHT_THRESHOLD_TOTAL_MM,
    FROST_RISK_THRESHOLD_C,
    HEAT_STRESS_THRESHOLD_C,
    HIGH_HUMIDITY_THRESHOLD_PCT,
    MARKET_DOWN_RATIO_THRESHOLD,
    RAIN_THRESHOLD_MM,
)
from app.schemas import AdvisoryRequest, CropInfo, MarketRecord, WeatherRecord

logger = logging.getLogger("advisory-engine.rules")


# ── Data class to hold all advisory fragments ─────────────────────────────────

@dataclass
class AdvisoryResult:
    """Collects advisory fragments and tracks which data sources were used."""
    fragments: list[dict] = field(default_factory=list)
    sources: set[str] = field(default_factory=set)

    def add(self, category: str, action: str, **params) -> None:
        self.fragments.append({
            "category": category,
            "action": action,
            "params": params,
        })


# ── Weather analysis ──────────────────────────────────────────────────────────

def analyse_weather(
    weather: list[WeatherRecord],
    crop_name: str,
    irrigation_type: str | None,
) -> AdvisoryResult:
    """
    Detect rain-skip, heat stress, frost risk, drought, and high-humidity
    conditions from weather records.
    """
    result = AdvisoryResult()

    if not weather:
        return result

    result.sources.add("weather_data")

    total_rainfall = sum(w.rainfall_mm for w in weather)
    max_temp = max(w.temperature_c for w in weather)
    min_temp = min(w.temperature_c for w in weather)
    max_humidity = max(w.humidity_pct for w in weather)
    avg_temp = sum(w.temperature_c for w in weather) / len(weather)

    # 1. Upcoming rain → skip irrigation
    has_significant_rain = any(w.rainfall_mm >= RAIN_THRESHOLD_MM for w in weather)
    if has_significant_rain:
        rain_day = next(w for w in weather if w.rainfall_mm >= RAIN_THRESHOLD_MM)
        result.add(
            "weather", "skip_irrigation",
            crop_name=crop_name,
            rainfall_mm=rain_day.rainfall_mm,
            rain_date=str(rain_day.record_date) if rain_day.record_date else "soon",
        )

    # 2. Heat stress
    if max_temp >= HEAT_STRESS_THRESHOLD_C:
        result.add(
            "weather", "heat_stress",
            crop_name=crop_name,
            temperature_c=max_temp,
        )

    # 3. Frost risk
    if min_temp <= FROST_RISK_THRESHOLD_C:
        result.add(
            "weather", "frost_risk",
            crop_name=crop_name,
            temperature_c=min_temp,
        )

    # 4. Drought — very low total rainfall
    if total_rainfall <= DROUGHT_THRESHOLD_TOTAL_MM and not has_significant_rain:
        result.add(
            "weather", "drought",
            crop_name=crop_name,
            total_rainfall_mm=total_rainfall,
            irrigation_type=irrigation_type or "rainfed",
        )

    # 5. High humidity → fungal / pest risk
    if max_humidity >= HIGH_HUMIDITY_THRESHOLD_PCT:
        result.add(
            "weather", "high_humidity",
            crop_name=crop_name,
            humidity_pct=max_humidity,
        )

    return result


# ── Crop-stage analysis ───────────────────────────────────────────────────────

def infer_stage_from_sowing_date(sowing_date_val) -> str | None:
    """Infer growth stage based on days elapsed since sowing date."""
    if not sowing_date_val:
        return None
    try:
        from datetime import date, datetime
        if isinstance(sowing_date_val, str):
            s_date = datetime.strptime(sowing_date_val.split("T")[0], "%Y-%m-%d").date()
        elif isinstance(sowing_date_val, date):
            s_date = sowing_date_val
        else:
            return None
        
        days = (date.today() - s_date).days
        if days < 0:
            return "seedling"
        elif days <= 25:
            return "seedling"
        elif days <= 65:
            return "vegetative"
        elif days <= 100:
            return "flowering"
        else:
            return "harvesting"
    except Exception:
        return None


def analyse_crop_stage(crop: CropInfo, avg_temp: float | None = None) -> AdvisoryResult:
    """
    Based on the current growth stage or sowing date, recommend appropriate actions:
    fertilizer timing, pest watch, harvest readiness, etc.
    """
    result = AdvisoryResult()
    stage = (crop.growth_stage or "").strip().lower()
    
    if not stage and crop.sowing_date:
        stage = infer_stage_from_sowing_date(crop.sowing_date) or ""

    if not stage:
        return result

    result.sources.add("growth_stage")
    crop_name = crop.crop_name

    if stage == "seedling":
        result.add(
            "crop_stage", "seedling_care",
            crop_name=crop_name,
            land_size=None,
        )
    elif stage == "vegetative":
        result.add(
            "crop_stage", "vegetative_nutrition",
            crop_name=crop_name,
        )
    elif stage == "flowering":
        result.add(
            "crop_stage", "flowering_care",
            crop_name=crop_name,
        )
    elif stage == "harvesting":
        result.add(
            "crop_stage", "harvest_readiness",
            crop_name=crop_name,
        )

    return result


# ── Market analysis ───────────────────────────────────────────────────────────

def analyse_market(market: list[MarketRecord], crop_name: str) -> AdvisoryResult:
    """
    If price trend is predominantly "down" → hold/store; if "up" → sell soon.
    """
    result = AdvisoryResult()

    if not market:
        return result

    result.sources.add("market_prices")

    down_count = sum(1 for m in market if (m.trend or "").lower() == "down")
    up_count = sum(1 for m in market if (m.trend or "").lower() == "up")
    total = len(market)

    # Latest price for template
    latest = market[-1]
    latest_price = latest.price_per_quintal
    mandi = latest.mandi_name or "local mandi"

    down_ratio = down_count / total if total > 0 else 0.0

    if down_ratio >= MARKET_DOWN_RATIO_THRESHOLD:
        result.add(
            "market", "price_falling",
            crop_name=crop_name,
            price=latest_price,
            mandi_name=mandi,
        )
    elif up_count > down_count:
        result.add(
            "market", "price_rising",
            crop_name=crop_name,
            price=latest_price,
            mandi_name=mandi,
        )

    return result


# ── Irrigation advice ─────────────────────────────────────────────────────────

def analyse_irrigation(
    irrigation_type: str | None,
    weather: list[WeatherRecord],
    crop_name: str,
    growth_stage: str | None,
) -> AdvisoryResult:
    """
    Cross-reference irrigation_type with weather to give targeted irrigation advice.
    """
    result = AdvisoryResult()
    irr = (irrigation_type or "rainfed").lower()

    if not weather:
        return result

    has_rain = any(w.rainfall_mm >= RAIN_THRESHOLD_MM for w in weather)
    total_rainfall = sum(w.rainfall_mm for w in weather)
    avg_temp = sum(w.temperature_c for w in weather) / len(weather)

    result.sources.add("weather_data")

    if irr == "rainfed":
        if not has_rain and total_rainfall <= DROUGHT_THRESHOLD_TOTAL_MM:
            result.add(
                "irrigation", "rainfed_supplement",
                crop_name=crop_name,
                growth_stage=growth_stage or "current",
            )
    elif irr == "irrigated":
        if has_rain:
            result.add(
                "irrigation", "irrigated_skip",
                crop_name=crop_name,
                days=2,
            )
        elif avg_temp >= HEAT_STRESS_THRESHOLD_C:
            result.add(
                "irrigation", "irrigated_increase",
                crop_name=crop_name,
            )
    elif irr == "drip":
        if has_rain:
            result.add(
                "irrigation", "drip_reduce",
                crop_name=crop_name,
                days=1,
            )
        elif avg_temp >= HEAT_STRESS_THRESHOLD_C:
            result.add(
                "irrigation", "drip_increase",
                crop_name=crop_name,
            )

    return result


# ── Master orchestrator ───────────────────────────────────────────────────────

def generate_advisory(request: AdvisoryRequest) -> AdvisoryResult:
    """
    Run all rule-engine analyses and merge results into a single AdvisoryResult.
    """
    crop_name = request.crop.crop_name
    irrigation_type = request.crop.irrigation_type
    growth_stage = request.crop.growth_stage

    # Compute avg temp for cross-module use
    avg_temp: float | None = None
    if request.weather:
        avg_temp = sum(w.temperature_c for w in request.weather) / len(request.weather)

    results: list[AdvisoryResult] = [
        analyse_weather(request.weather, crop_name, irrigation_type),
        analyse_crop_stage(request.crop, avg_temp),
        analyse_market(request.market, crop_name),
        analyse_irrigation(irrigation_type, request.weather, crop_name, growth_stage),
    ]

    merged = AdvisoryResult()
    for r in results:
        merged.fragments.extend(r.fragments)
        merged.sources.update(r.sources)

    # Deduplicate: if weather already added skip_irrigation, don't repeat from irrigation module
    seen_actions: set[str] = set()
    deduped: list[dict] = []
    for frag in merged.fragments:
        key = f"{frag['category']}:{frag['action']}"
        if key not in seen_actions:
            seen_actions.add(key)
            deduped.append(frag)
    merged.fragments = deduped

    logger.info(
        "Generated %d advisory fragments from sources=%s",
        len(merged.fragments),
        sorted(merged.sources),
    )

    return merged
