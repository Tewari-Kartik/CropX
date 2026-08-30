"""
CropX Advisory Engine — Pydantic Schemas
Strict request / response models that match the contract defined in
architecture.md §4.2 and consumed by HC's backend (advisoryService.js).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Request models (what the Node.js backend sends us) ────────────────────────

class FarmerInfo(BaseModel):
    """Farmer profile data."""
    farmer_id: Optional[str] = None
    full_name: Optional[str] = None
    preferred_language: Optional[str] = None
    region_id: Optional[str] = None
    land_size_acres: Optional[float] = None
    village_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class CropInfo(BaseModel):
    """Crop details for the advisory."""
    crop_id: Optional[str] = None
    farmer_id: Optional[str] = None
    crop_name: str = Field("crop", description="Name of the crop")
    sowing_date: Optional[date] = None
    growth_stage: Optional[str] = None  # "seedling" | "vegetative" | "flowering" | "harvesting"
    irrigation_type: Optional[str] = None  # "rainfed" | "irrigated" | "drip"

    model_config = ConfigDict(extra="allow")


class WeatherRecord(BaseModel):
    """A single day's weather observation for the farmer's region."""
    record_date: Optional[date] = None
    rainfall_mm: float = Field(0.0, ge=0, description="Daily rainfall in mm")
    temperature_c: float = Field(25.0, description="Temperature in °C")
    humidity_pct: float = Field(50.0, ge=0, le=100, description="Relative humidity %")
    source: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class MarketRecord(BaseModel):
    """A single market price observation."""
    mandi_name: Optional[str] = None
    price_date: Optional[date] = None
    price_per_quintal: float = Field(0.0, ge=0)
    trend: Optional[str] = None  # "up" | "down" | "stable"

    model_config = ConfigDict(extra="allow")


class AdvisoryRequest(BaseModel):
    """
    Payload POSTed by the Node.js backend to ``/internal/advisory/generate``.
    """
    farmer: FarmerInfo = Field(default_factory=FarmerInfo)
    crop: CropInfo = Field(default_factory=CropInfo)
    weather: list[WeatherRecord] = Field(default_factory=list)
    market: list[MarketRecord] = Field(default_factory=list)
    lang: str = Field("en", description="ISO 639-1 language code for the advisory text")

    model_config = ConfigDict(extra="allow")


# ── Response models ───────────────────────────────────────────────────────────

class AdvisoryResponse(BaseModel):
    """
    JSON returned to the Node.js backend.
    Shape matches architecture.md §4.2 advisory response contract.
    """
    advisory_id: str = Field(..., description="Unique identifier for this advisory")
    advisory_text: str = Field(..., description="Generated advisory text in requested language")
    language: str = Field(..., description="ISO 639-1 language code of the advisory")
    audio_url: str = Field("", description="URL to audio version (empty for now)")
    generated_at: str = Field(..., description="ISO-8601 timestamp of generation")
    sources: list[str] = Field(default_factory=list, description="Data sources that influenced the advisory")
    model_version: str = Field(..., description="Version of the advisory engine")
