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

    # Verify Dropdowns and Controls
    assert 'id="plotXSelect"' in html
    assert 'id="plotYSelect"' in html
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

    # Verify KPI elements
    assert 'id="kpiPlotPoints"' in html
    assert 'id="kpiPlotReactors"' in html
    assert 'id="kpiPlotX"' in html
    assert 'id="kpiPlotY"' in html

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
    assert "plotReactorFilter" in plots_content
    assert "plotClearDates" in plots_content
    assert "plotExportBtn" in plots_content
    assert "selectedX" in plots_content
    assert "selectedY" in plots_content
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
