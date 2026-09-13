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

    # Verify Run Plan is positioned beside Online Analysis
    pos_online = nav_js.find("Online Analysis")
    pos_runplan = nav_js.find("Run Plan")
    assert pos_online != -1 and pos_runplan != -1
    assert pos_online < pos_runplan

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


