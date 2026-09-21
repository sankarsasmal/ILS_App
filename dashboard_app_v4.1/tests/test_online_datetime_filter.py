from pathlib import Path

BASE = Path(__file__).resolve().parent.parent


def test_online_analysis_html_has_datetime_filter_elements():
    html = (BASE / "frontend/online_analysis.html").read_text(encoding="utf-8")
    assert 'id="onlineFrom"' in html
    assert 'id="onlineTo"' in html
    assert 'type="datetime-local"' in html
    assert 'id="onlineClearDates"' in html
    assert 'class="reactor-filters online-datetime-filters"' in html
    assert 'id="onlineDateBadge"' in html


def test_dashboard_css_has_online_datetime_filter_styles():
    css = (BASE / "frontend/css/dashboard.css").read_text(encoding="utf-8")
    assert ".online-datetime-filters" in css
    assert ".online-clear-dates-btn" in css
    assert ".online-filter-badge" in css


def test_online_analysis_js_has_datetime_filter_logic():
    js = (BASE / "frontend/js/online_analysis.js").read_text(encoding="utf-8")
    assert "dhaDateTimeFilter" in js
    assert "parseFilterTimestamp" in js
    assert "online$('#onlineFrom')" in js
    assert "online$('#onlineTo')" in js
    assert "online$('#onlineClearDates')" in js
    assert "fromTime" in js
    assert "toTime" in js


def test_dashboard_js_syncs_datetime_filter_with_shared_state():
    js = (BASE / "frontend/js/dashboard.js").read_text(encoding="utf-8")
    assert "dhaDateTimeFilter" in js
    assert "$('#valveFrom')" in js
    assert "$('#valveTo')" in js
    assert "valveFrom" in js
    assert "valveTo" in js


def test_datetime_filtering_simulation():
    # Verify the filtering logic on ISO timestamps
    from datetime import datetime

    sample_rows = [
        {"DateTime": "2026-09-04 16:20:46", "Reactor": "R1"},
        {"DateTime": "2026-09-05 10:15:00", "Reactor": "R2"},
        {"DateTime": "2026-09-06 08:30:22", "Reactor": "R3"},
    ]

    from_str = "2026-09-05T00:00"
    to_str = "2026-09-05T23:59"

    from_dt = datetime.strptime(from_str, "%Y-%m-%dT%H:%M")
    to_dt = datetime.strptime(to_str, "%Y-%m-%dT%H:%M")

    filtered = []
    for r in sample_rows:
        rdt = datetime.strptime(r["DateTime"], "%Y-%m-%d %H:%M:%S")
        if rdt >= from_dt and rdt <= to_dt:
            filtered.append(r)

    assert len(filtered) == 1
    assert filtered[0]["DateTime"] == "2026-09-05 10:15:00"
    assert filtered[0]["Reactor"] == "R2"
