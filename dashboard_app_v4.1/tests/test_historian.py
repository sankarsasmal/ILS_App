import pytest

from app import create_app
from backend.services import historian as h


def _payload(run="105", yield_val=1.5, extra_table=False, extra_kpi=False):
    p = {
        "run_number": run,
        "metadata": {"source_files": {"online_file": "C:/data/online.txt"}},
        "tables": [
            {
                "key": "calculation.yield_table",
                "title": "Yield",
                "section": "Calc",
                "columns": ["DateTime", "Reactor", "C1"],
                "rows": [
                    {"DateTime": "2026-01-01 10:00", "Reactor": "R1", "C1": yield_val},
                    {"DateTime": "2026-01-01 10:00", "Reactor": "R2", "C1": 2.0},
                ],
            },
        ],
        "kpis": [
            {
                "key": "online.record_count",
                "label": "Online Records",
                "section": "Online",
                "value": 2,
            }
        ],
        "raw_state": {"ils_yield_table_state": '{"rows":[]}'},
    }
    if extra_table:
        p["tables"].append({"key": "new.table", "title": "New", "rows": [{"x": 1}]})
    if extra_kpi:
        p["kpis"].append({"key": "new.kpi", "label": "New", "value": 7})
    return p


@pytest.mark.parametrize("bad", [None, "", "  ", "None", "unknown", "Run_None", "///"])
def test_invalid_run_numbers_rejected(bad):
    with pytest.raises(h.InvalidRunNumberError):
        h.sanitize_run_number(bad)


def test_run_number_sanitized():
    assert h.sanitize_run_number(" 0105 ") == "105"
    assert h.sanitize_run_number("Run_105") == "105"
    assert h.sanitize_run_number("A/B:1") == "A_B_1"


def test_save_load_and_duplicate(tmp_path):
    info = h.save_run_history("105", _payload(), historian_dir=tmp_path)
    assert (tmp_path / "Run_105.sqlite").is_file()
    assert info["table_count"] == 1
    assert h.history_run_exists("105", tmp_path)

    with pytest.raises(h.RunExistsError):
        h.save_run_history("105", _payload(yield_val=9.0), historian_dir=tmp_path)
    assert (
        h.load_run_history("105", tmp_path)["tables"]["calculation.yield_table"][
            "rows"
        ][0]["C1"]
        == 1.5
    )

    h.save_run_history(
        "105", _payload(yield_val=9.0), overwrite=True, historian_dir=tmp_path
    )
    run = h.load_run_history("105", tmp_path)
    assert run["tables"]["calculation.yield_table"]["rows"][0]["C1"] == 9.0
    assert run["metadata"]["run_number"] == "105"
    assert run["metadata"]["saved_at"]
    assert run["kpis"]["online.record_count"]["value"] == 2
    assert run["raw_state"]["ils_yield_table_state"] == '{"rows":[]}'
    assert [p.name for p in tmp_path.iterdir()] == ["Run_105.sqlite"]


def test_list_and_compare_with_structure_changes(tmp_path):
    h.save_run_history("101", _payload("101"), historian_dir=tmp_path)
    h.save_run_history(
        "99",
        _payload("99", yield_val=3.0, extra_table=True, extra_kpi=True),
        historian_dir=tmp_path,
    )
    (tmp_path / "Run_bad.sqlite").write_text("not a database")
    runs = h.list_available_runs(tmp_path)
    assert [r["run_number"] for r in runs] == ["99", "101", "bad"]
    assert "error" in runs[-1]

    a, b = h.load_run_history("101", tmp_path), h.load_run_history("99", tmp_path)
    res = h.compare_history_runs(a, b, table_key="calculation.yield_table")
    statuses = {t["key"]: t["status"] for t in res["tables"]}
    assert statuses == {
        "run_plan.plan": "missing",
        "calculation.base_table": "missing",
        "calculation.yield_table": "both",
    }
    assert "kpis" not in res
    t = res["table"]
    assert t["key_columns"] == ["Reactor"]
    assert t["row_status_counts"]["changed"] == 1
    assert t["rows"][0]["values"]["C1"]["delta"] == pytest.approx(1.5)

    # Tables outside the comparison scope fall back to the first available one.
    other = h.compare_history_runs(a, b, table_key="new.table")
    assert other["table_key"] == "calculation.yield_table"


def test_compare_plan_and_filters():
    def run(r1_val, base_rows):
        return h.normalize_payload(
            {
                "tables": [
                    {
                        "key": "run_plan.catalyst_loading",
                        "columns": ["Parameter", "Units", "R1", "R2"],
                        "rows": [
                            {
                                "parameter": "Catalyst",
                                "units": "g",
                                "r1": r1_val,
                                "r2": 5,
                            }
                        ],
                    },
                    {"key": "calculation.base_table", "rows": base_rows},
                    {"key": "offline.table1_carbon_number", "rows": [{"x": 1}]},
                ]
            }
        )

    base_a = [
        {"DateTime": "2026-08-10 11:00:00", "Reactor": "R1", "Temperature": 145.0},
        {"DateTime": "2026-08-10 12:00:00", "Reactor": "R2", "Temperature": 148.0},
        {"DateTime": "2026-08-10 13:00:00", "Reactor": "1", "Temperature": 150.0},
    ]
    base_b = [dict(r, Temperature=r["Temperature"] + 1) for r in base_a]
    a, b = run(10, base_a), run(12, base_b)

    res = h.compare_history_runs(
        a, b, table_key="run_plan.plan", filters={"reactor": "R1"}
    )
    assert [t["key"] for t in res["tables"]] == [k for k, *_ in h.COMPARISON_TABLES]
    plan = res["table"]
    assert plan["key_columns"] == ["Parameter"]
    assert plan["compare_columns"] == ["Units", "R1"]
    assert plan["filters_applied"]["reactor_mode"] == "column"
    assert plan["rows"][0]["values"]["R1"]["delta"] == 2

    base = h.compare_history_runs(
        a,
        b,
        table_key="calculation.base_table",
        filters={"reactor": "R1", "from": "2026-08-10T10:30", "to": "2026-08-10T12:30"},
    )["table"]
    assert base["filters_applied"]["reactor_mode"] == "rows"
    assert base["filters_applied"]["datetime_applied"] is True
    assert base["row_count_a"] == 1 and base["total_rows_a"] == 3
    assert base["filter_options"]["reactors"] == ["R1", "R2"]
    assert base["row_status_counts"]["changed"] == 1


def test_api_save_conflict_and_compare(tmp_path):
    c = create_app({"TESTING": True, "HISTORIAN_DIR": tmp_path}).test_client()
    assert (
        c.post(
            "/api/historian/save", json={"run_number": "", "payload": _payload("")}
        ).status_code
        == 400
    )
    assert (
        c.post(
            "/api/historian/save", json={"run_number": "105", "payload": _payload()}
        ).status_code
        == 200
    )
    r = c.post(
        "/api/historian/save",
        json={"run_number": "105", "payload": _payload(yield_val=4.0)},
    )
    assert r.status_code == 409 and r.json["exists"]
    assert "already exists for Run 105" in r.json["message"]
    assert (
        c.post(
            "/api/historian/save",
            json={
                "run_number": "105",
                "payload": _payload(yield_val=4.0),
                "overwrite": True,
            },
        ).status_code
        == 200
    )

    assert c.get("/api/historian/runs").json["runs"][0]["run_number"] == "105"
    assert c.get("/api/historian/runs/105/exists").json["exists"] is True
    assert c.get("/api/historian/runs/999").status_code == 404

    cmp = c.post(
        "/api/historian/compare",
        json={
            "a": {"current": _payload(yield_val=1.0)},
            "b": {"run": "105"},
            "table_key": "calculation.yield_table",
        },
    )
    assert cmp.status_code == 200
    assert cmp.json["table"]["row_status_counts"]["changed"] == 1
    assert c.get("/history").status_code == 200
