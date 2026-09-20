from app import create_app
from backend.services.online_analysis_service import ONLINE_COLUMNS, process_online_file


def test_endpoints():
    c = create_app({"TESTING": True}).test_client()
    assert c.get("/").status_code == 200
    assert c.get("/run-plan").status_code == 200
    assert c.get("/offline-analysis").status_code == 200
    assert c.get("/frontend/reactor_map.html").status_code == 200
    assert c.get("/frontend/online_analysis.html").status_code == 200
    assert c.get("/calculation-table").status_code == 200
    assert c.get("/frontend/calculation_table.html").status_code == 200
    assert c.get("/plots").status_code == 200
    assert c.get("/frontend/plots.html").status_code == 200
    assert c.get("/api/health").json["version"] == "4.0.0"


def test_process_online_file(tmp_path):
    source = tmp_path / "SystemTxt.txt"
    values = [
        "10.08.2026 14:30:00",
        "R3",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
    ]
    source.write_text(
        "\t".join(ONLINE_COLUMNS) + "\n" + "\t".join(values) + "\n", encoding="utf-8"
    )

    result = process_online_file(source)

    assert result["record_count"] == 1
    assert result["columns"][:2] == ["DateTime", "Reactor"]
    assert result["rows"][0]["DateTime"] == "2026-08-10 14:30:00"
    assert result["rows"][0]["Reactor"] == "R3"
