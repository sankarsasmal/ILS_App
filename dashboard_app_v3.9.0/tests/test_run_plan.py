from pathlib import Path
import pytest
from app import create_app
from RunPlan import read_excel_range, load_run_plan_data
from backend.services.run_plan_service import process_run_plan_file

BASE = Path(__file__).resolve().parent.parent
SAMPLE_EXCEL = BASE / "data" / "RunPlan.xlsx"


def test_read_excel_range():
    assert SAMPLE_EXCEL.exists(), "Sample RunPlan.xlsx should exist"
    df_plan = read_excel_range(SAMPLE_EXCEL, sheet_name="Plan", range_string="A2:B2")
    assert df_plan.shape == (1, 2)
    assert df_plan.iloc[0, 0] == "Objective"

    df_loading = read_excel_range(SAMPLE_EXCEL, sheet_name="Plan", range_string="A4:j14")
    assert df_loading.shape == (11, 10)

    df_feed = read_excel_range(SAMPLE_EXCEL, sheet_name="Feed", range_string="A2:E25")
    assert df_feed.shape == (24, 5)


def test_load_run_plan_data():
    data = load_run_plan_data(str(SAMPLE_EXCEL))
    assert "df_plan" in data
    assert "df_Loading_plan" in data
    assert "df_Plan" in data
    assert "df_DOE" in data
    assert "df_feed" in data

    # Check forward fill on first two columns in DOE
    df_doe = data["df_DOE"]
    assert df_doe.shape[0] == 49
    # Ensure no NaN in condition no and block after row 0 header
    assert not df_doe.iloc[1:, 0].isna().any()
    assert not df_doe.iloc[1:, 1].isna().any()


def test_process_run_plan_file():
    res = process_run_plan_file(str(SAMPLE_EXCEL))
    assert "feed" in res
    assert "plan" in res
    assert "doe" in res
    assert "summary" in res

    assert res["feed"]["count"] == 24
    assert len(res["feed"]["columns"]) == 5
    assert res["feed"]["rows"][0]["component"] == "Carbon"

    assert len(res["plan"]["objective"]) > 20
    assert res["plan"]["count"] == 9
    assert res["plan"]["rows"][0]["parameter"] == "Catalyst"

    assert res["doe"]["count"] == 48
    assert len(res["doe"]["columns"]) == 13
    assert res["summary"]["reactor_count"] == 8


def test_process_run_plan_file_errors(tmp_path):
    with pytest.raises(FileNotFoundError):
        process_run_plan_file(str(tmp_path / "nonexistent.xlsx"))

    bad_file = tmp_path / "test.txt"
    bad_file.write_text("not an excel file")
    with pytest.raises(ValueError):
        process_run_plan_file(str(bad_file))


def test_run_plan_endpoints():
    c = create_app({"TESTING": True}).test_client()

    # Route checks
    assert c.get("/frontend/run_plan.html").status_code == 200
    assert c.get("/run_plan").status_code == 200
    assert c.get("/run-plan").status_code == 200

    # Settings check
    settings_resp = c.get("/api/settings")
    assert settings_resp.status_code == 200
    assert "default_run_plan_file" in settings_resp.json

    # Bad request check
    bad_resp = c.post("/api/process-run-plan", json={})
    assert bad_resp.status_code == 400

    # Successful process check
    good_resp = c.post("/api/process-run-plan", json={"path": str(SAMPLE_EXCEL)})
    assert good_resp.status_code == 200
    data = good_resp.json
    assert data["feed"]["count"] == 24
    assert data["doe"]["count"] == 48
    assert "objective" in data["plan"]


def test_navigation_and_subtabs_markup():
    nav_js = (BASE / "frontend/js/navigation.js").read_text(encoding="utf-8")
    assert "Run Plan" in nav_js
    assert "/frontend/run_plan.html" in nav_js

    # Verify Run Plan is the 1st tab in navigation before Offline and Online
    pos_runplan = nav_js.find("Run Plan")
    pos_offline = nav_js.find("Offline Analysis")
    pos_online = nav_js.find("Online Analysis")
    assert pos_runplan != -1 and pos_offline != -1 and pos_online != -1
    assert pos_runplan < pos_offline < pos_online

    run_plan_html = (BASE / "frontend/run_plan.html").read_text(encoding="utf-8")
    assert 'data-subtab="feed"' in run_plan_html
    assert 'data-subtab="plan"' in run_plan_html
    assert 'data-subtab="doe"' in run_plan_html
    assert 'id="runPlanBrowse"' in run_plan_html
    assert 'id="runPlanProcess"' in run_plan_html
    assert 'id="runPlanFile"' in run_plan_html
    assert 'id="feedTable"' in run_plan_html
    assert 'id="planTable"' in run_plan_html
    assert 'id="doeTable"' in run_plan_html


def test_run_plan_tables_column_alignment():
    css = (BASE / "frontend/css/dashboard.css").read_text(encoding="utf-8")
    assert ".runplan-table th" in css
    assert "text-align:center!important" in css
    assert "#feedTable th:first-child,#feedTable td:first-child,#planTable th:first-child,#planTable td:first-child{text-align:left!important" in css
    assert "#doeTable th:last-child,#doeTable td:last-child{text-align:left!important" in css

    js = (BASE / "frontend/js/run_plan.js").read_text(encoding="utf-8")
    # Feed 1st col left-aligned, others centered
    assert '<td style="text-align: left; font-weight: 600; padding-left: 16px;">${r.component || \'\'}</td>' in js
    assert '<td style="text-align: center;">${fmt(r.carbon_no)}</td>' in js
    # Plan 1st col left-aligned, others centered
    assert '<td style="text-align: left; font-weight: 600; padding-left: 16px;">${r.parameter || \'\'}</td>' in js
    assert '<td style="text-align: center;">${fmt(r.r1)}</td>' in js
    # DOE last col left-aligned, others centered
    assert "isLast ? 'left; padding-left: 16px;' : 'center'" in js


def test_run_number_and_landing_page():
    c = create_app({"TESTING": True}).test_client()

    # 1. Verify landing page / serves Run Plan
    landing_resp = c.get("/")
    assert landing_resp.status_code == 200
    assert b"Run Plan Management" in landing_resp.data
    assert b"id=\"runNumberInput\"" in landing_resp.data

    # Verify offline analysis route
    offline_resp = c.get("/offline-analysis")
    assert offline_resp.status_code == 200
    assert b"DHA Data" in offline_resp.data

    # 2. Verify HTML header elements across all pages
    run_plan_html = (BASE / "frontend/run_plan.html").read_text(encoding="utf-8")
    assert 'id="runNumberInput"' in run_plan_html
    assert 'Run Number' in run_plan_html

    index_html = (BASE / "frontend/index.html").read_text(encoding="utf-8")
    assert 'id="runNumberDisplay"' in index_html
    assert 'readonly' in index_html
    assert 'disabled' in index_html

    online_html = (BASE / "frontend/online_analysis.html").read_text(encoding="utf-8")
    assert 'id="runNumberDisplay"' in online_html
    assert 'readonly' in online_html
    assert 'disabled' in online_html

    # 3. Verify CSS rules
    css = (BASE / "frontend/css/dashboard.css").read_text(encoding="utf-8")
    assert ".run-number-group" in css
    assert ".run-number-input" in css
    assert ".run-number-readonly" in css

    # 4. Verify API endpoints for Run Number
    # GET run-number
    get_resp = c.get("/api/run-number")
    assert get_resp.status_code == 200
    assert "run_number" in get_resp.json

    # POST valid whole number
    post_resp = c.post("/api/run-number", json={"run_number": "104"})
    assert post_resp.status_code == 200
    assert post_resp.json["run_number"] == "104"

    # Verify settings returns run_number
    settings_resp = c.get("/api/settings")
    assert settings_resp.status_code == 200
    assert settings_resp.json["run_number"] == "104"

    # POST invalid values (decimal, negative, letters)
    bad_decimal = c.post("/api/run-number", json={"run_number": "10.5"})
    assert bad_decimal.status_code == 400

    bad_negative = c.post("/api/run-number", json={"run_number": "-5"})
    assert bad_negative.status_code == 400

    bad_text = c.post("/api/run-number", json={"run_number": "abc"})
    assert bad_text.status_code == 400

    # POST empty value allows clearing
    empty_resp = c.post("/api/run-number", json={"run_number": ""})
    assert empty_resp.status_code == 200
    assert empty_resp.json["run_number"] == ""


def test_run_number_empty_condition_and_readiness_hourglass():
    # 1. Verify "Please enter run number to start with" condition in JS files
    rp_js = (BASE / "frontend/js/run_plan.js").read_text(encoding="utf-8")
    assert "Please enter run number to start with" in rp_js
    assert "$('#runPlanProcess')" in rp_js

    dash_js = (BASE / "frontend/js/dashboard.js").read_text(encoding="utf-8")
    assert "Please enter run number to start with" in dash_js
    assert "$('#process')" in dash_js

    online_js = (BASE / "frontend/js/online_analysis.js").read_text(encoding="utf-8")
    assert "Please enter run number to start with" in online_js
    assert "online$('#onlineProcess')" in online_js

    # 2. Verify readiness indicator, ready-dot, and hourglass animation in HTML
    for page in ["run_plan.html", "index.html", "online_analysis.html"]:
        html = (BASE / "frontend" / page).read_text(encoding="utf-8")
        assert "readiness-indicator" in html
        assert "ready-dot" in html
        assert "hourglass-svg" in html

    # 3. Verify CSS: outside border removed from pill, green ready-dot and conditional toggle rules present
    css = (BASE / "frontend/css/dashboard.css").read_text(encoding="utf-8")
    assert ".pill{padding:7px 11px;border:none" in css
    assert ".readiness-indicator" in css
    assert "border:none!important" in css
    assert ".ready-dot" in css
    assert "background:#16a34a" in css
    assert ".readiness-indicator .hourglass-svg{display:none}" in css
    assert ".readiness-indicator.processing .hourglass-svg,.readiness-indicator.busy .hourglass-svg{display:inline-block}" in css
    assert "@keyframes hourglass-flip" in css
    assert "@keyframes sand-trickle" in css

    # 4. Verify navigation.js observer logic and reset button behavior
    nav_js = (BASE / "frontend/js/navigation.js").read_text(encoding="utf-8")
    assert "readinessEl.classList.toggle('processing', isBusy)" in nav_js
    assert "MutationObserver" in nav_js
    assert "localStorage.removeItem(RUN_NUMBER_KEY)" in nav_js
    assert "Reset dashboard and Run Number" in nav_js

    # 5. Verify default settings start blank
    settings = (BASE / "config/settings.json").read_text(encoding="utf-8")
    assert '"run_number": ""' in settings


def test_run_number_starts_blank_and_reset_behavior():
    app = create_app()
    assert app.config["RUN_NUMBER"] == ""
    c = app.test_client()

    # Initial GET must be blank
    r = c.get("/api/run-number")
    assert r.status_code == 200
    assert r.json["run_number"] == ""

    # POST new run number updates runtime but keeps disk settings.json blank
    p = c.post("/api/run-number", json={"run_number": "5017"})
    assert p.status_code == 200
    assert p.json["run_number"] == "5017"
    assert c.get("/api/run-number").json["run_number"] == "5017"

    disk_settings = (BASE / "config/settings.json").read_text(encoding="utf-8")
    assert '"run_number": ""' in disk_settings

    # Verify reset endpoint clears it
    reset_resp = c.post("/api/run-number", json={"run_number": ""})
    assert reset_resp.status_code == 200
    assert reset_resp.json["run_number"] == ""
    assert c.get("/api/run-number").json["run_number"] == ""

    # Verify frontend navigation.js logic for blank start and reset button
    nav_js = (BASE / "frontend/js/navigation.js").read_text(encoding="utf-8")
    assert "runInput.value = '';" in nav_js
    assert "runInput.defaultValue = '';" in nav_js
    assert "window.location.replace(window.location.pathname)" in nav_js
    assert "sessionStorage.clear()" in nav_js
    assert "body: JSON.stringify({ run_number: '' })" in nav_js

    # Verify HTML attributes
    rp_html = (BASE / "frontend/run_plan.html").read_text(encoding="utf-8")
    assert 'id="runNumberInput"' in rp_html
    assert 'value=""' in rp_html
    assert 'autocomplete="off"' in rp_html


def test_feed_properties_endpoint():
    c = create_app({"TESTING": True}).test_client()
    resp = c.get("/api/feed-properties")
    assert resp.status_code == 200
    data = resp.json
    assert "rows" in data
    assert len(data["rows"]) == 3
    # Check 1st three rows: Carbon, Hydrogen, Molecular Weight
    r0 = data["rows"][0]
    r1 = data["rows"][1]
    r2 = data["rows"][2]
    assert r0["component"] == "Carbon"
    assert round(float(r0["value"]), 2) == 83.61
    assert r1["component"] == "Hydrogen"
    assert round(float(r1["value"]), 2) == 16.23
    assert r2["component"] == "Molecular Weight"
    assert round(float(r2["value"]), 2) == 88.55


def test_calculation_table_feed_properties_markup_and_script():
    calc_html = (BASE / "frontend/calculation_table.html").read_text(encoding="utf-8")
    assert 'id="calcFeedStrip"' in calc_html
    assert 'id="calcFeedCarbonVal"' in calc_html
    assert 'id="calcFeedHydrogenVal"' in calc_html
    assert 'id="calcFeedMWVal"' in calc_html
    # Verify calcFeedStrip is placed beside calcClearDates
    clear_dates_pos = calc_html.find('id="calcClearDates"')
    feed_strip_pos = calc_html.find('id="calcFeedStrip"')
    badge_pos = calc_html.find('id="calcDateBadge"')
    assert clear_dates_pos != -1 and feed_strip_pos != -1 and badge_pos != -1
    assert clear_dates_pos < feed_strip_pos < badge_pos

    calc_js = (BASE / "frontend/js/calculation_table.js").read_text(encoding="utf-8")
    assert "renderFeedProperties" in calc_js
    assert "loadFeedProperties" in calc_js
    assert "toFixed(2)" in calc_js
    assert "/api/feed-properties" in calc_js

    css = (BASE / "frontend/css/dashboard.css").read_text(encoding="utf-8")
    assert ".calc-feed-strip" in css
    assert "inline-flex" in css








