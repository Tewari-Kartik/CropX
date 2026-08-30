"""
CropX Distress Engine — Pydantic Schemas
Strict request / response models that match the contract defined in
architecture.md §5 and consumed by RV's backend (distressService.js).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Request models (what the Node.js backend sends us) ────────────────────────

class WeatherRecord(BaseModel):
    """A single day's weather observation for the farmer's region."""
    weather_id: Optional[str] = None
    region_id: Optional[str] = None
    record_date: Optional[date] = None
    rainfall_mm: float = Field(0.0, ge=0, description="Daily rainfall in mm")
    temperature_c: float = Field(25.0, description="Temperature in °C")
    humidity_pct: float = Field(50.0, ge=0, le=100, description="Relative humidity %")
    source: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class MarketRecord(BaseModel):
    """A single market price observation."""
    price_id: Optional[str] = None
    crop_id: Optional[str] = None
    mandi_name: Optional[str] = None
    price_date: Optional[date] = None
    price_per_quintal: float = Field(0.0, ge=0)
    trend: Optional[str] = None  # "up" | "down" | "stable"

    model_config = ConfigDict(extra="allow")


class LoanRecord(BaseModel):
    """A single loan held by the farmer."""
    loan_id: Optional[str] = None
    farmer_id: Optional[str] = None
    loan_amount: float = Field(0.0, ge=0)
    disbursed_date: Optional[date] = None
    due_date: Optional[date] = None
    repayment_status: Optional[str] = None  # "active" | "overdue" | "repaid"

    model_config = ConfigDict(extra="allow")


class DistressRequest(BaseModel):
    """
    Payload POSTed by the Node.js backend to ``/internal/distress/score``.
    """
    farmer_id: str
    weather: list[WeatherRecord] = Field(default_factory=list)
    market: list[MarketRecord] = Field(default_factory=list)
    loans: list[LoanRecord] = Field(default_factory=list)


# ── Response models ───────────────────────────────────────────────────────────

class ContributingFactors(BaseModel):
    """Per‑feature breakdown that powers the "explainable AI" narrative."""
    rainfall_deficit_pct: float = Field(
        0.0, description="How far actual rainfall fell short of regional avg (%)"
    )
    drought_streak_days: int = Field(
        0, description="Longest run of consecutive dry days (< 2 mm)"
    )
    temp_extreme_days: int = Field(
        0, description="Days with temperature > 40 °C or < 5 °C"
    )
    humidity_stress_days: int = Field(
        0, description="Days with humidity < 30 % or > 90 %"
    )
    market_price_drop_pct: float = Field(
        0.0, description="Latest price vs 90‑day average drop (%)"
    )
    price_volatility: float = Field(
        0.0, description="Coefficient of variation of market prices"
    )
    negative_trend_ratio: float = Field(
        0.0, description="Fraction of market records trending down"
    )
    loan_overdue_days: int = Field(
        0, description="Total overdue days summed across all overdue loans"
    )
    total_loan_exposure: float = Field(
        0.0, description="Sum of all outstanding loan amounts (₹)"
    )
    overdue_loan_count: int = Field(
        0, description="Number of loans currently overdue"
    )
    loan_utilization_ratio: float = Field(
        0.0, description="Overdue amount / total loan amount"
    )


class DistressResponse(BaseModel):
    """
    JSON returned to the Node.js backend.
    Shape matches architecture.md §4.3 + enriched contributing_factors.
    """
    risk_score: float = Field(..., ge=0, le=100)
    risk_band: str = Field(..., pattern="^(low|medium|high|critical)$")
    contributing_factors: ContributingFactors
    model_version: str
