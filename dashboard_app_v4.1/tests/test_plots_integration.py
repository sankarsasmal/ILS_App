from pathlib import Path
from app import create_app


def test_plots_route_serves_html_with_required_elements():
    client = create_app({"TESTING": True}).test_client()
    resp = client.get("/plots")
    assert resp.status_code == 200
    html = resp.data.decode("utf-8")

    # Verify Page Title and Header
    assert "Plots | DHA Data Dashboard" in html
    assert "Yield Analysis & Scatter Plots" in html

    # Verify Dropdowns and Controls (strictly single Y axis, no secondary Y2 axis)
    assert 'id="plotXSelect"' in html
    assert 'id="plotYSelect"' in html
    assert 'id="plotY2Select"' not in html
    assert 'id="plotReactorFilter"' in html
    assert 'id="plotReactorBtn"' in html
    assert 'id="plotReactorMenu"' in html
    assert 'id="selectAllReactors"' in html
    assert 'id="clearAllReactors"' in html
    assert 'id="reactorCheckboxList"' in html
    assert 'id="plotFrom"' in html
    assert 'id="plotTo"' in html
    assert 'id="plotClearDates"' in html
    assert 'id="plotExportBtn"' in html

    # Verify Canvas and Legend
    assert 'id="scatterCanvas"' in html
    assert 'id="plotLegend"' in html
    assert 'id="plotEmpty"' in html

    # Verify KPI elements (4 KPIs, no Y2)
    assert 'id="kpiPlotPoints"' in html
    assert 'id="kpiPlotReactors"' in html
    assert 'id="kpiPlotX"' in html
    assert 'id="kpiPlotY"' in html
    assert 'id="kpiPlotY2"' not in html

    # Verify Scripts
    assert 'src="/frontend/js/navigation.js"' in html
    assert 'src="/frontend/js/chart.umd.min.js"' in html
    assert 'src="/frontend/js/plots.js"' in html


def test_navigation_includes_plots_tab_after_calculation_table():
    nav_path = Path(__file__).resolve().parent.parent / "frontend" / "js" / "navigation.js"
    assert nav_path.exists()
    content = nav_path.read_text(encoding="utf-8")

    # Verify Plots tab is rendered immediately after Calculation table in the navigation markup
    calc_tab = 'href="/frontend/calculation_table.html">Calculation table</a>'
    plots_tab = 'href="/frontend/plots.html">Plots</a>'
    calc_idx = content.find(calc_tab)
    plots_idx = content.find(plots_tab)
    assert calc_idx != -1, "Calculation table tab link not found in navigation.js"
    assert plots_idx != -1, "Plots tab link not found in navigation.js"
    assert plots_idx > calc_idx, "Plots tab must be placed after Calculation table in navigation.js"


def test_chart_js_and_plots_js_exist_and_contain_logic():
    js_dir = Path(__file__).resolve().parent.parent / "frontend" / "js"
    chart_js = js_dir / "chart.umd.min.js"
    plots_js = js_dir / "plots.js"

    assert chart_js.exists()
    assert chart_js.stat().st_size > 10000

    assert plots_js.exists()
    plots_content = plots_js.read_text(encoding="utf-8")
    assert "plotXSelect" in plots_content
    assert "plotYSelect" in plots_content
    assert "plotY2Select" not in plots_content
    assert "plotReactorFilter" in plots_content
    assert "plotClearDates" in plots_content
    assert "plotExportBtn" in plots_content
    assert "selectedX" in plots_content
    assert "selectedY" in plots_content
    assert "selectedY2" not in plots_content
    assert "BASE_TABLE_NUMERIC_COLS" in plots_content
    assert "BASE_TABLE_LABELS" in plots_content
    # Verify standard reactors R1 to R8 and distinct symbols
    assert "STANDARD_REACTORS" in plots_content
    assert "'circle'" in plots_content
    assert "'triangle'" in plots_content
    assert "'rect'" in plots_content
    assert "'rectRot'" in plots_content


def test_yield_table_normalizes_reactor_values():
    from backend.calculations.yield_table import _normalize_reactor
    assert _normalize_reactor("1") == "R1"
    assert _normalize_reactor("R2") == "R2"
    assert _normalize_reactor("r3") == "R3"
    assert _normalize_reactor("8") == "R8"
    assert _normalize_reactor("0") == ""
    assert _normalize_reactor("") == ""
    assert _normalize_reactor(None) == ""


def test_plots_base_table_tags_coverage():
    js_dir = Path(__file__).resolve().parent.parent / "frontend" / "js"
    plots_js = js_dir / "plots.js"
    content = plots_js.read_text(encoding="utf-8")

    # Verify all Base Table tags are present
    expected_tags = [
        "Temperature",
        "Pressure",
        "N2[SLPH]",
        "Naphtha_online",
        "H2_out",
        "Naphtha_out",
        "Carbon_out",
        "Naphtha_in",
        "Naphtha/H2",
        "ESTD_H2",
        "ESTD_N2",
    ]
    for tag in expected_tags:
        assert tag in content, f"Expected tag {tag} in plots.js"

    # Verify Base Table tags are merged and loaded for single Y axis selection
    assert "mergeBaseTableValues" in content
    assert "getBaseTableRows" in content
    assert "position: 'left'" in content


def test_plots_table3_octane_tags_coverage():
    js_dir = Path(__file__).resolve().parent.parent / "frontend" / "js"
    plots_js = js_dir / "plots.js"
    content = plots_js.read_text(encoding="utf-8")

    # Verify Table-3 constants and helper functions exist
    assert "TABLE3_NUMERIC_COLS" in content
    assert "TABLE3_LABELS" in content
    assert "mergeTable3Values" in content
    assert "getTable3Rows" in content

    # Verify all Table-3 Octane columns are present
    expected_octane_cols = [
        "Lin-RON",
        "Lin-MON",
        "Cal-RON",
        "Cal-MON",
        "TOS(h)",
    ]
    for col in expected_octane_cols:
        assert f"'{col}'" in content, f"Expected Table-3 column {col} in plots.js"

    # Verify optgroup for Table-3 Octane Table under Offline Analysis
    assert 'optgroup label="Table-3 Octane Table (Offline Analysis)"' in content

    # Verify fallback plotting when Table-3 rows exist
    assert "table3Rows" in content

