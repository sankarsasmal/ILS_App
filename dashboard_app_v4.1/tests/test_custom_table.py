import pytest
from app import create_app
from backend.services.custom_table_service import (
    extract_column_references,
    validate_formula_syntax,
    detect_circular_dependencies,
    resolve_execution_order,
    SafeEvaluator,
    compute_custom_table,
)


def test_extract_column_references():
    assert extract_column_references("=[ESTD_H2] + [ESTD_N2]") == ["ESTD_H2", "ESTD_N2"]
    assert extract_column_references("=[N2[SLPH]] * 2") == ["N2[SLPH]"]
    assert extract_column_references("100 - [ColA] / [ColB]") == ["ColA", "ColB"]
    assert extract_column_references("42") == []


def test_validate_formula_syntax():
    # Valid expressions
    res = validate_formula_syntax("=[ESTD_H2] + [ESTD_N2]")
    assert res["valid"] is True
    assert "ESTD_H2" in res["dependencies"]

    res = validate_formula_syntax("=IF([ESTD_N2] > 0, SAFE_DIV([N2[SLPH]], [ESTD_N2]), 0)")
    assert res["valid"] is True

    # Unknown column with available_columns filter
    res = validate_formula_syntax("=[ColUnknown] + 1", available_columns=["ColA", "ColB"])
    assert res["valid"] is False
    assert "not found" in res["message"]

    # Syntax error
    res = validate_formula_syntax("=[ColA] + (")
    assert res["valid"] is False

    # Security check: Forbidden syntax
    res = validate_formula_syntax("=__import__('os').system('dir')")
    assert res["valid"] is False


def test_circular_dependency_detection():
    # No cycle
    cols = [
        {"name": "ColA", "formula": "=[Raw] + 10"},
        {"name": "ColB", "formula": "=[ColA] * 2"},
        {"name": "ColC", "formula": "=[ColA] + [ColB]"},
    ]
    assert detect_circular_dependencies(cols) == []
    ordered = resolve_execution_order(cols, ["Raw"])
    assert [c["name"] for c in ordered] == ["ColA", "ColB", "ColC"]

    # Cycle: ColA -> ColB -> ColA
    cycle_cols = [
        {"name": "ColA", "formula": "=[ColB] + 1"},
        {"name": "ColB", "formula": "=[ColA] * 2"},
    ]
    cycles = detect_circular_dependencies(cycle_cols)
    assert len(cycles) > 0
    with pytest.raises(ValueError, match="Circular dependency"):
        resolve_execution_order(cycle_cols, [])


def test_safe_evaluator():
    row = {"ESTD_H2": 15.0, "ESTD_N2": 5.0, "N2[SLPH]": 10.0, "Zero": 0.0}

    evaluator = SafeEvaluator("=[ESTD_H2] + [ESTD_N2]")
    assert evaluator.evaluate_row(row) == 20.0

    # Safe division by zero returns None (or default)
    eval_div_zero = SafeEvaluator("=[ESTD_H2] / [Zero]")
    assert eval_div_zero.evaluate_row(row) is None

    # SAFE_DIV function
    eval_safe_div = SafeEvaluator("=SAFE_DIV([ESTD_H2], [Zero], 99.0)")
    assert eval_safe_div.evaluate_row(row) == 99.0

    # Conditional IF function
    eval_if = SafeEvaluator("=IF([ESTD_N2] > 0, [N2[SLPH]] / [ESTD_N2], 0)")
    assert eval_if.evaluate_row(row) == 2.0

    # Cell inspection lineage
    inspection = evaluator.inspect_row(row)
    assert inspection["result"] == 20.0
    assert inspection["inputs"]["ESTD_H2"] == 15.0
    assert inspection["inputs"]["ESTD_N2"] == 5.0


def test_compute_custom_table_pipeline():
    rows = [
        {"DateTime": "2026-08-10 10:00:00", "Reactor": "R1", "Flow": 10.0, "Temp": 150.0},
        {"DateTime": "2026-08-10 11:00:00", "Reactor": "R1", "Flow": 20.0, "Temp": 160.0},
    ]
    base_cols = ["DateTime", "Reactor", "Flow", "Temp"]
    custom_cols = [
        {"name": "Flow_Scaled", "formula": "=[Flow] * 1.5", "decimals": 2},
        {"name": "Metric_Combined", "formula": "=[Flow_Scaled] + [Temp]", "decimals": 1},
    ]

    result = compute_custom_table(rows, base_cols, custom_cols)
    assert len(result["errors"]) == 0
    assert "Flow_Scaled" in result["columns"]
    assert "Metric_Combined" in result["columns"]

    out_rows = result["rows"]
    assert out_rows[0]["Flow_Scaled"] == 15.0
    assert out_rows[0]["Metric_Combined"] == 165.0
    assert out_rows[1]["Flow_Scaled"] == 30.0
    assert out_rows[1]["Metric_Combined"] == 190.0


def test_custom_table_api_endpoints():
    app = create_app({"TESTING": True})
    client = app.test_client()

    # Health check reflects v4.1.0
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json["version"] == "4.1.0"

    # Serve custom table page
    res_page = client.get("/custom-table")
    assert res_page.status_code == 200
    assert b"Custom Calculated Table Management" in res_page.data
    assert b"custom_table.js" in res_page.data

    # Serve alternate route
    assert client.get("/custom_table").status_code == 200
    assert client.get("/frontend/custom_table.html").status_code == 200

    # API validate formula
    val_res = client.post(
        "/api/custom-table/validate-formula",
        json={"formula": "=[A] + [B]", "available_columns": ["A", "B", "C"]},
    )
    assert val_res.status_code == 200
    assert val_res.json["valid"] is True

    # API batch calculation
    calc_res = client.post(
        "/api/custom-table/calculate",
        json={
            "rows": [{"A": 10, "B": 5}, {"A": 20, "B": 8}],
            "columns": ["A", "B"],
            "custom_columns": [{"name": "Sum_AB", "formula": "=[A] + [B]", "decimals": 2}],
        },
    )
    assert calc_res.status_code == 200
    assert calc_res.json["rows"][0]["Sum_AB"] == 15.0
    assert calc_res.json["rows"][1]["Sum_AB"] == 28.0

    # API inspect cell
    insp_res = client.post(
        "/api/custom-table/inspect-cell",
        json={"row": {"A": 10, "B": 5}, "formula": "=[A] + [B]"},
    )
    assert insp_res.status_code == 200
    assert insp_res.json["result"] == 15.0
    assert insp_res.json["inputs"] == {"A": 10, "B": 5}


def test_cross_table_calculation():
    # Base table rows with DateTime and Reactor
    base_rows = [
        {"DateTime": "2026-08-10 10:00:00", "Reactor": "R1", "Naphtha_out": 35.0},
        {"DateTime": "2026-08-10 11:00:00", "Reactor": "R1", "Naphtha_out": 40.0},
    ]
    base_cols = ["DateTime", "Reactor", "Naphtha_out"]

    # Cross context: Online sensors + Table-2 component list
    cross_context = {
        "online_rows": [
            {"01i14FIC01": 12.5, "ESTD_CH4": 1.2},
            {"01i14FIC01": 14.0, "ESTD_CH4": 1.5},
        ],
        "table2_rows": [
            {"DateTime": "2026-08-10 10:00:00", "Reactor": "R1", "Propane": 2.5, "Isobutane": 5.0},
            {"DateTime": "2026-08-10 11:00:00", "Reactor": "R1", "Propane": 3.0, "Isobutane": 6.0},
        ],
    }

    # Custom column formula referencing Base Table + Table-2 + Online Analysis!
    custom_cols = [
        {
            "name": "Gas_Scale",
            "formula": "=[Naphtha_out] * ([Propane] + [Isobutane]) / 100",
            "decimals": 2,
        },
        {
            "name": "Sensor_Ratio",
            "formula": "=[01i14FIC01] / [Naphtha_out]",
            "decimals": 3,
        },
    ]

    res = compute_custom_table(base_rows, base_cols, custom_cols, cross_context=cross_context)
    assert len(res["errors"]) == 0
    assert "Gas_Scale" in res["columns"]
    assert "Sensor_Ratio" in res["columns"]

    # Row 0: 35.0 * (2.5 + 5.0) / 100 = 35 * 7.5 / 100 = 2.625 -> 2.63
    assert res["rows"][0]["Gas_Scale"] == 2.62 or res["rows"][0]["Gas_Scale"] == 2.63
    # Row 0 sensor ratio: 12.5 / 35.0 = 0.357
    assert res["rows"][0]["Sensor_Ratio"] == 0.357


def test_custom_table_html_ui_components():
    from pathlib import Path
    html_path = Path(__file__).resolve().parents[1] / "frontend" / "custom_table.html"
    content = html_path.read_text(encoding="utf-8")

    # Visual builder removed, formula bar kept
    assert "id=\"customFormulaInput\"" in content
    assert "visualBuilderSection" not in content
    assert "btnModeVisual" not in content

    # Expandable tag accordions exist
    assert "id=\"accBaseTable\"" in content
    assert "id=\"accTable2\"" in content
    assert "id=\"accOnline\"" in content
    assert "id=\"accCustom\"" in content
    assert "id=\"tagSearchBox\"" in content

    # Column remover & restore button
    assert "id=\"customRestoreColumns\"" in content

