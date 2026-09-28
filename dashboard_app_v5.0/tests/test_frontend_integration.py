from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

def test_index_html_has_reactor_filter():
    index_html = (BASE / 'frontend/index.html').read_text(encoding='utf-8')
    assert 'id="reactorFilter"' in index_html
    assert 'Active Reactor: All' in index_html
    assert 'Active Reactor: R1' in index_html
    assert 'Active Reactor: R8' in index_html
    assert 'id="componentFilter"' in index_html
    # Verify reactor filter is right beside componentFilter in table-actions
    cf_pos = index_html.find('id="componentFilter"')
    rf_pos = index_html.find('id="reactorFilter"')
    search_pos = index_html.find('id="search"')
    assert cf_pos < rf_pos < search_pos

def test_dashboard_css_has_reactor_map_justification():
    css = (BASE / 'frontend/css/dashboard.css').read_text(encoding='utf-8')
    assert '.reactor-table{width:100%;min-width:880px;table-layout:fixed' in css
    assert 'width:calc((100% - 180px) / 8)' in css
    assert 'min-width:85px' in css
    assert '.reactor-filter' in css
    assert '.table3-table{min-width:1080px}' in css
    assert '.table3-table th:nth-child(4),.table3-table td:nth-child(4){min-width:100px;text-align:right;position:static}' in css
    # Verify no sticky gap on R1 (columns 2+ must have left:auto and not inherit left:245px)
    assert '.table1-table th:nth-child(2)' in css
    assert '.reactor-table th:not(:first-child){position:sticky;top:0;left:auto!important' in css
    assert '.reactor-table td:not(:first-child){position:static!important;left:auto!important' in css

def test_dashboard_js_has_active_reactor_table3_and_linking():
    js = (BASE / 'frontend/js/dashboard.js').read_text(encoding='utf-8')
    # Table-3 columns include 'TOS(h)' and 'Active Reactor'
    assert "'Active Reactor'" in js
    assert "'TOS(h)'" in js
    assert "c3=['File Name','UID','DateTime','TOS(h)','Active Reactor'" in js
    assert "withTos(r3)" in js
    assert "withTos(saved.r3)" in js
    # Filtering includes selectedReactor logic
    assert "selectedReactor" in js
    assert "activeReactorAt(row.DateTime)" in js
    assert "$('#reactorFilter')" in js
    assert "saveDashboardState" in js
    assert "restoreDashboardState" in js
