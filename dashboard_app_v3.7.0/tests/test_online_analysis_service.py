from datetime import datetime, timedelta
import pytest
from backend.services.online_analysis_service import (
    map_online_row_reactor,
    apply_reactor_map_to_online_rows,
)
from app import create_app


def test_map_online_row_reactor_basic():
    reactor_rows = [
        {"DateTime": "2026-09-04 15:00:00", "R1": 1, "R2": 0, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
        {"DateTime": "2026-09-04 16:00:00", "R1": 0, "R2": 1, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
    ]
    # Row at 16:20:46 should subtract 1 hour -> 15:20:46 -> hour 15 -> R1
    result = map_online_row_reactor("2026-09-04 16:20:46", reactor_rows)
    assert result == "R1"


def test_map_online_row_reactor_midnight_rollover():
    # Midnight: 00:36:00 minus 1 hour -> previous day (2026-09-04) hour 23
    reactor_rows = [
        {"DateTime": "2026-09-04 23:00:00", "R1": 0, "R2": 0, "R3": 0, "R4": 0, "R5": 1, "R6": 0, "R7": 0, "R8": 0},
        {"DateTime": "2026-09-05 00:00:00", "R1": 0, "R2": 0, "R3": 0, "R4": 0, "R5": 0, "R6": 1, "R7": 0, "R8": 0},
    ]
    result = map_online_row_reactor("2026-09-05 00:36:00", reactor_rows)
    assert result == "R5"


def test_map_online_row_reactor_date_priority_over_hour_fallback():
    # If date matches, it should choose the row on the matching date
    reactor_rows = [
        {"DateTime": "2026-09-03 14:00:00", "R1": 1, "R2": 0, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
        {"DateTime": "2026-09-04 14:00:00", "R1": 0, "R2": 1, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
    ]
    # 2026-09-04 15:10 - 1 hr -> 2026-09-04 14:10 -> should pick R2
    result = map_online_row_reactor("2026-09-04 15:10:00", reactor_rows)
    assert result == "R2"


def test_map_online_row_reactor_hour_fallback_when_date_mismatch():
    # If date is not found in reactor map, falls back to matching hour
    reactor_rows = [
        {"DateTime": "2026-09-01 10:00:00", "R1": 0, "R2": 0, "R3": 1, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
    ]
    # 2026-09-05 11:30 - 1 hr -> hour 10 -> should fallback to R3
    result = map_online_row_reactor("2026-09-05 11:30:00", reactor_rows)
    assert result == "R3"


def test_map_online_row_reactor_invalid_inputs():
    assert map_online_row_reactor(None, []) is None
    assert map_online_row_reactor("invalid-date", [{"DateTime": "2026-09-04 10:00:00", "R1": 1}]) is None
    assert map_online_row_reactor("2026-09-04 10:00:00", []) is None
    assert map_online_row_reactor("2026-09-04 10:00:00", None) is None


def test_apply_reactor_map_to_online_rows():
    online_rows = [
        {"DateTime": "2026-09-04 16:20:46", "Reactor": "Original_R9", "C1": 1.2},
        {"DateTime": "2026-09-04 18:00:00", "Reactor": "Original_R9", "C1": 2.4},
        {"DateTime": "invalid", "Reactor": "KeepMe", "C1": 3.6},
    ]
    reactor_rows = [
        {"DateTime": "2026-09-04 15:00:00", "R1": 1, "R2": 0, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
        {"DateTime": "2026-09-04 17:00:00", "R1": 0, "R2": 1, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0},
    ]

    mapped = apply_reactor_map_to_online_rows(online_rows, reactor_rows)
    assert len(mapped) == 3
    assert mapped[0]["Reactor"] == "R1"
    assert mapped[1]["Reactor"] == "R2"
    assert mapped[2]["Reactor"] == "KeepMe"  # Unchanged fallback

    # When reactor_rows is empty, original values must be preserved
    unmodified = apply_reactor_map_to_online_rows(online_rows, [])
    assert unmodified[0]["Reactor"] == "Original_R9"
    assert unmodified[1]["Reactor"] == "Original_R9"
    assert unmodified[2]["Reactor"] == "KeepMe"


def test_api_apply_online_reactor_map():
    app = create_app()
    client = app.test_client()

    # Valid payload
    payload = {
        "rows": [{"DateTime": "2026-09-04 16:20:46", "Reactor": "None"}],
        "reactor_rows": [
            {"DateTime": "2026-09-04 15:00:00", "R1": 1, "R2": 0, "R3": 0, "R4": 0, "R5": 0, "R6": 0, "R7": 0, "R8": 0}
        ]
    }
    res = client.post("/api/apply-online-reactor-map", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "rows" in data
    assert data["rows"][0]["Reactor"] == "R1"
    assert data["record_count"] == 1

    # Missing rows error handling
    bad_res1 = client.post("/api/apply-online-reactor-map", json={"rows": []})
    assert bad_res1.status_code == 400

    # Missing reactor_rows error handling
    bad_res2 = client.post("/api/apply-online-reactor-map", json={"rows": [{"DateTime": "2026-09-04 10:00:00"}]})
    assert bad_res2.status_code == 400


def test_frontend_online_reactor_map_toggle_elements():
    from pathlib import Path
    base = Path(__file__).resolve().parent.parent

    html = (base / "frontend/online_analysis.html").read_text(encoding="utf-8")
    assert 'id="onlineReactorMapToggle"' in html
    assert 'id="onlineToggleDot"' in html
    assert 'id="onlineToggleText"' in html
    assert 'Reactor Map:' in html

    js = (base / "frontend/js/online_analysis.js").read_text(encoding="utf-8")
    assert "computeReactorForDateTime" in js
    assert "applyReactorMapMapping" in js
    assert "onlineReactorMapToggle" in js
    assert "reactorMapActive" in js

    css = (base / "frontend/css/dashboard.css").read_text(encoding="utf-8")
    assert ".reactor-toggle-btn" in css
