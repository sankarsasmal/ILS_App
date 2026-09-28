(() => {
    const h$ = s => document.querySelector(s);
    const TABLES = [
        { key: 'run_plan.plan', title: 'Plan', section: 'Run Plan' },
        { key: 'calculation.base_table', title: 'Base Table', section: 'Calculation table' },
        { key: 'calculation.yield_table', title: 'Yield Table', section: 'Calculation table' }
    ];
    const state = { runs: [], activeTable: TABLES[0].key, result: null, reactors: new Set() };

    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isNum = v => typeof v === 'number' && Number.isFinite(v);
    const fmt = v => {
        if (v === null || v === undefined || v === '') return '—';
        if (isNum(v)) return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)));
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    };
    const fmtDelta = v => (isNum(v) ? (v > 0 ? '+' : '') + fmt(v) : '');
    const fmtPct = v => (isNum(v) ? (v > 0 ? '+' : '') + v.toFixed(2) + '%' : '');
    const STATUS_LABEL = { same: 'same', both: 'in both', changed: 'changed', only_a: 'only in A', only_b: 'only in B', missing: 'not saved' };
    const badge = s => `<span class="history-badge ${esc(s)}">${esc(STATUS_LABEL[s] || s)}</span>`;
    const runLabel = r => (String(r ?? '').startsWith('Current') ? String(r) : `Run ${r}`);

    function showError(m = '') {
        const el = h$('#historyError');
        el.textContent = m;
        el.classList.toggle('show', !!m);
    }
    const setStatus = t => { h$('#historyStatus').textContent = t; };

    async function getJson(r) {
        const t = await r.text();
        try { return JSON.parse(t); } catch { throw new Error('Server returned an invalid response.'); }
    }

    // ------------------------------------------------------------- Step 1: datasets
    async function loadRuns() {
        showError();
        setStatus('Loading...');
        try {
            const d = await getJson(await fetch('/api/historian/runs'));
            state.runs = d.runs || [];
            h$('#histRuns').innerHTML = state.runs.length
                ? state.runs.map(r => `<span class="history-run-chip${r.error ? ' bad' : ''}" title="${esc(r.error || `${r.file} · saved ${r.saved_at || '?'}`)}">Run ${esc(r.run_number)}</span>`).join('')
                : '<div class="history-empty">No Runs saved yet. Use "Save to Historian" on any dashboard page.</div>';
            fillRunSelects();
            setStatus('Ready');
        } catch (e) {
            showError(e.message);
            setStatus('Failed');
        }
    }

    function fillRunSelects() {
        const valid = state.runs.filter(r => !r.error);
        const opts = valid.map(r => `<option value="${esc(r.run_number)}">Run ${esc(r.run_number)}${r.saved_at ? ' · ' + esc(r.saved_at.slice(0, 16).replace('T', ' ')) : ''}</option>`).join('');
        const selA = h$('#histRunA'), selB = h$('#histRunB');
        const prevA = selA.value, prevB = selB.value;
        const current = h$('#histMode').value === 'current';
        selA.innerHTML = current ? '<option value="__current__">Current dashboard session</option>' : (opts || '<option value="">No saved Runs</option>');
        selB.innerHTML = opts || '<option value="">No saved Runs</option>';
        selA.disabled = current;
        h$('#histLoadA').disabled = current || !valid.length;
        if (!current) {
            if (valid.some(r => r.run_number === prevA)) selA.value = prevA;
            else if (valid.length > 1) selA.value = valid[valid.length - 2].run_number;
        }
        if (valid.some(r => r.run_number === prevB)) selB.value = prevB;
        else if (valid.length) selB.value = valid[valid.length - 1].run_number;
    }

    function datasetA() {
        if (h$('#histMode').value === 'current') {
            if (!window.ILSHistorian) throw new Error('Historian helper not loaded yet. Try again.');
            return { current: window.ILSHistorian.collectPayload() };
        }
        if (!h$('#histRunA').value) throw new Error('Select Dataset A.');
        return { run: h$('#histRunA').value };
    }

    function datasetB() {
        if (!h$('#histRunB').value) throw new Error('Select Dataset B.');
        return { run: h$('#histRunB').value };
    }

    // ------------------------------------------------------------- Step 2: filters
    const filters = () => ({ reactor: h$('#histReactor').value, from: h$('#histFrom').value, to: h$('#histTo').value });

    function updateFilterOptions(opts) {
        (opts?.reactors || []).forEach(r => state.reactors.add(r));
        const sel = h$('#histReactor');
        const prev = sel.value;
        const list = [...state.reactors].sort((x, y) => Number(x.slice(1)) - Number(y.slice(1)));
        sel.innerHTML = '<option value="">All reactors</option>' + list.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
        if (list.includes(prev)) sel.value = prev;
        ['#histFrom', '#histTo'].forEach(id => {
            if (opts?.datetime_min) h$(id).min = opts.datetime_min;
            if (opts?.datetime_max) h$(id).max = opts.datetime_max;
        });
    }

    // ------------------------------------------------------------- Step 3: comparison
    async function runCompare({ resetKeys = false } = {}) {
        if (resetKeys) h$('#histKeyCols').value = '';
        const keyCols = h$('#histKeyCols').value.split(',').map(s => s.trim()).filter(Boolean);
        showError();
        setStatus('Comparing...');
        try {
            const r = await fetch('/api/historian/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    a: datasetA(), b: datasetB(), table_key: state.activeTable,
                    key_columns: keyCols.length ? keyCols : null, filters: filters()
                })
            });
            const d = await getJson(r);
            if (!r.ok) throw new Error(d.error || 'Comparison failed.');
            state.result = d;
            if (d.table_key) state.activeTable = d.table_key;
            h$('#histResults').hidden = false;
            renderTabs();
            renderMeta();
            if (d.table) {
                updateFilterOptions(d.table.filter_options);
                fillColumnSelect();
                renderTable();
            } else {
                h$('#histTableTitle').textContent = 'No comparison tables saved';
                ['#histSummary', '#histColStats', '#histDetail'].forEach(id => { h$(id).innerHTML = ''; });
                h$('#histDetailNote').textContent = 'Neither dataset contains the Plan, Base Table or Yield Table.';
            }
            setStatus('Ready');
        } catch (e) {
            showError(e.message);
            setStatus('Failed');
        }
    }

    function renderTabs() {
        const byKey = Object.fromEntries((state.result?.tables || []).map(t => [t.key, t]));
        document.querySelectorAll('#histTabs .table-tab').forEach(btn => {
            const info = byKey[btn.dataset.table] || { status: 'missing' };
            const meta = TABLES.find(t => t.key === btn.dataset.table);
            const on = btn.dataset.table === state.activeTable;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', String(on));
            btn.disabled = info.status === 'missing';
            btn.innerHTML = `${esc(meta.title)} ${info.status === 'both' ? '' : badge(info.status)}`;
        });
    }

    function fillColumnSelect() {
        const t = state.result.table;
        const sel = h$('#histColSelect');
        const cols = t.compare_columns || [];
        const prev = new Set([...sel.selectedOptions].map(o => o.value));
        const prevAll = new Set([...sel.options].map(o => o.value));
        const keep = cols.filter(c => prev.has(c) || (prev.size && !prevAll.has(c)));
        const chosen = new Set(keep.length ? keep : (cols.length <= 10 ? cols : cols.slice(0, 8)));
        sel.innerHTML = cols.map(c => `<option value="${esc(c)}"${chosen.has(c) ? ' selected' : ''}>${esc(c)}</option>`).join('');
        h$('#histKeyCols').placeholder = t.key_detected ? `auto: ${t.key_columns.join(', ')}` : 'e.g. DateTime, Reactor';
    }

    function renderTable() {
        const d = state.result;
        const t = d.table;
        if (!t) return;
        const meta = TABLES.find(x => x.key === d.table_key) || { title: d.table_key, section: '' };
        h$('#histTableEyebrow').textContent = `STEP 3 · ${meta.section.toUpperCase()}`;
        h$('#histTableTitle').textContent = `${meta.title} · ${runLabel(d.run_a)} (A) vs ${runLabel(d.run_b)} (B)`;

        const c = t.row_status_counts || {};
        const tiles = [
            ['Rows A', t.row_count_a === t.total_rows_a ? t.row_count_a : `${t.row_count_a} / ${t.total_rows_a}`],
            ['Rows B', t.row_count_b === t.total_rows_b ? t.row_count_b : `${t.row_count_b} / ${t.total_rows_b}`],
            ['Same', c.same || 0],
            ['Changed', c.changed || 0],
            ['Only in A', c.only_a || 0],
            ['Only in B', c.only_b || 0]
        ];
        h$('#histSummary').innerHTML = tiles.map(([k, v]) => `<div class="kpi"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');

        const f = t.filters_applied || {};
        const notes = [`Rows matched by: ${t.row_matching === 'key' ? t.key_columns.join(' + ') : 'row order (no unique common key found)'}`];
        if (f.reactor) notes.push(f.reactor_mode === 'rows' ? `Reactor ${f.reactor}: rows filtered` : f.reactor_mode === 'column' ? `Reactor ${f.reactor}: column shown` : `Reactor ${f.reactor}: not applicable to this table`);
        if (h$('#histFrom').value || h$('#histTo').value) notes.push(f.datetime_applied ? 'Condition window applied' : 'Condition window not applicable to this table');
        if (!t.present_in_a) notes.push('Table not saved in A');
        if (!t.present_in_b) notes.push('Table not saved in B');
        if (t.columns_only_a.length) notes.push(`Columns only in A: ${t.columns_only_a.join(', ')}`);
        if (t.columns_only_b.length) notes.push(`Columns only in B: ${t.columns_only_b.join(', ')}`);
        if (t.truncated) notes.push('Row list truncated');
        h$('#histDetailNote').textContent = notes.join('  ·  ');

        const selected = new Set([...h$('#histColSelect').selectedOptions].map(o => o.value));
        const stats = (t.column_stats || []).filter(s => selected.has(s.column) && (s.numeric || s.changed_rows));
        h$('#histColStats').innerHTML = stats.length
            ? `<table class="history-table"><thead><tr><th>Column</th><th>Mean A</th><th>Mean B</th><th>Δ mean (B−A)</th><th>Δ %</th><th>Changed rows</th></tr></thead><tbody>` +
              stats.map(s => `<tr class="${s.changed_rows ? 'st-changed' : ''}"><td>${esc(s.column)}</td><td class="num">${esc(fmt(s.mean_a))}</td><td class="num">${esc(fmt(s.mean_b))}</td><td class="num">${esc(fmtDelta(s.mean_delta))}</td><td class="num">${esc(fmtPct(s.mean_pct))}</td><td class="num">${esc(s.changed_rows)}</td></tr>`).join('') +
              '</tbody></table>'
            : '<div class="history-empty">No numeric columns selected.</div>';

        renderRows();
    }

    function renderRows() {
        const t = state.result?.table;
        if (!t) return;
        const cols = [...h$('#histColSelect').selectedOptions].map(o => o.value);
        const only = h$('#histRowDiffOnly').checked;
        const LIMIT = 2000;
        const rows = t.rows.filter(r => !only || r.status !== 'same');
        const keyCols = t.key_columns;
        if (!rows.length) {
            h$('#histDetail').innerHTML = '<div class="history-empty">No rows to show for the current filter.</div>';
            return;
        }
        let html = '<table class="history-table"><thead><tr>' +
            keyCols.map(k => `<th rowspan="2">${esc(k)}</th>`).join('') + '<th rowspan="2">Status</th>' +
            cols.map(col => `<th class="grp" colspan="3">${esc(col)}</th>`).join('') + '</tr><tr>' +
            cols.map(() => '<th class="grp">A</th><th>B</th><th>Δ</th>').join('') + '</tr></thead><tbody>';
        html += rows.slice(0, LIMIT).map(r =>
            `<tr class="st-${esc(r.status)}">` +
            keyCols.map(k => `<td>${esc(fmt(r.key[k]))}</td>`).join('') + `<td>${badge(r.status)}</td>` +
            cols.map(col => {
                const v = r.values[col] || {};
                const cls = v.changed ? ' cell-changed' : '';
                return `<td class="num sep${cls}">${esc(fmt(v.a))}</td><td class="num${cls}">${esc(fmt(v.b))}</td><td class="num${cls}">${esc(fmtDelta(v.delta))}</td>`;
            }).join('') + '</tr>'
        ).join('');
        html += '</tbody></table>';
        if (rows.length > LIMIT) html += `<div class="history-note">Showing first ${LIMIT} of ${rows.length} rows.</div>`;
        h$('#histDetail').innerHTML = html;
    }

    function renderMeta() {
        const d = state.result;
        const rows = (d?.metadata || []).filter(m => m.key !== 'client_saved_at' && !m.key.startsWith('custom_column_definitions'));
        h$('#histMeta').innerHTML = rows.length
            ? `<table class="history-table"><thead><tr><th>Field</th><th>A: ${esc(runLabel(d.run_a))}</th><th>B: ${esc(runLabel(d.run_b))}</th></tr></thead><tbody>` +
              rows.map(m => `<tr class="${m.same ? '' : 'st-changed'}"><td>${esc(m.key)}</td><td>${esc(fmt(m.a))}</td><td>${esc(fmt(m.b))}</td></tr>`).join('') +
              '</tbody></table>'
            : '<div class="history-empty">No metadata.</div>';
    }

    // ------------------------------------------------------------- restore
    async function loadAIntoDashboard() {
        const run = h$('#histRunA').value;
        if (!run || !window.ILSHistorian) return;
        showError();
        try {
            const r = await fetch(`/api/historian/runs/${encodeURIComponent(run)}`);
            const d = await getJson(r);
            if (!r.ok) throw new Error(d.error || 'Could not load Run.');
            if (await window.ILSHistorian.restoreToDashboard(d)) {
                const disp = h$('#runNumberDisplay');
                if (disp) disp.value = d.run_number;
                window.ILSHistorian.toast(`Run ${d.run_number} loaded. Open the dashboard pages to view the saved results.`);
            }
        } catch (e) {
            showError(e.message);
        }
    }

    let filterTimer = null;
    const onFilterChange = () => {
        if (!state.result) return;
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => runCompare(), 250);
    };

    h$('#histRefresh').onclick = loadRuns;
    h$('#histMode').onchange = fillRunSelects;
    h$('#histCompare').onclick = () => { state.reactors = new Set(); runCompare({ resetKeys: true }); };
    h$('#histLoadA').onclick = loadAIntoDashboard;
    h$('#histReactor').onchange = onFilterChange;
    h$('#histFrom').onchange = onFilterChange;
    h$('#histTo').onchange = onFilterChange;
    h$('#histResetFilters').onclick = () => {
        h$('#histReactor').value = '';
        h$('#histFrom').value = '';
        h$('#histTo').value = '';
        onFilterChange();
    };
    h$('#histRowDiffOnly').onchange = renderRows;
    h$('#histColSelect').onchange = renderTable;
    h$('#histTableCompare').onclick = () => runCompare();
    document.querySelectorAll('#histTabs .table-tab').forEach(btn => {
        btn.onclick = () => {
            if (btn.disabled) return;
            state.activeTable = btn.dataset.table;
            runCompare({ resetKeys: true });
        };
    });
    loadRuns();
})();
