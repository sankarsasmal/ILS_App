import pytest
from backend.services.dashboard_service import process_directory, compute_cumulative_tos, _parse_datetime


def test_missing_folder():
    with pytest.raises(ValueError):
        process_directory('Z:/folder/that/does/not/exist')


def test_parse_datetime():
    assert _parse_datetime(None) is None
    assert _parse_datetime("") is None
    dt = _parse_datetime("2025-01-01 10:30:00")
    assert dt is not None
    assert dt.year == 2025 and dt.hour == 10 and dt.minute == 30

    dt_slash = _parse_datetime("15/03/2025 14:00:00")
    assert dt_slash is not None
    assert dt_slash.day == 15 and dt_slash.month == 3 and dt_slash.hour == 14

    dt_hyphen = _parse_datetime("15-03-2025 14:00")
    assert dt_hyphen is not None
    assert dt_hyphen.day == 15 and dt_hyphen.month == 3 and dt_hyphen.hour == 14


def test_compute_cumulative_tos_basic():
    rows = [
        {"File Name": "F1.xls", "UID": "U1", "DateTime": "2025-01-01 10:00:00", "Lin-RON": 95.2},
        {"File Name": "F2.xls", "UID": "U2", "DateTime": "2025-01-01 12:30:00", "Lin-RON": 95.5},
        {"File Name": "F3.xls", "UID": "U3", "DateTime": "2025-01-01 15:45:00", "Lin-RON": 96.0},
    ]
    res = compute_cumulative_tos(rows)
    assert len(res) == 3
    assert res[0]["TOS(h)"] == 0.0
    assert res[1]["TOS(h)"] == 2.5
    assert res[2]["TOS(h)"] == 5.75


def test_compute_cumulative_tos_empty_and_single():
    assert compute_cumulative_tos([]) == []
    single = [{"File Name": "F1.xls", "DateTime": "2025-01-01 10:00:00"}]
    res = compute_cumulative_tos(single)
    assert res[0]["TOS(h)"] == 0.0


def test_compute_cumulative_tos_slash_format():
    rows = [
        {"File Name": "F1.xls", "DateTime": "01/01/2025 10:00:00"},
        {"File Name": "F2.xls", "DateTime": "01/01/2025 14:15:00"},
    ]
    res = compute_cumulative_tos(rows)
    assert res[0]["TOS(h)"] == 0.0
    assert res[1]["TOS(h)"] == 4.25
