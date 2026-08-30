"""
CropX Distress Engine — Unit Tests
Covers feature engineering, scoring logic, risk bands, and the API endpoint.
"""

from __future__ import annotations

import sys
import os
from datetime import date, timedelta

import pytest

# Ensure the project root is on the path so `app.*` imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas import (
    DistressRequest,
    WeatherRecord,
    MarketRecord,
    LoanRecord,
)
from app.feature_engineering import extract_features, FeatureVector
from app.scorer import rule_based_score, classify_risk_band, ml_scorer


# ─── Feature Engineering Tests ────────────────────────────────────────────────

class TestFeatureEngineering:
    """Tests for the feature extraction pipeline."""

    def test_empty_data_returns_safe_defaults(self):
        """With no input data, features should still be a valid FeatureVector."""
        fv = extract_features(weather=[], market=[], loans=[])
        assert isinstance(fv, FeatureVector)
        # With no data we assume moderate distress signals
        assert fv.rainfall_deficit_pct == 50.0
        assert fv.drought_streak_days == 15
        assert fv.loan_overdue_days == 0

    def test_weather_features_with_data(self):
        """Verify rainfall deficit and drought streak calculations."""
        today = date.today()
        # Create 10 days of weather: 5 dry + 5 wet
        records = []
        for i in range(5):
            records.append(WeatherRecord(
                record_date=today - timedelta(days=10 - i),
                rainfall_mm=0.5,  # dry day (< 2mm)
                temperature_c=30.0,
                humidity_pct=60.0,
            ))
        for i in range(5):
            records.append(WeatherRecord(
                record_date=today - timedelta(days=5 - i),
                rainfall_mm=20.0,  # wet day
                temperature_c=28.0,
                humidity_pct=70.0,
            ))

        fv = extract_features(weather=records, market=[], loans=[])
        # Total rainfall = 5*0.5 + 5*20 = 102.5mm
        # Regional avg default = 450mm → deficit ≈ 77.2%
        assert 70.0 <= fv.rainfall_deficit_pct <= 80.0
        # Drought streak = 5 consecutive dry days
        assert fv.drought_streak_days == 5

    def test_market_features_with_data(self):
        """Verify price drop and negative trend ratio."""
        today = date.today()
        records = [
            MarketRecord(price_date=today - timedelta(days=3), price_per_quintal=2000, trend="stable"),
            MarketRecord(price_date=today - timedelta(days=2), price_per_quintal=2000, trend="down"),
            MarketRecord(price_date=today - timedelta(days=1), price_per_quintal=1800, trend="down"),
            MarketRecord(price_date=today, price_per_quintal=1600, trend="down"),
        ]
        fv = extract_features(weather=[], market=records, loans=[])
        # avg = (2000+2000+1800+1600)/4 = 1850, latest = 1600
        # drop = (1850-1600)/1850 * 100 ≈ 13.5%
        assert 10.0 <= fv.market_price_drop_pct <= 20.0
        # 3 out of 4 are "down"
        assert fv.negative_trend_ratio == 0.75

    def test_loan_features_with_overdue_loans(self):
        """Verify overdue days and loan utilization."""
        today = date.today()
        records = [
            LoanRecord(
                loan_amount=100000,
                due_date=today - timedelta(days=45),
                repayment_status="overdue",
            ),
            LoanRecord(
                loan_amount=50000,
                due_date=today + timedelta(days=30),
                repayment_status="active",
            ),
        ]
        fv = extract_features(weather=[], market=[], loans=records)
        assert fv.loan_overdue_days == 45
        assert fv.overdue_loan_count == 1
        assert fv.total_loan_exposure == 150000.0
        # utilization = 100000 / 150000 ≈ 0.6667
        assert 0.65 <= fv.loan_utilization_ratio <= 0.68

    def test_feature_vector_to_array_length(self):
        """Feature array must always have 12 elements."""
        fv = extract_features(weather=[], market=[], loans=[])
        assert len(fv.to_array()) == 12
        assert len(FeatureVector.feature_names()) == 12


# ─── Scorer Tests ─────────────────────────────────────────────────────────────

class TestScorer:
    """Tests for the rule-based scorer and risk classification."""

    def test_zero_features_gives_low_score(self):
        """All‑zero features → minimal distress."""
        fv = FeatureVector()  # all defaults = 0
        score = rule_based_score(fv)
        assert 0.0 <= score <= 20.0
        assert classify_risk_band(score) == "low"

    def test_max_features_gives_critical_score(self):
        """Maxed‑out features → critical distress."""
        fv = FeatureVector(
            rainfall_deficit_pct=100.0,
            drought_streak_days=60,
            avg_temperature_c=45.0,
            temp_extreme_days=30,
            humidity_stress_days=30,
            market_price_drop_pct=80.0,
            price_volatility=1.0,
            negative_trend_ratio=1.0,
            loan_overdue_days=180,
            total_loan_exposure=500_000,
            overdue_loan_count=5,
            loan_utilization_ratio=1.0,
        )
        score = rule_based_score(fv)
        assert score >= 90.0
        assert classify_risk_band(score) == "critical"

    def test_score_clamped_to_0_100(self):
        """Score must never exceed 100 or go below 0."""
        # Even with absurdly high values
        fv = FeatureVector(
            rainfall_deficit_pct=200.0,
            loan_overdue_days=999,
            market_price_drop_pct=200.0,
        )
        score = rule_based_score(fv)
        assert 0.0 <= score <= 100.0

    def test_risk_band_boundaries(self):
        """Verify exact threshold classification."""
        assert classify_risk_band(0.0) == "low"
        assert classify_risk_band(39.9) == "low"
        assert classify_risk_band(40.0) == "medium"
        assert classify_risk_band(59.9) == "medium"
        assert classify_risk_band(60.0) == "high"
        assert classify_risk_band(79.9) == "high"
        assert classify_risk_band(80.0) == "critical"
        assert classify_risk_band(100.0) == "critical"

    def test_moderate_features_gives_medium_or_high(self):
        """Mid‑range input → medium or high risk."""
        fv = FeatureVector(
            rainfall_deficit_pct=70.0,
            drought_streak_days=30,
            temp_extreme_days=10,
            humidity_stress_days=10,
            market_price_drop_pct=50.0,
            price_volatility=0.5,
            negative_trend_ratio=0.6,
            loan_overdue_days=90,
            total_loan_exposure=200_000,
            overdue_loan_count=3,
            loan_utilization_ratio=0.7,
        )
        score = rule_based_score(fv)
        band = classify_risk_band(score)
        assert band in ("medium", "high")


# ─── API Endpoint Tests ──────────────────────────────────────────────────────

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
        assert resp.json()["status"] == "ok"

    def test_ready_endpoint(self, client):
        resp = client.get("/ready")
        assert resp.status_code == 200
        assert resp.json()["status"] in ("ready", "not_ready")

    def test_score_endpoint_empty_data(self, client):
        """Scoring with minimal payload should still work."""
        resp = client.post("/internal/distress/score", json={
            "farmer_id": "test-farmer-001",
            "weather": [],
            "market": [],
            "loans": [],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "risk_score" in data
        assert "risk_band" in data
        assert "contributing_factors" in data
        assert "model_version" in data
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_band"] in ("low", "medium", "high", "critical")

    def test_score_endpoint_full_payload(self, client):
        """Scoring with realistic data."""
        today = date.today().isoformat()
        resp = client.post("/internal/distress/score", json={
            "farmer_id": "test-farmer-002",
            "weather": [
                {
                    "record_date": today,
                    "rainfall_mm": 1.0,
                    "temperature_c": 42.0,
                    "humidity_pct": 25.0,
                }
            ],
            "market": [
                {
                    "price_date": today,
                    "price_per_quintal": 1200.0,
                    "trend": "down",
                }
            ],
            "loans": [
                {
                    "loan_amount": 200000,
                    "due_date": (date.today() - timedelta(days=90)).isoformat(),
                    "repayment_status": "overdue",
                }
            ],
        })
        assert resp.status_code == 200
        data = resp.json()
        # With drought, price drop, and overdue loan → should be at least medium
        assert data["risk_band"] in ("medium", "high", "critical")
        assert data["contributing_factors"]["loan_overdue_days"] >= 90

    def test_score_endpoint_invalid_payload(self, client):
        """Missing required field should return 422."""
        resp = client.post("/internal/distress/score", json={
            # missing farmer_id
            "weather": [],
        })
        assert resp.status_code == 422
