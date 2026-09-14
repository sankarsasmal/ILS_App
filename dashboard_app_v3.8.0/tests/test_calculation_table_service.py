import pytest
import pandas as pd
from app import create_app
from backend.services.calculation_table_service import (
    EXCLUDED_ONLINE_COLUMNS,
    COLUMNS_TO_REMOVE,
    FIC_MAPPING,
    TEMPERATURE_MAPPING,
    PRESSURE_MAPPING,
    filter_base_table_columns,
    reconstruct_base_table,
    extract_base_table_data,
    process_base_table_file,
)
from backend.services.online_analysis_service import ONLINE_COLUMNS


def test_reconstruct_base_table_calculation_formulas():
    data = {
        "DateTime": ["2026-09-04 16:20:46", "2026-09-04 18:24:47"],
        "Reactor": ["R1", "R2"],
        "10i1TIC02": [200.0, 200.0],
        "10i2TIC02": [210.0, 210.0],
        "10i1PIC01": [24.5616, 24.6832],
        "10i2PIC01": [25.0, 25.0],
        "10i1FIC01": [2.601, 1.5],
        "10i1FIC02": [1.8, 2.0],
        "10i1FIC03": [2.0, 2.0],
        "10i1FIC04": [2.0, 2.0],
        "10i2FIC01": [2.0, 2.0],
        "10i2FIC02": [2.0, 2.0],
        "10i2FIC03": [2.0, 2.0],
        "10i2FIC04": [2.0, 2.0],
        "01i14FIC01": [50.0, 50.0],
        "ESTD_H2": [23.37, 17.351237],
        "ESTD_N2": [58.08, 70.015398],
    }
    df = pd.DataFrame(data)
    carbon = 83.61
    mw = 88.55

    res = reconstruct_base_table(df, carbon=carbon, molecular_weight=mw)
    cols = res.columns.tolist()

    # Verify columns dropped
    for col in COLUMNS_TO_REMOVE:
        assert col not in cols

    # Verify reconstructed columns present
    expected_cols = [
        "DateTime", "Reactor", "ESTD_H2", "ESTD_N2", "N2[SLPH]",
        "Temperature", "Pressure", "Naphtha_online", "H2_out",
        "Naphtha_out", "Carbon_out", "Naphtha_in", "Naphtha/H2"
    ]
    for exp in expected_cols:
        assert exp in cols

    # Check row 0 (R1) mappings
    r0 = res.iloc[0]
    assert r0["N2[SLPH]"] == 2.601  # mapped to 10i1FIC01
    assert r0["Temperature"] == 200.0  # mapped to 10i1TIC02
    assert r0["Pressure"] == 24.5616  # mapped to 10i1PIC01

    # Check mathematical formulas for row 0
    # Naphtha_online = 100 - (ESTD_H2 + ESTD_N2) = 100 - (23.37 + 58.08) = 18.55
    assert round(r0["Naphtha_online"], 4) == 18.5500
    # H2_out = (2.601 / 0.5808) * 0.2337 * 0.0416 * 2
    expected_h2_out = (2.601 / 0.5808) * 0.2337 * 0.0416 * 2
    assert round(r0["H2_out"], 4) == round(expected_h2_out, 4)
    # Naphtha_out = (2.601 / 0.5808) * 0.1855 * 0.0416 * 88.55
    expected_naphtha_out = (2.601 / 0.5808) * 0.1855 * 0.0416 * mw
    assert round(r0["Naphtha_out"], 4) == round(expected_naphtha_out, 4)
    # Carbon_out = Naphtha_out * Carbon / 100
    expected_carbon_out = expected_naphtha_out * carbon / 100.0
    assert round(r0["Carbon_out"], 4) == round(expected_carbon_out, 4)
    # Naphtha_in = Carbon_out * Carbon / 100
    expected_naphtha_in = expected_carbon_out * carbon / 100.0
    assert round(r0["Naphtha_in"], 4) == round(expected_naphtha_in, 4)
    # Naphtha/H2 = (18.55 * 88.55) / (23.37 * 2)
    expected_naphtha_h2 = (18.55 * mw) / (23.37 * 2.0)
    assert round(r0["Naphtha/H2"], 4) == round(expected_naphtha_h2, 4)

    # Check row 1 (R2) mappings
    r1 = res.iloc[1]
    assert r1["N2[SLPH]"] == 2.0  # mapped to 10i1FIC02
    assert r1["Temperature"] == 200.0  # mapped to 10i1TIC02
    assert r1["Pressure"] == 24.6832  # mapped to 10i1PIC01


def test_reconstruct_base_table_reactors_5_to_8():
    data = {
        "DateTime": ["2026-09-04 20:00:00"],
        "Reactor": ["R6"],
        "10i1TIC02": [200.0],
        "10i2TIC02": [215.0],
        "10i1PIC01": [24.0],
        "10i2PIC01": [26.5],
        "10i2FIC02": [3.14],
        "ESTD_H2": [20.0],
        "ESTD_N2": [60.0],
    }
    df = pd.DataFrame(data)
    res = reconstruct_base_table(df, carbon=83.61, molecular_weight=88.55)
    r = res.iloc[0]
    assert r["N2[SLPH]"] == 3.14  # mapped to 10i2FIC02
    assert r["Temperature"] == 215.0  # mapped to 10i2TIC02
    assert r["Pressure"] == 26.5  # mapped to 10i2PIC01


def test_extract_base_table_data():
    online_mock = {
        "columns": [
            "DateTime", "Reactor", "10i1TIC02", "10i2TIC02",
            "10i1PIC01", "10i2PIC01", "10i1FIC01", "01i14FIC01",
            "ESTD_H2", "ESTD_N2"
        ],
        "rows": [
            {
                "DateTime": "2026-09-04 16:20:46",
                "Reactor": "R1",
                "10i1TIC02": 200.0,
                "10i2TIC02": 200.0,
                "10i1PIC01": 24.56,
                "10i2PIC01": 24.56,
                "10i1FIC01": 2.6,
                "01i14FIC01": 680.78,
                "ESTD_H2": 20.0,
                "ESTD_N2": 60.0,
            }
        ],
        "record_count": 1,
        "source_file": "mock.txt",
    }

    base_table = extract_base_table_data(online_mock, carbon=83.61, molecular_weight=88.55)
    assert base_table["record_count"] == 1
    assert "01i14FIC01" not in base_table["columns"]
    assert "10i1FIC01" not in base_table["columns"]
    assert "N2[SLPH]" in base_table["columns"]
    assert "Temperature" in base_table["columns"]
    assert "Pressure" in base_table["columns"]
    assert "Naphtha_online" in base_table["columns"]
    assert "H2_out" in base_table["columns"]
    assert "Naphtha_out" in base_table["columns"]
    assert "Carbon_out" in base_table["columns"]
    assert "Naphtha_in" in base_table["columns"]
    assert "Naphtha/H2" in base_table["columns"]

    row0 = base_table["rows"][0]
    assert row0["DateTime"] == "2026-09-04 16:20:46"
    assert row0["Reactor"] == "R1"
    assert row0["N2[SLPH]"] == 2.6
    assert row0["Temperature"] == 200.0
    assert row0["Pressure"] == 24.56


def test_api_process_calculation_base():
    app = create_app({"TESTING": True})
    client = app.test_client()

    payload = {
        "columns": ["DateTime", "Reactor", "10i1TIC02", "10i1PIC01", "10i1FIC01", "ESTD_H2", "ESTD_N2"],
        "rows": [
            {
                "DateTime": "2026-09-04 16:20:46",
                "Reactor": "R1",
                "10i1TIC02": 200.0,
                "10i1PIC01": 24.56,
                "10i1FIC01": 2.6,
                "ESTD_H2": 20.0,
                "ESTD_N2": 60.0,
            }
        ],
        "source_file": "test.txt",
        "carbon": 83.61,
        "molecular_weight": 88.55,
    }
    res = client.post("/api/process-calculation-base", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["record_count"] == 1
    assert "10i1FIC01" not in data["columns"]
    assert "N2[SLPH]" in data["columns"]
    assert "Naphtha_online" in data["columns"]
    assert data["rows"][0]["Reactor"] == "R1"
    assert data["rows"][0]["N2[SLPH]"] == 2.6


def test_process_calculation_base_rejects_when_online_analysis_not_loaded():
    app = create_app({"TESTING": True})
    client = app.test_client()

    # When no online file is processed and no rows passed, must fail with 400
    res = client.post("/api/process-calculation-base", json={})
    assert res.status_code == 400
    data = res.get_json()
    assert "No Online Analysis data is currently loaded" in data.get("error", "")


def test_calculation_table_js_does_not_autoload_sample_files():
    from pathlib import Path
    base_dir = Path(__file__).resolve().parent.parent
    calc_js = (base_dir / "frontend/js/calculation_table.js").read_text(encoding="utf-8")
    assert "Result_10Aug26.txt" not in calc_js
    assert "if (!hasData) {\n        syncDirectFromFile();" not in calc_js

