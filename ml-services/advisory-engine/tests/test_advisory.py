"""
CropX Advisory Engine — Unit Tests
Covers rule engine, text generation, schemas, and the API endpoint.
"""

from __future__ import annotations

import sys
import os
from datetime import date

import pytest

# Ensure the project root is on the path so `app.*` imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas import (
    AdvisoryRequest,
    AdvisoryResponse,
    CropInfo,
    FarmerInfo,
    MarketRecord,
    WeatherRecord,
)
from app.rule_engine import (
    AdvisoryResult,
    analyse_crop_stage,
    analyse_irrigation,
    analyse_market,
    analyse_weather,
    generate_advisory,
)
from app.text_generator import render_advisory


# ═══════════════════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _make_request(**overrides) -> AdvisoryRequest:
    """Build an AdvisoryRequest with sensible defaults, overriding as needed."""
    defaults = dict(
        farmer=FarmerInfo(
            farmer_id="test-farmer-001",
            full_name="Test Farmer",
            preferred_language="en",
            village_name="TestVille",
            district="TestDistrict",
            state="TestState",
        ),
        crop=CropInfo(
            crop_name="Rice",
            growth_stage="vegetative",
            irrigation_type="rainfed",
        ),
        weather=[
            WeatherRecord(
                record_date=date(2026, 8, 25),
                rainfall_mm=12.5,
                temperature_c=32.0,
                humidity_pct=78.0,
                source="IMD",
            ),
        ],
        market=[
            MarketRecord(
                mandi_name="Test Mandi",
                price_date=date(2026, 8, 25),
                price_per_quintal=2100.0,
                trend="down",
            ),
        ],
        lang="en",
    )
    defaults.update(overrides)
    return AdvisoryRequest(**defaults)


# ═══════════════════════════════════════════════════════════════════════════════
#  Rule Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestWeatherAnalysis:
    """Tests for weather rule analysis."""

    def test_rain_triggers_skip_irrigation(self):
        """Rainfall ≥ 5mm should produce a skip_irrigation fragment."""
        result = analyse_weather(
            weather=[WeatherRecord(rainfall_mm=15.0, temperature_c=30.0, humidity_pct=70.0)],
            crop_name="Rice",
            irrigation_type="rainfed",
        )
        actions = [f["action"] for f in result.fragments]
        assert "skip_irrigation" in actions
        assert "weather_data" in result.sources

    def test_heat_stress_detection(self):
        """Temperature ≥ 38°C should trigger heat_stress."""
        result = analyse_weather(
            weather=[WeatherRecord(rainfall_mm=0.0, temperature_c=42.0, humidity_pct=40.0)],
            crop_name="Wheat",
            irrigation_type="irrigated",
        )
        actions = [f["action"] for f in result.fragments]
        assert "heat_stress" in actions

    def test_frost_risk_detection(self):
        """Temperature ≤ 4°C should trigger frost_risk."""
        result = analyse_weather(
            weather=[WeatherRecord(rainfall_mm=0.0, temperature_c=2.0, humidity_pct=50.0)],
            crop_name="Mustard",
            irrigation_type="irrigated",
        )
        actions = [f["action"] for f in result.fragments]
        assert "frost_risk" in actions

    def test_drought_detection(self):
        """Total rainfall ≤ 2mm and no significant rain → drought."""
        result = analyse_weather(
            weather=[WeatherRecord(rainfall_mm=0.5, temperature_c=35.0, humidity_pct=30.0)],
            crop_name="Sorghum",
            irrigation_type="rainfed",
        )
        actions = [f["action"] for f in result.fragments]
        assert "drought" in actions

    def test_high_humidity_detection(self):
        """Humidity ≥ 85% should trigger high_humidity."""
        result = analyse_weather(
            weather=[WeatherRecord(rainfall_mm=0.0, temperature_c=28.0, humidity_pct=92.0)],
            crop_name="Rice",
            irrigation_type="rainfed",
        )
        actions = [f["action"] for f in result.fragments]
        assert "high_humidity" in actions

    def test_empty_weather_returns_nothing(self):
        """No weather data → no fragments."""
        result = analyse_weather(weather=[], crop_name="Rice", irrigation_type="rainfed")
        assert len(result.fragments) == 0
        assert len(result.sources) == 0


class TestCropStageAnalysis:
    """Tests for crop stage rule analysis."""

    def test_seedling_stage(self):
        crop = CropInfo(crop_name="Rice", growth_stage="seedling")
        result = analyse_crop_stage(crop)
        actions = [f["action"] for f in result.fragments]
        assert "seedling_care" in actions
        assert "growth_stage" in result.sources

    def test_vegetative_stage(self):
        crop = CropInfo(crop_name="Rice", growth_stage="vegetative")
        result = analyse_crop_stage(crop)
        actions = [f["action"] for f in result.fragments]
        assert "vegetative_nutrition" in actions

    def test_flowering_stage(self):
        crop = CropInfo(crop_name="Rice", growth_stage="flowering")
        result = analyse_crop_stage(crop)
        actions = [f["action"] for f in result.fragments]
        assert "flowering_care" in actions

    def test_harvesting_stage(self):
        crop = CropInfo(crop_name="Rice", growth_stage="harvesting")
        result = analyse_crop_stage(crop)
        actions = [f["action"] for f in result.fragments]
        assert "harvest_readiness" in actions

    def test_unknown_stage(self):
        crop = CropInfo(crop_name="Rice", growth_stage="unknown_stage")
        result = analyse_crop_stage(crop)
        assert len(result.fragments) == 0

    def test_empty_stage(self):
        crop = CropInfo(crop_name="Rice", growth_stage=None)
        result = analyse_crop_stage(crop)
        assert len(result.fragments) == 0


class TestMarketAnalysis:
    """Tests for market rule analysis."""

    def test_price_falling(self):
        """≥ 50% down trends should trigger price_falling."""
        records = [
            MarketRecord(price_per_quintal=2000.0, trend="down"),
            MarketRecord(price_per_quintal=1800.0, trend="down"),
        ]
        result = analyse_market(records, "Rice")
        actions = [f["action"] for f in result.fragments]
        assert "price_falling" in actions
        assert "market_prices" in result.sources

    def test_price_rising(self):
        """More up than down trends → price_rising."""
        records = [
            MarketRecord(price_per_quintal=2000.0, trend="up"),
            MarketRecord(price_per_quintal=2200.0, trend="up"),
            MarketRecord(price_per_quintal=2100.0, trend="stable"),
        ]
        result = analyse_market(records, "Rice")
        actions = [f["action"] for f in result.fragments]
        assert "price_rising" in actions

    def test_empty_market_returns_nothing(self):
        result = analyse_market([], "Rice")
        assert len(result.fragments) == 0


class TestIrrigationAnalysis:
    """Tests for irrigation rule analysis."""

    def test_rainfed_no_rain_supplement(self):
        """Rainfed + no rain → supplement advisory."""
        weather = [WeatherRecord(rainfall_mm=0.0, temperature_c=30.0, humidity_pct=50.0)]
        result = analyse_irrigation("rainfed", weather, "Rice", "vegetative")
        actions = [f["action"] for f in result.fragments]
        assert "rainfed_supplement" in actions

    def test_irrigated_with_rain_skip(self):
        """Irrigated + rain → skip advisory."""
        weather = [WeatherRecord(rainfall_mm=20.0, temperature_c=28.0, humidity_pct=65.0)]
        result = analyse_irrigation("irrigated", weather, "Wheat", "vegetative")
        actions = [f["action"] for f in result.fragments]
        assert "irrigated_skip" in actions

    def test_drip_with_rain_reduce(self):
        """Drip + rain → reduce flow advisory."""
        weather = [WeatherRecord(rainfall_mm=10.0, temperature_c=28.0, humidity_pct=60.0)]
        result = analyse_irrigation("drip", weather, "Tomato", "flowering")
        actions = [f["action"] for f in result.fragments]
        assert "drip_reduce" in actions


class TestGenerateAdvisory:
    """Tests for the master orchestrator."""

    def test_full_request_produces_fragments(self):
        """A complete request with all data types should produce multiple fragments."""
        request = _make_request()
        result = generate_advisory(request)
        assert len(result.fragments) > 0
        assert len(result.sources) > 0

    def test_empty_request_produces_minimal_result(self):
        """Request with no data → no fragments."""
        request = _make_request(weather=[], market=[])
        result = generate_advisory(request)
        # Should still get crop_stage fragments
        assert any(f["category"] == "crop_stage" for f in result.fragments)

    def test_deduplication(self):
        """Same action from different modules should be deduplicated."""
        request = _make_request()
        result = generate_advisory(request)
        action_keys = [f"{f['category']}:{f['action']}" for f in result.fragments]
        assert len(action_keys) == len(set(action_keys)), "Duplicate fragments detected"


# ═══════════════════════════════════════════════════════════════════════════════
#  Text Generator Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestTextGenerator:
    """Tests for template-based text generation."""

    def test_english_rendering(self):
        """English fragments should produce English text."""
        fragments = [
            {"category": "weather", "action": "skip_irrigation", "params": {
                "crop_name": "Rice", "rainfall_mm": 12.5, "rain_date": "2026-08-25",
            }},
        ]
        text = render_advisory(fragments, lang="en", crop_name="Rice")
        assert "Rice" in text
        assert "irrigation" in text.lower()

    def test_hindi_rendering(self):
        """Hindi fragments should produce Hindi text."""
        fragments = [
            {"category": "crop_stage", "action": "vegetative_nutrition", "params": {
                "crop_name": "चावल",
            }},
        ]
        text = render_advisory(fragments, lang="hi", crop_name="चावल")
        assert "यूरिया" in text  # "urea" in Hindi

    def test_empty_fragments_gives_fallback(self):
        """No fragments → fallback advisory."""
        text = render_advisory([], lang="en", crop_name="Rice")
        assert "Rice" in text
        assert len(text) > 0

    def test_unknown_language_falls_back_to_default(self):
        """Unsupported language should fall back to default (en)."""
        fragments = [
            {"category": "weather", "action": "heat_stress", "params": {
                "crop_name": "Wheat", "temperature_c": 42.0,
            }},
        ]
        text = render_advisory(fragments, lang="fr", crop_name="Wheat")
        assert "Wheat" in text  # should be English fallback

    def test_multiple_fragments_concatenated(self):
        """Multiple fragments should produce a combined advisory."""
        fragments = [
            {"category": "weather", "action": "skip_irrigation", "params": {
                "crop_name": "Rice", "rainfall_mm": 12.5, "rain_date": "Thursday",
            }},
            {"category": "crop_stage", "action": "vegetative_nutrition", "params": {
                "crop_name": "Rice",
            }},
        ]
        text = render_advisory(fragments, lang="en", crop_name="Rice")
        assert "irrigation" in text.lower()
        assert "urea" in text.lower()


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoint Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestAPI:
    """Integration tests hitting the actual FastAPI endpoint."""

    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_ready_endpoint(self, client):
        resp = client.get("/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ready"

    def test_generate_endpoint_full_payload(self, client):
        """POST with the exact payload shape from advisoryService.js."""
        payload = {
            "farmer": {
                "farmer_id": "550e8400-e29b-41d4-a716-446655440000",
                "full_name": "Ramesh Kumar",
                "preferred_language": "hi",
                "region_id": "550e8400-e29b-41d4-a716-446655440001",
                "land_size_acres": 2.5,
                "village_name": "Barrackpore",
                "district": "North 24 Parganas",
                "state": "West Bengal",
            },
            "crop": {
                "crop_id": "550e8400-e29b-41d4-a716-446655440002",
                "farmer_id": "550e8400-e29b-41d4-a716-446655440000",
                "crop_name": "Rice",
                "sowing_date": "2026-06-15",
                "growth_stage": "vegetative",
                "irrigation_type": "rainfed",
            },
            "weather": [
                {
                    "record_date": "2026-08-25",
                    "rainfall_mm": 12.5,
                    "temperature_c": 32.0,
                    "humidity_pct": 78.0,
                    "source": "IMD",
                }
            ],
            "market": [
                {
                    "mandi_name": "Barrackpore Mandi",
                    "price_date": "2026-08-25",
                    "price_per_quintal": 2100.0,
                    "trend": "down",
                }
            ],
            "lang": "hi",
        }
        resp = client.post("/internal/advisory/generate", json=payload)
        assert resp.status_code == 200
        data = resp.json()

        # Validate response shape
        assert "advisory_id" in data
        assert "advisory_text" in data
        assert "language" in data
        assert "audio_url" in data
        assert "generated_at" in data
        assert "sources" in data
        assert "model_version" in data

        # Validate values
        assert data["language"] == "hi"
        assert len(data["advisory_text"]) > 0
        assert isinstance(data["sources"], list)
        assert len(data["sources"]) > 0
        assert data["model_version"] == "advisory-v1.0.0"

    def test_generate_endpoint_english(self, client):
        """Test English advisory generation."""
        payload = {
            "farmer": {"farmer_id": "test-001", "full_name": "John Doe"},
            "crop": {
                "crop_name": "Wheat",
                "growth_stage": "flowering",
                "irrigation_type": "irrigated",
            },
            "weather": [
                {
                    "record_date": "2026-08-25",
                    "rainfall_mm": 0.0,
                    "temperature_c": 40.0,
                    "humidity_pct": 30.0,
                }
            ],
            "market": [
                {
                    "price_per_quintal": 2500.0,
                    "trend": "up",
                }
            ],
            "lang": "en",
        }
        resp = client.post("/internal/advisory/generate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["language"] == "en"
        assert "Wheat" in data["advisory_text"]

    def test_generate_endpoint_minimal_payload(self, client):
        """Minimal payload should still return a valid response."""
        payload = {
            "farmer": {},
            "crop": {"crop_name": "Rice"},
            "weather": [],
            "market": [],
            "lang": "en",
        }
        resp = client.post("/internal/advisory/generate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "advisory_id" in data
        assert len(data["advisory_text"]) > 0
        assert data["model_version"] == "advisory-v1.0.0"

    def test_generate_endpoint_defaults_only(self, client):
        """Completely empty payload should use defaults and not crash."""
        resp = client.post("/internal/advisory/generate", json={})
        assert resp.status_code == 200
        data = resp.json()
        assert "advisory_id" in data
        assert "advisory_text" in data

    def test_generate_endpoint_extra_fields_allowed(self, client):
        """Extra fields in payload should be accepted (Pydantic extra='allow')."""
        payload = {
            "farmer": {"farmer_id": "test", "custom_field": "custom_value"},
            "crop": {"crop_name": "Rice", "extra_data": 123},
            "weather": [],
            "market": [],
            "lang": "en",
            "extra_top_level": True,
        }
        resp = client.post("/internal/advisory/generate", json=payload)
        assert resp.status_code == 200

    def test_generate_endpoint_response_shape_matches_contract(self, client):
        """Ensure every field from the contract is present and correctly typed."""
        resp = client.post("/internal/advisory/generate", json={
            "crop": {"crop_name": "Rice", "growth_stage": "seedling"},
            "lang": "en",
        })
        assert resp.status_code == 200
        data = resp.json()

        # Type checks
        assert isinstance(data["advisory_id"], str)
        assert len(data["advisory_id"]) == 36  # UUID format
        assert isinstance(data["advisory_text"], str)
        assert isinstance(data["language"], str)
        assert isinstance(data["audio_url"], str)
        assert isinstance(data["generated_at"], str)
        assert isinstance(data["sources"], list)
        assert isinstance(data["model_version"], str)
