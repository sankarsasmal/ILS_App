/**
 * Plots Page - Scatter Plot Visualization for DHA Data Dashboard
 * Yield Table X vs Y scatter visualization with multi-select reactor filter and datetime range filter.
 * Supports per-reactor distinct colors and geometric point symbols.
 */

(function () {
    'use strict';

    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));

    // Standard Reactor Visual Configuration: Distinct Colors & Distinct Point Styles
    const REACTOR_THEME = {
        'R1': {
            label: 'R1',
            border: '#eb5e28',          // Warm Terracotta
            bg: 'rgba(235, 94, 40, 0.82)',
            pointStyle: 'circle',
            symbolName: 'Circle (●)',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#eb5e28" stroke="#ffffff" stroke-width="1.5" />'
        },
        'R2': {
            label: 'R2',
            border: '#2563eb',          // Royal Blue
            bg: 'rgba(37, 99, 235, 0.82)',
            pointStyle: 'triangle',
            symbolName: 'Triangle (▲)',
            svg: '<polygon points="8,2 14.5,13.5 1.5,13.5" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" />'
        },
        'R3': {
            label: 'R3',
            border: '#059669',          // Emerald Green
            bg: 'rgba(5, 150, 105, 0.82)',
            pointStyle: 'rect',
            symbolName: 'Square (■)',
            svg: '<rect x="2.5" y="2.5" width="11" height="11" fill="#059669" stroke="#ffffff" stroke-width="1.5" />'
        },
        'R4': {
            label: 'R4',
            border: '#7c3aed',          // Violet Purple
            bg: 'rgba(124, 58, 237, 0.82)',
            pointStyle: 'rectRot',
            symbolName: 'Diamond (◆)',
            svg: '<polygon points="8,1.5 14.5,8 8,14.5 1.5,8" fill="#7c3aed" stroke="#ffffff" stroke-width="1.5" />'
        },
        'R5': {
            label: 'R5',
            border: '#d97706',          // Amber Ochre
            bg: 'rgba(217, 119, 6, 0.82)',
            pointStyle: 'star',
            symbolName: 'Star (★)',
            svg: '<polygon points="8,1 10,6 15,6 11,10 13,15 8,12 3,15 5,10 1,6 6,6" fill="#d97706" stroke="#ffffff" stroke-width="1" />'
        },
        'R6': {
            label: 'R6',
            border: '#0891b2',          // Cyan Teal
            bg: 'rgba(8, 145, 178, 0.82)',
            pointStyle: 'cross',
            symbolName: 'Plus (+)',
            svg: '<line x1="8" y1="2" x2="8" y2="14" stroke="#0891b2" stroke-width="3" stroke-linecap="round" /><line x1="2" y1="8" x2="14" y2="8" stroke="#0891b2" stroke-width="3" stroke-linecap="round" />'
        },
        'R7': {
            label: 'R7',
            border: '#db2777',          // Deep Rose
            bg: 'rgba(219, 39, 119, 0.82)',
            pointStyle: 'crossRot',
            symbolName: 'Cross (✕)',
            svg: '<line x1="3" y1="3" x2="13" y2="13" stroke="#db2777" stroke-width="3" stroke-linecap="round" /><line x1="13" y1="3" x2="3" y2="13" stroke="#db2777" stroke-width="3" stroke-linecap="round" />'
        },
        'R8': {
            label: 'R8',
            border: '#475569',          // Slate Charcoal
            bg: 'rgba(71, 85, 105, 0.82)',
            pointStyle: 'rectRounded',
            symbolName: 'Rounded Square (▢)',
            svg: '<rect x="2.5" y="2.5" width="11" height="11" rx="3.5" fill="#475569" stroke="#ffffff" stroke-width="1.5" />'
        },
        'Default': {
            label: 'Other',
            border: '#c15f3e',
            bg: 'rgba(193, 95, 62, 0.82)',
            pointStyle: 'circle',
            symbolName: 'Circle',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#c15f3e" stroke="#ffffff" stroke-width="1.5" />'
        }
    };

    const STANDARD_REACTORS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];

    const FIC_MAPPING = { 1: 'FIC_1', 2: 'FIC_2', 3: 'FIC_3', 4: 'FIC_4', 5: 'FIC_5', 6: 'FIC_6', 7: 'FIC_7', 8: 'FIC_8' };
    const TEMPERATURE_MAPPING = { 1: 'TI_1', 2: 'TI_2', 3: 'TI_3', 4: 'TI_4', 5: 'TI_5', 6: 'TI_6', 7: 'TI_7', 8: 'TI_8' };
    const PRESSURE_MAPPING = { 1: 'PI_1', 2: 'PI_2', 3: 'PI_3', 4: 'PI_4', 5: 'PI_5', 6: 'PI_6', 7: 'PI_7', 8: 'PI_8' };

    // Internal state
    const plotState = {
        rows: [],
        columns: [],
        chart: null,
        availableColumns: [],
        selectedX: 'TOS(h)',
        selectedY: '',
        allKnownReactors: [...STANDARD_REACTORS],
        selectedReactors: new Set([...STANDARD_REACTORS]),
        fromDate: '',
        toDate: ''
    };

    function showError(message) {
        const errorEl = $('#plotError');
        if (!errorEl) return;
        if (!message) {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
        } else {
            errorEl.style.display = 'block';
            errorEl.textContent = message;
        }
    }

    function setStatus(text, ready = true) {
        const statusEl = $('#plotStatus');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.className = ready ? 'pill' : 'pill pending';
        }
    }

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
        } catch (e) { }
        return { carbon, mw };
    }

    function parseReactorNum(val) {
        if (val === null || val === undefined || val === '') return null;
        const clean = String(val).replace(/[Rr]/g, '').trim();
        const num = parseInt(clean, 10);
        return (num >= 1 && num <= 8) ? num : null;
    }

    function normalizeReactor(val) {
        if (val === null || val === undefined || val === '') return '';
        const s = String(val).trim();
        if (s === '0' || s === '0.0' || s.toLowerCase() === 'none' || s.toLowerCase() === 'unknown') return '';
        const match = s.match(/^[Rr]?([1-8])$/i);
        if (match) return 'R' + match[1];
        if (s.toUpperCase().startsWith('R')) return s.toUpperCase();
        return s;
    }

    function parseDate(dtStr) {
        if (!dtStr) return null;
        const text = String(dtStr).trim();
        const dmyMatch = text.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
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
        const iso = Date.parse(text.replace(' ', 'T'));
        return isNaN(iso) ? null : new Date(iso);
    }

    function activeReactorAt(value, reactorRows) {
        if (!value || !Array.isArray(reactorRows) || !reactorRows.length) return '';
        const sampleDate = parseDate(value);
        const sampleTime = sampleDate ? sampleDate.getTime() : null;
        if (sampleTime === null) return '';
        const timeline = reactorRows
            .map(row => {
                const dt = parseDate(row.DateTime);
                return { time: dt ? dt.getTime() : null, row };
            })
            .filter(x => x.time !== null)
            .sort((a, b) => a.time - b.time);
        const cols = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];
        for (let i = 0; i < timeline.length - 1; i += 1) {
            if (timeline[i].time <= sampleTime && sampleTime < timeline[i + 1].time) {
                return cols.filter(col => Number(timeline[i].row[col]) === 1).join(', ');
            }
        }
        return '';
    }

    function reconstructBaseRows(rawRows, carbon, mw, reactorRows) {
        return rawRows.map(row => {
            const dateVal = row.DateTime ?? row['Date/Time'] ?? '';
            let reactorVal = normalizeReactor(row.Reactor ?? row.Sampled_reactor);
            if (!reactorVal && reactorRows && reactorRows.length) {
                const ar = activeReactorAt(dateVal, reactorRows);
                if (ar) reactorVal = normalizeReactor(ar);
            }

            const rNum = parseReactorNum(reactorVal);
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
                    naphthaIn = (carbon !== 0) ? (carbonOut / (carbon / 100)) : naphthaOut;
                }
            }

            if (naphthaIn !== null && h2Out !== null && h2Out !== 0) {
                naphthaH2 = naphthaIn / h2Out;
            }

            return {
                DateTime: dateVal,
                'TOS[h]': row['TOS[h]'] ?? row.TOS ?? '',
                Reactor: reactorVal,
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
    }

    function getRowReactor(row) {
        const val = row.Reactor ?? row['Active Reactor'] ?? row.Sampled_reactor;
        const norm = normalizeReactor(val);
        return norm || 'Unknown';
    }

    /**
     * Enrich rows with Reactor from multiple sources if missing
     */
    function enrichRowsWithReactors(rows) {
        if (!Array.isArray(rows) || !rows.length) return rows;

        let reactorTimeline = [];
        let componentRows = [];
        try {
            const dashRaw = sessionStorage.getItem('dhaDashboardState') || localStorage.getItem('dhaDashboardState');
            if (dashRaw) {
                const parsed = JSON.parse(dashRaw);
                if (Array.isArray(parsed.reactorRows)) reactorTimeline = parsed.reactorRows;
                if (Array.isArray(parsed.r2)) componentRows = parsed.r2;
            }
        } catch (e) { }

        let onlineRows = [];
        try {
            const onlineRaw = sessionStorage.getItem('dhaOnlineState') || localStorage.getItem('dhaOnlineState');
            if (onlineRaw) {
                const parsed = JSON.parse(onlineRaw);
                if (Array.isArray(parsed.rows)) onlineRows = parsed.rows;
            }
        } catch (e) { }

        function findMatchingDateTime(dtStr, candidateList) {
            if (!dtStr || !candidateList.length) return null;
            const targetDate = parseDate(dtStr);
            if (!targetDate) return null;
            const targetTime = targetDate.getTime();
            let closest = null;
            let minDiff = 3600 * 1000 + 1;
            for (const cand of candidateList) {
                const cDate = parseDate(cand.DateTime ?? cand['Date/Time']);
                if (cDate) {
                    const diff = Math.abs(cDate.getTime() - targetTime);
                    if (diff <= 3600 * 1000 && diff < minDiff) {
                        minDiff = diff;
                        closest = cand;
                    }
                }
            }
            return closest;
        }

        return rows.map(row => {
            let r = normalizeReactor(row.Reactor || row['Active Reactor'] || row.Sampled_reactor);
            if (r) {
                row.Reactor = r;
                return row;
            }

            if (reactorTimeline.length && row.DateTime) {
                const ar = activeReactorAt(row.DateTime, reactorTimeline);
                if (ar) {
                    const normAr = normalizeReactor(ar);
                    if (normAr) {
                        row.Reactor = normAr;
                        return row;
                    }
                }
            }

            if (onlineRows.length && row.DateTime) {
                const matched = findMatchingDateTime(row.DateTime, onlineRows);
                if (matched) {
                    const matchedR = normalizeReactor(matched.Reactor || matched.Sampled_reactor);
                    if (matchedR) {
                        row.Reactor = matchedR;
                        return row;
                    }
                }
            }

            if (componentRows.length && row.DateTime) {
                const matched = findMatchingDateTime(row.DateTime, componentRows);
                if (matched) {
                    const matchedR = normalizeReactor(matched.Reactor || matched['Active Reactor']);
                    if (matchedR) {
                        row.Reactor = matchedR;
                        return row;
                    }
                }
            }

            return row;
        });
    }

    function isValidNumber(val) {
        if (val === null || val === undefined || val === '') return false;
        if (typeof val === 'string' && val.startsWith('ERROR')) return false;
        const num = Number(val);
        return Number.isFinite(num);
    }

    /**
     * Load Yield Table Data from sessionStorage or fallback calculate
     */
    async function loadYieldData() {
        setStatus('Loading...', false);
        showError('');

        // 1. Try reading from cached ils_yield_table_state
        try {
            const rawCached = sessionStorage.getItem('ils_yield_table_state');
            if (rawCached) {
                const cached = JSON.parse(rawCached);
                if (Array.isArray(cached.rows) && cached.rows.length > 0) {
                    plotState.rows = enrichRowsWithReactors(cached.rows);
                    plotState.columns = cached.columns || Object.keys(cached.rows[0]);
                    onDataLoaded();
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to parse ils_yield_table_state:', e);
        }

        // 2. Fallback: calculate on the fly from offline and online state
        try {
            let componentRows = [];
            let componentColumns = [];
            let reactorRows = [];
            const dashRaw = sessionStorage.getItem('dhaDashboardState') || localStorage.getItem('dhaDashboardState');
            if (dashRaw) {
                const dashState = JSON.parse(dashRaw);
                componentRows = dashState.r2 || dashState.table2_rows || dashState.table2Rows || [];
                componentColumns = dashState.c2 || dashState.table2_columns || dashState.table2Columns || [];
                reactorRows = dashState.reactorRows || [];
            }

            let onlineRows = [];
            const onlineRaw = sessionStorage.getItem('dhaOnlineState') || localStorage.getItem('dhaOnlineState');
            if (onlineRaw) {
                const onlineState = JSON.parse(onlineRaw);
                onlineRows = onlineState.rows || [];
            }

            if (componentRows.length > 0 && onlineRows.length > 0) {
                const { carbon, mw } = getActiveFeedCarbonAndMw();
                const baseRows = reconstructBaseRows(onlineRows, carbon, mw, reactorRows);

                const res = await fetch('/api/calculate-yield-table', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        carbon_rows: componentRows,
                        carbon_columns: componentColumns.length ? componentColumns : Object.keys(componentRows[0]),
                        base_rows: baseRows
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    plotState.rows = enrichRowsWithReactors(data.rows || []);
                    plotState.columns = data.columns || [];
                    try {
                        sessionStorage.setItem('ils_yield_table_state', JSON.stringify({
                            rows: plotState.rows,
                            columns: plotState.columns
                        }));
                    } catch (e) { }

                    if (plotState.rows.length > 0) {
                        onDataLoaded();
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to compute yield table for plots:', e);
        }

        // 3. No data available
        showEmptyNotice(true);
        setStatus('No Data', true);
    }

    function showEmptyNotice(show) {
        const emptyEl = $('#plotEmpty');
        const canvasEl = $('#scatterCanvas');
        const legendEl = $('#plotLegend');
        if (emptyEl) emptyEl.style.display = show ? 'block' : 'none';
        if (canvasEl) canvasEl.style.display = show ? 'none' : 'block';
        if (legendEl) legendEl.style.display = show ? 'none' : 'flex';
        if (show) {
            $('#kpiPlotPoints').textContent = '0';
            $('#kpiPlotReactors').textContent = '0';
            $('#kpiPlotX').textContent = '—';
            $('#kpiPlotY').textContent = '—';
        }
    }

    function onDataLoaded() {
        showEmptyNotice(false);
        setStatus('Ready', true);

        // Identify available numeric/time columns for plotting
        const nonPlottable = new Set(['File Name', 'UID', '_row_error', 'Reactor', 'Active Reactor', 'Sampled_reactor', 'Component']);
        const cols = (plotState.columns && plotState.columns.length > 0)
            ? plotState.columns
            : (plotState.rows.length ? Object.keys(plotState.rows[0]) : []);

        plotState.availableColumns = cols.filter(c => !nonPlottable.has(c));

        // Populate X and Y dropdowns
        populateDropdowns();

        // Populate multi-select reactor filter
        populateMultiSelectReactorFilter();

        // Render plot
        renderPlot();
    }

    /**
     * Populate X and Y dropdowns with mutual exclusion enforcement
     */
    function populateDropdowns() {
        const xSelect = $('#plotXSelect');
        const ySelect = $('#plotYSelect');
        if (!xSelect || !ySelect) return;

        const cols = plotState.availableColumns;
        if (!cols.length) {
            xSelect.innerHTML = '<option value="">No numeric columns available</option>';
            ySelect.innerHTML = '<option value="">No numeric columns available</option>';
            return;
        }

        // Set default selections
        if (!plotState.selectedX || !cols.includes(plotState.selectedX)) {
            plotState.selectedX = cols.includes('TOS(h)') ? 'TOS(h)' : cols[0];
        }

        if (!plotState.selectedY || !cols.includes(plotState.selectedY) || plotState.selectedY === plotState.selectedX) {
            const preferred = ['n-Hexane', 'C5+', 'Gas', 'H2_Consumption', 'Propane'];
            const foundPref = preferred.find(p => cols.includes(p) && p !== plotState.selectedX);
            plotState.selectedY = foundPref || cols.find(c => c !== plotState.selectedX) || cols[0];
        }

        renderDropdownOptions();
    }

    function renderDropdownOptions() {
        const xSelect = $('#plotXSelect');
        const ySelect = $('#plotYSelect');
        if (!xSelect || !ySelect) return;

        const cols = plotState.availableColumns;
        const currentX = plotState.selectedX;
        const currentY = plotState.selectedY;

        // Clean option generation without inline styles that break Windows rendering
        xSelect.innerHTML = cols.map(col => {
            const isSelected = col === currentX ? ' selected' : '';
            const isDisabled = col === currentY ? ' disabled' : '';
            return `<option value="${col}"${isSelected}${isDisabled}>${col}</option>`;
        }).join('');

        ySelect.innerHTML = cols.map(col => {
            const isSelected = col === currentY ? ' selected' : '';
            const isDisabled = col === currentX ? ' disabled' : '';
            return `<option value="${col}"${isSelected}${isDisabled}>${col}</option>`;
        }).join('');

        // Update KPIs
        $('#kpiPlotX').textContent = currentX || '—';
        $('#kpiPlotY').textContent = currentY || '—';
    }

    /**
     * Populate Multi-Select Reactor Filter (Checkboxes, Select All, Clear)
     */
    function populateMultiSelectReactorFilter() {
        const listContainer = $('#reactorCheckboxList');
        const btnText = $('#plotReactorBtnText');
        if (!listContainer) return;

        // Count data points per reactor
        const reactorCounts = {};
        plotState.rows.forEach(r => {
            const rVal = getRowReactor(r);
            if (rVal && rVal !== 'Unknown') {
                reactorCounts[rVal] = (reactorCounts[rVal] || 0) + 1;
            }
        });

        const allReactors = new Set([...STANDARD_REACTORS, ...Object.keys(reactorCounts)]);
        const sorted = Array.from(allReactors).sort((a, b) => {
            const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return na - nb;
        });

        plotState.allKnownReactors = sorted;

        // Initialize selectedReactors to all known reactors if empty
        if (!plotState.selectedReactors || plotState.selectedReactors.size === 0) {
            plotState.selectedReactors = new Set(sorted);
        }

        // Render checkbox list
        let html = '';
        sorted.forEach(r => {
            const count = reactorCounts[r] || 0;
            const theme = REACTOR_THEME[r] || REACTOR_THEME.Default;
            const isChecked = plotState.selectedReactors.has(r) ? ' checked' : '';
            const countLabel = count > 0 ? `${count} pts` : '0 pts';

            html += `
                <label class="reactor-check-item">
                    <input type="checkbox" value="${r}"${isChecked}>
                    <svg viewBox="0 0 16 16" width="14" height="14" style="vertical-align: middle;" aria-hidden="true">${theme.svg}</svg>
                    <span class="reactor-name"><b>${r}</b></span>
                    <span class="reactor-count-badge">${countLabel}</span>
                </label>
            `;
        });

        listContainer.innerHTML = html;
        updateReactorButtonLabel();

        // Wire change events on checkboxes
        $$('#reactorCheckboxList input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function () {
                const rVal = this.value;
                if (this.checked) {
                    plotState.selectedReactors.add(rVal);
                } else {
                    plotState.selectedReactors.delete(rVal);
                }
                updateReactorButtonLabel();
                renderPlot();
            });
        });
    }

    function updateReactorButtonLabel() {
        const btnText = $('#plotReactorBtnText');
        if (!btnText) return;

        const total = plotState.allKnownReactors.length;
        const selected = Array.from(plotState.selectedReactors);

        if (selected.length === total) {
            btnText.textContent = `All Reactors (${total})`;
        } else if (selected.length === 0) {
            btnText.textContent = 'No Reactors Selected';
        } else if (selected.length === 1) {
            btnText.textContent = `Reactor: ${selected[0]}`;
        } else if (selected.length <= 3) {
            btnText.textContent = `Reactors: ${selected.join(', ')}`;
        } else {
            btnText.textContent = `${selected.length} of ${total} Reactors`;
        }
    }

    /**
     * Filter rows based on Multi-Selected Reactors and DateTime range
     */
    function getFilteredRows() {
        let rows = plotState.rows;

        // 1. Multi-Select Reactor filter
        if (plotState.selectedReactors && plotState.selectedReactors.size > 0) {
            rows = rows.filter(r => {
                const rVal = getRowReactor(r);
                if (rVal === 'Unknown') {
                    // If all standard reactors are selected, include unassigned rows under R1
                    return plotState.selectedReactors.has('R1');
                }
                return plotState.selectedReactors.has(rVal);
            });
        } else {
            return []; // No reactors selected
        }

        // 2. DateTime filter
        const fromDate = plotState.fromDate ? new Date(plotState.fromDate) : null;
        const toDate = plotState.toDate ? new Date(plotState.toDate) : null;

        if (fromDate || toDate) {
            rows = rows.filter(r => {
                const dt = parseDate(r.DateTime);
                if (!dt) return false;
                if (fromDate && dt < fromDate) return false;
                if (toDate && dt > toDate) return false;
                return true;
            });
        }

        return rows;
    }

    /**
     * Render the Scatter Plot using Chart.js with distinct symbols and colors per reactor
     */
    function renderPlot() {
        const xCol = plotState.selectedX;
        const yCol = plotState.selectedY;

        if (!xCol || !yCol || xCol === yCol) {
            return;
        }

        const filteredRows = getFilteredRows();

        // Group points by reactor
        const reactorGroups = {};
        let totalPlottedPoints = 0;

        filteredRows.forEach(row => {
            const valX = row[xCol];
            const valY = row[yCol];

            if (!isValidNumber(valX) || !isValidNumber(valY)) return;

            let rName = getRowReactor(row);
            if (rName === 'Unknown') {
                rName = 'R1';
            }

            if (!reactorGroups[rName]) {
                reactorGroups[rName] = [];
            }

            reactorGroups[rName].push({
                x: Number(valX),
                y: Number(valY),
                dt: row.DateTime || '',
                reactor: rName,
                tos: row['TOS(h)'] !== undefined ? row['TOS(h)'] : ''
            });
            totalPlottedPoints++;
        });

        // Update KPIs
        $('#kpiPlotPoints').textContent = totalPlottedPoints;
        $('#kpiPlotReactors').textContent = Object.keys(reactorGroups).length;
        $('#kpiPlotX').textContent = xCol;
        $('#kpiPlotY').textContent = yCol;

        // Update Chart Title and Badge
        $('#plotChartTitle').textContent = `${yCol} vs ${xCol}`;
        $('#plotEyebrow').textContent = `SCATTER PLOT · ${yCol.toUpperCase()} VS ${xCol.toUpperCase()}`;

        const filterBadge = $('#plotBadge');
        if (filterBadge) {
            const parts = [];
            const total = plotState.allKnownReactors.length;
            if (plotState.selectedReactors.size === total) {
                parts.push('All Reactors');
            } else if (plotState.selectedReactors.size === 0) {
                parts.push('No Reactors Selected');
            } else {
                parts.push(`${plotState.selectedReactors.size} Reactors Active`);
            }
            if (plotState.fromDate || plotState.toDate) parts.push('Date Filter Active');
            filterBadge.textContent = parts.join(' · ');
            filterBadge.style.display = 'inline-block';
        }

        // Sort active reactors
        const sortedReactors = Object.keys(reactorGroups).sort((a, b) => {
            const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return na - nb;
        });

        // Build Chart.js datasets: EACH REACTOR GETS ITS OWN DISTINCT SYMBOL AND COLOR
        const datasets = sortedReactors.map(rName => {
            const theme = REACTOR_THEME[rName] || REACTOR_THEME.Default;
            return {
                label: rName,
                data: reactorGroups[rName],
                pointStyle: theme.pointStyle,          // Distinct symbol per reactor
                pointRadius: 6,
                pointHoverRadius: 9,
                pointBorderWidth: 2,
                borderColor: theme.border,             // Distinct color border
                backgroundColor: theme.bg,             // Distinct color fill
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: theme.border,
                pointHoverBorderWidth: 2.5
            };
        });

        // Render or Update Chart
        const canvas = $('#scatterCanvas');
        if (!canvas) return;

        if (plotState.chart) {
            plotState.chart.destroy();
            plotState.chart = null;
        }

        if (typeof Chart === 'undefined') {
            showError('Chart.js library failed to load.');
            return;
        }

        const ctx = canvas.getContext('2d');
        plotState.chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 250
                },
                plugins: {
                    legend: {
                        display: false // We use our custom interactive legend with SVG symbols
                    },
                    tooltip: {
                        backgroundColor: 'rgba(7, 26, 45, 0.94)',
                        titleColor: '#ffffff',
                        bodyColor: '#f1f5f9',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            weight: '700',
                            size: 13
                        },
                        bodyFont: {
                            size: 12
                        },
                        callbacks: {
                            title: function (items) {
                                if (!items.length) return '';
                                const pt = items[0].raw;
                                const theme = REACTOR_THEME[pt.reactor] || REACTOR_THEME.Default;
                                return `Reactor ${pt.reactor} (${theme.symbolName}) · ${pt.dt || ''}`;
                            },
                            label: function (item) {
                                const pt = item.raw;
                                const lines = [
                                    `${xCol}: ${pt.x.toFixed(3)}`,
                                    `${yCol}: ${pt.y.toFixed(3)}`
                                ];
                                if (pt.tos !== '' && pt.tos !== undefined && xCol !== 'TOS(h)' && yCol !== 'TOS(h)') {
                                    lines.push(`TOS: ${Number(pt.tos).toFixed(2)} h`);
                                }
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: xCol,
                            color: '#071a2d',
                            font: {
                                size: 13,
                                weight: '700',
                                family: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
                            },
                            padding: { top: 8 }
                        },
                        grid: {
                            color: 'rgba(7, 26, 45, 0.06)'
                        },
                        ticks: {
                            color: '#475569',
                            font: { size: 11 }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: yCol,
                            color: '#071a2d',
                            font: {
                                size: 13,
                                weight: '700',
                                family: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
                            },
                            padding: { bottom: 8 }
                        },
                        grid: {
                            color: 'rgba(7, 26, 45, 0.06)'
                        },
                        ticks: {
                            color: '#475569',
                            font: { size: 11 }
                        }
                    }
                }
            }
        });

        // Update custom interactive legend with symbols & colors
        renderCustomLegend(sortedReactors, reactorGroups);
    }

    /**
     * Render Custom Interactive Legend displaying both distinct geometric symbol and color
     */
    function renderCustomLegend(reactors, reactorGroups) {
        const legendContainer = $('#plotLegend');
        if (!legendContainer) return;

        if (!reactors.length) {
            legendContainer.innerHTML = '<span class="legend-title">No reactor data match active filters</span>';
            return;
        }

        let html = '<span class="legend-title">Reactors:</span>';
        reactors.forEach((rName, idx) => {
            const count = (reactorGroups[rName] || []).length;
            const theme = REACTOR_THEME[rName] || REACTOR_THEME.Default;
            const isVisible = plotState.chart ? plotState.chart.isDatasetVisible(idx) : true;
            const dimmedClass = isVisible ? '' : ' dimmed';

            html += `
                <div class="legend-chip${dimmedClass}" data-dataset-index="${idx}" title="Click to toggle visibility of ${rName} (${theme.symbolName})">
                    <svg viewBox="0 0 16 16" width="14" height="14" style="vertical-align: middle; flex-shrink: 0;" aria-hidden="true">${theme.svg}</svg>
                    <span><b>${rName}</b> (${count})</span>
                </div>
            `;
        });

        legendContainer.innerHTML = html;

        // Wire click handlers on legend chips
        $$('.legend-chip', legendContainer).forEach(chip => {
            chip.addEventListener('click', function () {
                const datasetIndex = parseInt(this.getAttribute('data-dataset-index'), 10);
                if (plotState.chart && !isNaN(datasetIndex)) {
                    const isVisible = plotState.chart.isDatasetVisible(datasetIndex);
                    if (isVisible) {
                        plotState.chart.hide(datasetIndex);
                        this.classList.add('dimmed');
                    } else {
                        plotState.chart.show(datasetIndex);
                        this.classList.remove('dimmed');
                    }
                }
            });
        });
    }

    /**
     * Setup Event Listeners
     */
    function setupEvents() {
        const xSelect = $('#plotXSelect');
        const ySelect = $('#plotYSelect');
        const reactorFilter = $('#plotReactorFilter');
        const reactorBtn = $('#plotReactorBtn');
        const reactorMenu = $('#plotReactorMenu');
        const selectAllBtn = $('#selectAllReactors');
        const clearAllBtn = $('#clearAllReactors');
        const fromInput = $('#plotFrom');
        const toInput = $('#plotTo');
        const clearDatesBtn = $('#plotClearDates');
        const exportBtn = $('#plotExportBtn');
        const pageRefreshBtn = $('#pageRefresh');

        // Mutual exclusion between X and Y
        if (xSelect) {
            xSelect.addEventListener('change', function () {
                const newX = this.value;
                if (!newX) return;
                plotState.selectedX = newX;

                if (plotState.selectedY === newX) {
                    const alt = plotState.availableColumns.find(c => c !== newX);
                    plotState.selectedY = alt || '';
                }

                renderDropdownOptions();
                renderPlot();
            });
        }

        if (ySelect) {
            ySelect.addEventListener('change', function () {
                const newY = this.value;
                if (!newY) return;
                plotState.selectedY = newY;

                if (plotState.selectedX === newY) {
                    const alt = plotState.availableColumns.find(c => c !== newY);
                    plotState.selectedX = alt || '';
                }

                renderDropdownOptions();
                renderPlot();
            });
        }

        // Multi-Select Reactor Dropdown Button & Menu
        if (reactorBtn && reactorMenu) {
            reactorBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                const list = $('#reactorCheckboxList');
                if (!list || !list.children.length) {
                    populateMultiSelectReactorFilter();
                }
                const isOpen = reactorMenu.classList.toggle('open');
                reactorBtn.classList.toggle('open', isOpen);
                reactorBtn.setAttribute('aria-expanded', String(isOpen));
            });

            reactorMenu.addEventListener('click', function (e) {
                e.stopPropagation();
            });

            document.addEventListener('click', function () {
                reactorMenu.classList.remove('open');
                reactorBtn.classList.remove('open');
                reactorBtn.setAttribute('aria-expanded', 'false');
            });
        }

        // Select All / Clear All Reactors
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', function () {
                $$('#reactorCheckboxList input[type="checkbox"]').forEach(cb => {
                    cb.checked = true;
                    plotState.selectedReactors.add(cb.value);
                });
                updateReactorButtonLabel();
                renderPlot();
            });
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', function () {
                $$('#reactorCheckboxList input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
                plotState.selectedReactors.clear();
                updateReactorButtonLabel();
                renderPlot();
            });
        }

        // DateTime filters
        if (fromInput) {
            fromInput.addEventListener('change', function () {
                plotState.fromDate = this.value;
                renderPlot();
            });
        }

        if (toInput) {
            toInput.addEventListener('change', function () {
                plotState.toDate = this.value;
                renderPlot();
            });
        }

        if (clearDatesBtn) {
            clearDatesBtn.addEventListener('click', function () {
                if (fromInput) fromInput.value = '';
                if (toInput) toInput.value = '';
                plotState.fromDate = '';
                plotState.toDate = '';
                renderPlot();
            });
        }

        // Export Chart to PNG
        if (exportBtn) {
            exportBtn.addEventListener('click', function () {
                const canvas = $('#scatterCanvas');
                if (!canvas || !plotState.chart) {
                    alert('No plot available to export.');
                    return;
                }
                try {
                    const link = document.createElement('a');
                    const xClean = (plotState.selectedX || 'X').replace(/[^a-zA-Z0-9_-]/g, '_');
                    const yClean = (plotState.selectedY || 'Y').replace(/[^a-zA-Z0-9_-]/g, '_');
                    link.download = `scatter_${yClean}_vs_${xClean}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (e) {
                    console.error('Failed to export plot PNG:', e);
                    alert('Could not export chart as PNG.');
                }
            });
        }

        // Page refresh / Reset
        if (pageRefreshBtn) {
            pageRefreshBtn.addEventListener('click', function () {
                loadYieldData();
            });
        }

        // Listen for storage changes from other tabs
        window.addEventListener('storage', function (e) {
            if (e.key === 'ils_yield_table_state' || e.key === 'dhaOnlineState' || e.key === 'dhaDashboardState') {
                loadYieldData();
            }
        });
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        setupEvents();
        loadYieldData();
    });

})();
