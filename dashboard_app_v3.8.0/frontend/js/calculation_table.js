const FIC_MAPPING = {
    1: "10i1FIC01", 2: "10i1FIC02", 3: "10i1FIC03", 4: "10i1FIC04",
    5: "10i2FIC01", 6: "10i2FIC02", 7: "10i2FIC03", 8: "10i2FIC04"
};
const TEMPERATURE_MAPPING = {
    1: "10i1TIC02", 2: "10i1TIC02", 3: "10i1TIC02", 4: "10i1TIC02",
    5: "10i2TIC02", 6: "10i2TIC02", 7: "10i2TIC02", 8: "10i2TIC02"
};
const PRESSURE_MAPPING = {
    1: "10i1PIC01", 2: "10i1PIC01", 3: "10i1PIC01", 4: "10i1PIC01",
    5: "10i2PIC01", 6: "10i2PIC01", 7: "10i2PIC01", 8: "10i2PIC01"
};

const calcState = {
    allRows: [],
    columns: [],
    sourceFile: '',
    activeSubtab: 'base_table'
};

function getActiveFeedCarbonAndMw() {
    let carbon = 83.61;
    let mw = 88.55;
    try {
        const raw = sessionStorage.getItem('ils_feed_properties') || sessionStorage.getItem('runPlanDashboardState');
        if (raw) {
            const data = JSON.parse(raw);
            const rows = Array.isArray(data) ? data : (data.feedRows || []);
            if (rows.length > 0 && rows[0].value !== undefined && rows[0].value !== '') {
                const c = parseFloat(rows[0].value);
                if (!isNaN(c)) carbon = c;
            }
            if (rows.length > 2 && rows[2].value !== undefined && rows[2].value !== '') {
                const m = parseFloat(rows[2].value);
                if (!isNaN(m)) mw = m;
            }
        }
    } catch (e) {}
    return { carbon, mw };
}

function parseReactorNum(val) {
    if (val === null || val === undefined || val === '') return null;
    const clean = String(val).replace(/[Rr]/g, '').trim();
    const num = parseInt(clean, 10);
    return (num >= 1 && num <= 8) ? num : null;
}

function reconstructBaseRows(rawRows, carbon, mw) {
    const finalCols = [
        'DateTime', 'Reactor', 'ESTD_H2', 'ESTD_N2', 'N2[SLPH]',
        'Temperature', 'Pressure', 'Naphtha_online', 'H2_out',
        'Naphtha_out', 'Carbon_out', 'Naphtha_in', 'Naphtha/H2'
    ];

    const processed = rawRows.map(row => {
        const rNum = parseReactorNum(row.Reactor ?? row.Sampled_reactor);
        const ficCol = rNum ? FIC_MAPPING[rNum] : null;
        const tempCol = rNum ? TEMPERATURE_MAPPING[rNum] : null;
        const pressCol = rNum ? PRESSURE_MAPPING[rNum] : null;

        const n2Slph = (ficCol && row[ficCol] !== undefined && row[ficCol] !== null && row[ficCol] !== '') ? Number(row[ficCol]) : null;
        const temp = (tempCol && row[tempCol] !== undefined && row[tempCol] !== null && row[tempCol] !== '') ? Number(row[tempCol]) : null;
        const press = (pressCol && row[pressCol] !== undefined && row[pressCol] !== null && row[pressCol] !== '') ? Number(row[pressCol]) : null;

        const estdH2 = (row.ESTD_H2 !== undefined && row.ESTD_H2 !== null && row.ESTD_H2 !== '') ? Number(row.ESTD_H2) : null;
        const estdN2 = (row.ESTD_N2 !== undefined && row.ESTD_N2 !== null && row.ESTD_N2 !== '') ? Number(row.ESTD_N2) : null;

        let naphthaOnline = null;
        let h2Out = null;
        let naphthaOut = null;
        let carbonOut = null;
        let naphthaIn = null;
        let naphthaH2 = null;

        if (estdH2 !== null && estdN2 !== null) {
            naphthaOnline = 100 - (estdH2 + estdN2);

            if (n2Slph !== null && estdN2 !== 0) {
                const n2Ratio = estdN2 / 100;
                const h2Ratio = estdH2 / 100;
                const naphthaRatio = naphthaOnline / 100;

                h2Out = (n2Slph / n2Ratio) * h2Ratio * 0.0416 * 2;
                naphthaOut = (n2Slph / n2Ratio) * naphthaRatio * 0.0416 * mw;
                carbonOut = (naphthaOut * carbon) / 100;
                naphthaIn = (carbonOut * carbon) / 100;
            }

            if (estdH2 !== 0) {
                naphthaH2 = (naphthaOnline * mw) / (estdH2 * 2);
            }
        }

        const dateVal = row.DateTime ?? row['Date/Time'] ?? '';
        const reactorVal = row.Reactor ?? row.Sampled_reactor ?? '';

        return {
            DateTime: dateVal,
            Reactor: reactorVal,
            'Date/Time': dateVal,
            Sampled_reactor: reactorVal,
            ESTD_H2: estdH2,
            ESTD_N2: estdN2,
            'N2[SLPH]': n2Slph,
            Temperature: temp,
            Pressure: press,
            Naphtha_online: naphthaOnline,
            H2_out: h2Out,
            Naphtha_out: naphthaOut,
            Carbon_out: carbonOut,
            Naphtha_in: naphthaIn,
            'Naphtha/H2': naphthaH2
        };
    });

    return { columns: finalCols, rows: processed };
}

const calc$ = selector => document.querySelector(selector);

const formatCalcValue = value => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
    const num = Number(value);
    if (!isNaN(num) && String(value).trim() !== '' && !String(value).includes('-') && !String(value).includes(':')) {
        return Number.isInteger(num) ? String(num) : num.toFixed(2);
    }
    return String(value);
};

function parseCalcDateTime(val) {
    if (!val) return null;
    const str = String(val).trim();
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (isoMatch) {
        return new Date(
            Number(isoMatch[1]),
            Number(isoMatch[2]) - 1,
            Number(isoMatch[3]),
            Number(isoMatch[4]),
            Number(isoMatch[5]),
            Number(isoMatch[6] || 0)
        );
    }
    const dmyMatch = str.match(/^(\d{2})[./-](\d{2})[./-](\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (dmyMatch) {
        return new Date(
            Number(dmyMatch[3]),
            Number(dmyMatch[2]) - 1,
            Number(dmyMatch[1]),
            Number(dmyMatch[4]),
            Number(dmyMatch[5]),
            Number(dmyMatch[6] || 0)
        );
    }
    const d = new Date(str.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseFilterTimestamp(val) {
    if (!val) return null;
    const d = parseCalcDateTime(val) || new Date(val);
    const t = d ? d.getTime() : NaN;
    return Number.isNaN(t) ? null : t;
}

function showCalcError(msg = '') {
    const el = calc$('#calcError');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('show', Boolean(msg));
}

function updateKpis() {
    if (calc$('#kpiRecords')) calc$('#kpiRecords').textContent = calcState.allRows.length;
    if (calc$('#kpiActiveParams')) calc$('#kpiActiveParams').textContent = calcState.allRows.length ? (calcState.columns.length || 13) : 0;
    if (calc$('#kpiExcludedParams')) calc$('#kpiExcludedParams').textContent = calcState.allRows.length ? 8 : 0;
    if (calc$('#kpiSource')) {
        if (calcState.sourceFile) {
            calc$('#kpiSource').textContent = calcState.sourceFile.split(/[\\/]/).pop();
            calc$('#kpiSource').title = calcState.sourceFile;
        } else if (calcState.allRows.length) {
            calc$('#kpiSource').textContent = 'Online Sync';
        } else {
            calc$('#kpiSource').textContent = '—';
        }
    }
}

function renderReactorFilter() {
    const filterEl = calc$('#calcReactorFilter');
    if (!filterEl) return;
    const current = filterEl.value;
    const reactors = [...new Set(calcState.allRows.map(r => String(r.Reactor ?? r.Sampled_reactor ?? '')).filter(Boolean))].sort();
    filterEl.innerHTML = '<option value="">All reactors</option>' + reactors.map(r => `<option value="${r}"${r === current ? ' selected' : ''}>${r}</option>`).join('');
}

function renderBaseTable() {
    const thead = calc$('#calcThead');
    const tbody = calc$('#calcTbody');
    const empty = calc$('#calcEmpty');
    const badge = calc$('#calcDateBadge');
    if (!thead || !tbody) return;

    if (!calcState.allRows.length || !calcState.columns.length) {
        thead.innerHTML = '';
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        if (badge) badge.textContent = '';
        return;
    }

    const query = (calc$('#calcSearch')?.value || '').toLowerCase().trim();
    const reactor = calc$('#calcReactorFilter')?.value || '';
    const fromVal = calc$('#calcFrom')?.value || '';
    const toVal = calc$('#calcTo')?.value || '';

    const fromTime = parseFilterTimestamp(fromVal);
    let toTime = parseFilterTimestamp(toVal);
    if (toTime !== null && toVal.length === 16) {
        toTime += 59999;
    }

    const filtered = calcState.allRows.filter(row => {
        const rVal = String(row.Reactor ?? row.Sampled_reactor ?? '');
        if (reactor && rVal !== reactor) return false;

        if (fromTime !== null || toTime !== null) {
            const rowDt = parseCalcDateTime(row.DateTime || row['Date/Time']);
            const rowTime = rowDt ? rowDt.getTime() : null;
            if (rowTime !== null) {
                if (fromTime !== null && rowTime < fromTime) return false;
                if (toTime !== null && rowTime > toTime) return false;
            }
        }

        if (query) {
            return Object.values(row).join(' ').toLowerCase().includes(query);
        }
        return true;
    });

    thead.innerHTML = calcState.columns.map(col => `<th>${col}</th>`).join('');
    tbody.innerHTML = filtered.map(row => {
        const cells = calcState.columns.map(col => {
            const val = row[col];
            if (col === 'DateTime' || col === 'Date/Time') {
                return `<td style="font-weight: 600; white-space: nowrap;">${val ?? ''}</td>`;
            }
            if (col === 'Reactor' || col === 'Sampled_reactor') {
                return `<td style="text-align: center; font-weight: 700; color: var(--primary-accent, #2563eb);">${val ?? ''}</td>`;
            }
            return `<td style="text-align: center;">${formatCalcValue(val)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    if (empty) empty.style.display = filtered.length ? 'none' : 'block';

    if (badge) {
        if (fromVal || toVal || query || reactor) {
            badge.textContent = `Showing ${filtered.length} of ${calcState.allRows.length} records`;
        } else {
            badge.textContent = `${calcState.allRows.length} records`;
        }
    }
}

function loadFromOnlineState() {
    try {
        const raw = sessionStorage.getItem('dhaOnlineState');
        if (!raw) {
            calcState.allRows = [];
            calcState.columns = [];
            calcState.sourceFile = '';
            updateKpis();
            renderReactorFilter();
            renderBaseTable();
            if (calc$('#calcSummary')) {
                calc$('#calcSummary').textContent = 'No Online Analysis data loaded yet. Please import or load data in Online Analysis.';
            }
            return false;
        }
        const onlineState = JSON.parse(raw);
        if (!onlineState || !Array.isArray(onlineState.rows) || !onlineState.rows.length) {
            calcState.allRows = [];
            calcState.columns = [];
            calcState.sourceFile = '';
            updateKpis();
            renderReactorFilter();
            renderBaseTable();
            if (calc$('#calcSummary')) {
                calc$('#calcSummary').textContent = 'No Online Analysis data loaded yet. Please import or load data in Online Analysis.';
            }
            return false;
        }

        const { carbon, mw } = getActiveFeedCarbonAndMw();
        const reconstructed = reconstructBaseRows(onlineState.rows, carbon, mw);

        calcState.columns = reconstructed.columns;
        calcState.allRows = reconstructed.rows;
        calcState.sourceFile = onlineState.path || '';

        // Restore date filters if present
        if (onlineState.from && calc$('#calcFrom')) calc$('#calcFrom').value = onlineState.from;
        if (onlineState.to && calc$('#calcTo')) calc$('#calcTo').value = onlineState.to;

        const sharedDates = JSON.parse(sessionStorage.getItem('dhaDateTimeFilter') || 'null');
        if (sharedDates) {
            if (sharedDates.from && calc$('#calcFrom')) calc$('#calcFrom').value = sharedDates.from;
            if (sharedDates.to && calc$('#calcTo')) calc$('#calcTo').value = sharedDates.to;
        }

        if (calc$('#calcSummary')) {
            const fileName = calcState.sourceFile ? calcState.sourceFile.split(/[\\/]/).pop() : 'Online Analysis';
            calc$('#calcSummary').textContent = `Connected with Online Analysis (${fileName}) · ${calcState.allRows.length} records · Base Table reconstructed (${calcState.columns.length} columns displayed)`;
        }

        updateKpis();
        renderReactorFilter();
        renderBaseTable();
        return true;
    } catch (err) {
        console.error('Failed to load online state for Base table:', err);
        return false;
    }
}

async function syncDirectFromFile() {
    showCalcError();
    const btn = calc$('#calcSyncBtn');
    const oldText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Syncing...';
    }
    if (calc$('#calcStatus')) calc$('#calcStatus').textContent = 'Syncing...';

    try {
        // 1. Try reading directly from Online Analysis session storage first
        if (loadFromOnlineState()) {
            if (calc$('#calcStatus')) calc$('#calcStatus').textContent = 'Ready';
            return;
        }

        // 2. If session storage has no online data, check if backend has an active online file loaded
        const { carbon, mw } = getActiveFeedCarbonAndMw();
        const res = await fetch('/api/process-calculation-base', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                carbon: carbon,
                molecular_weight: mw
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.rows) && data.rows.length) {
                calcState.columns = data.columns;
                calcState.allRows = data.rows;
                calcState.sourceFile = data.source_file || '';

                updateKpis();
                renderReactorFilter();
                renderBaseTable();

                if (calc$('#calcSummary')) {
                    const fileName = calcState.sourceFile ? calcState.sourceFile.split(/[\\/]/).pop() : 'Online Analysis';
                    calc$('#calcSummary').textContent = `Connected with Online Analysis (${fileName}) · ${data.record_count} records · Base Table reconstructed (${calcState.columns.length} active columns)`;
                }
                if (calc$('#calcStatus')) calc$('#calcStatus').textContent = 'Ready';
                return;
            }
        }

        // Neither session storage nor backend active online file is available
        showCalcError('No Online Analysis data loaded yet. Please import or load a SystemTxt file on the Online Analysis page first.');
        if (calc$('#calcStatus')) calc$('#calcStatus').textContent = 'Ready';
    } catch (err) {
        showCalcError(err.message || 'Failed to sync with Online Analysis.');
        if (calc$('#calcStatus')) calc$('#calcStatus').textContent = 'Failed';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = oldText || 'Sync from Online Analysis';
        }
    }
}

function exportBaseTableCsv() {
    if (!calcState.allRows.length || !calcState.columns.length) {
        showCalcError('No data available to export.');
        return;
    }

    const header = calcState.columns.join(',');
    const rows = calcState.allRows.map(row =>
        calcState.columns.map(col => {
            const val = row[col] ?? '';
            const str = String(val).replace(/"/g, '""');
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        }).join(',')
    );

    const csvContent = [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Base_Table_Reactor_Conditions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function switchSubtab(tabName) {
    calcState.activeSubtab = tabName;
    document.querySelectorAll('.table-tabs .table-tab').forEach(btn => {
        const isActive = btn.dataset.subtab === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    const basePanel = calc$('#baseTablePanel');
    if (basePanel) {
        basePanel.hidden = (tabName !== 'base_table');
    }
}

function formatTwoDecimals(val) {
    if (val === null || val === undefined || val === '') return '—';
    const num = Number(val);
    if (!isNaN(num) && Number.isFinite(num)) {
        return num.toFixed(2);
    }
    return String(val);
}

function renderFeedProperties(feedRows) {
    if (!Array.isArray(feedRows) || !feedRows.length) return;

    // First three rows: Row 0 -> Carbon, Row 1 -> Hydrogen, Row 2 -> Molecular Weight
    const getProp = (idx, nameKey) => {
        if (feedRows.length > idx && feedRows[idx]) {
            const r = feedRows[idx];
            if (r.component && (!nameKey || r.component.toLowerCase().includes(nameKey.toLowerCase()))) {
                return r;
            }
        }
        if (nameKey) {
            const found = feedRows.find(r => r.component && r.component.toLowerCase().includes(nameKey.toLowerCase()));
            if (found) return found;
        }
        return feedRows[idx] || null;
    };

    const carbon = getProp(0, 'carbon');
    const hydrogen = getProp(1, 'hydrogen');
    const mw = getProp(2, 'molecular');

    if (carbon) {
        const valEl = calc$('#calcFeedCarbonVal');
        const unitEl = calc$('#calcFeedCarbonUnit');
        if (valEl) valEl.textContent = formatTwoDecimals(carbon.value);
        if (unitEl) unitEl.textContent = carbon.unit || '';
    }

    if (hydrogen) {
        const valEl = calc$('#calcFeedHydrogenVal');
        const unitEl = calc$('#calcFeedHydrogenUnit');
        if (valEl) valEl.textContent = formatTwoDecimals(hydrogen.value);
        if (unitEl) unitEl.textContent = hydrogen.unit || '';
    }

    if (mw) {
        const valEl = calc$('#calcFeedMWVal');
        const unitEl = calc$('#calcFeedMWUnit');
        if (valEl) valEl.textContent = formatTwoDecimals(mw.value);
        if (unitEl) unitEl.textContent = mw.unit || '';
    }
}

async function loadFeedProperties() {
    // 1. Try reading from sessionStorage first
    try {
        const explicit = sessionStorage.getItem('ils_feed_properties');
        if (explicit) {
            const parsed = JSON.parse(explicit);
            if (Array.isArray(parsed) && parsed.length) {
                renderFeedProperties(parsed);
                return;
            }
        }
        const rpStateRaw = sessionStorage.getItem('runPlanDashboardState');
        if (rpStateRaw) {
            const rpState = JSON.parse(rpStateRaw);
            if (rpState && Array.isArray(rpState.feedRows) && rpState.feedRows.length) {
                renderFeedProperties(rpState.feedRows);
                return;
            }
        }
    } catch (e) {}

    // 2. Fetch from backend API
    try {
        const res = await fetch('/api/feed-properties');
        if (res.ok) {
            const data = await res.json();
            const rows = data.rows || data.all_rows || [];
            if (Array.isArray(rows) && rows.length) {
                renderFeedProperties(rows);
                try {
                    sessionStorage.setItem('ils_feed_properties', JSON.stringify(rows));
                } catch (e) {}
            }
        }
    } catch (err) {
        console.warn('Could not load feed properties:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Attempt to load from Online Analysis session state
    const hasData = loadFromOnlineState();
    if (!hasData) {
        calcState.allRows = [];
        calcState.columns = [];
        updateKpis();
        renderReactorFilter();
        renderBaseTable();
        if (calc$('#calcSummary')) {
            calc$('#calcSummary').textContent = 'No Online Analysis data loaded yet. Please import or load data in Online Analysis.';
        }
    }

    // Load Synthetic Feed Analysis properties (Carbon, Hydrogen, Molecular Weight)
    loadFeedProperties();

    // 2. Wire event listeners
    if (calc$('#calcSearch')) calc$('#calcSearch').oninput = renderBaseTable;
    if (calc$('#calcReactorFilter')) calc$('#calcReactorFilter').onchange = renderBaseTable;
    if (calc$('#calcFrom')) calc$('#calcFrom').oninput = renderBaseTable;
    if (calc$('#calcTo')) calc$('#calcTo').oninput = renderBaseTable;

    if (calc$('#calcClearDates')) {
        calc$('#calcClearDates').onclick = () => {
            if (calc$('#calcFrom')) calc$('#calcFrom').value = '';
            if (calc$('#calcTo')) calc$('#calcTo').value = '';
            renderBaseTable();
        };
    }

    if (calc$('#calcSyncBtn')) {
        calc$('#calcSyncBtn').onclick = syncDirectFromFile;
    }

    if (calc$('#calcExportCsv')) {
        calc$('#calcExportCsv').onclick = exportBaseTableCsv;
    }

    // Sub-tab button wiring
    document.querySelectorAll('.table-tabs .table-tab').forEach(btn => {
        btn.onclick = () => switchSubtab(btn.dataset.subtab);
    });

    // Cross-tab / storage updates
    window.addEventListener('storage', e => {
        if (e.key === 'dhaOnlineState') {
            loadFromOnlineState();
        }
        if (e.key === 'ils_feed_properties' || e.key === 'runPlanDashboardState') {
            loadFeedProperties();
        }
    });
});

