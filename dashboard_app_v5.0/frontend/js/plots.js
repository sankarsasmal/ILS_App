/**
 * Plots Page - Scatter Plot Visualization for DHA Data Dashboard
 * Yield Table and Base Table X vs Y scatter visualization with multi-select reactor filter
 * and datetime range filter.
 * Supports per-reactor distinct colors and geometric point symbols.
 * Allows selecting single Y-axis parameter from either Yield Table or Base Table tags.
 */

(function () {
    'use strict';

    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));

    // Standard Reactor Visual Configuration: all markers are circles, distinguished by
    // border color and fill transparency (alpha) per reactor.
    const REACTOR_THEME = {
        'R1': {
            label: 'R1',
            border: '#eb5e28',          // Warm Terracotta
            bg: 'rgba(235, 94, 40, 0.92)',
            pointStyle: 'circle',
            symbolName: 'Circle · 92% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#eb5e28" fill-opacity="0.92" stroke="#eb5e28" stroke-width="1.5" />'
        },
        'R2': {
            label: 'R2',
            border: '#2563eb',          // Royal Blue
            bg: 'rgba(37, 99, 235, 0.80)',
            pointStyle: 'circle',
            symbolName: 'Circle · 80% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#2563eb" fill-opacity="0.80" stroke="#2563eb" stroke-width="1.5" />'
        },
        'R3': {
            label: 'R3',
            border: '#059669',          // Emerald Green
            bg: 'rgba(5, 150, 105, 0.68)',
            pointStyle: 'circle',
            symbolName: 'Circle · 68% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#059669" fill-opacity="0.68" stroke="#059669" stroke-width="1.5" />'
        },
        'R4': {
            label: 'R4',
            border: '#7c3aed',          // Violet Purple
            bg: 'rgba(124, 58, 237, 0.56)',
            pointStyle: 'circle',
            symbolName: 'Circle · 56% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#7c3aed" fill-opacity="0.56" stroke="#7c3aed" stroke-width="1.5" />'
        },
        'R5': {
            label: 'R5',
            border: '#d97706',          // Amber Ochre
            bg: 'rgba(217, 119, 6, 0.44)',
            pointStyle: 'circle',
            symbolName: 'Circle · 44% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#d97706" fill-opacity="0.44" stroke="#d97706" stroke-width="1.5" />'
        },
        'R6': {
            label: 'R6',
            border: '#0891b2',          // Cyan Teal
            bg: 'rgba(8, 145, 178, 0.32)',
            pointStyle: 'circle',
            symbolName: 'Circle · 32% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#0891b2" fill-opacity="0.32" stroke="#0891b2" stroke-width="1.5" />'
        },
        'R7': {
            label: 'R7',
            border: '#db2777',          // Deep Rose
            bg: 'rgba(219, 39, 119, 0.22)',
            pointStyle: 'circle',
            symbolName: 'Circle · 22% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#db2777" fill-opacity="0.22" stroke="#db2777" stroke-width="1.5" />'
        },
        'R8': {
            label: 'R8',
            border: '#475569',          // Slate Charcoal
            bg: 'rgba(71, 85, 105, 0.14)',
            pointStyle: 'circle',
            symbolName: 'Circle · 14% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#475569" fill-opacity="0.14" stroke="#475569" stroke-width="1.5" />'
        },
        'Default': {
            label: 'Other',
            border: '#c15f3e',
            bg: 'rgba(193, 95, 62, 0.5)',
            pointStyle: 'circle',
            symbolName: 'Circle · 50% fill',
            svg: '<circle cx="8" cy="8" r="5.5" fill="#c15f3e" fill-opacity="0.5" stroke="#c15f3e" stroke-width="1.5" />'
        }
    };

    const STANDARD_REACTORS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'];

    const FIC_MAPPING = {
        1: '10i1FIC01', 2: '10i1FIC02', 3: '10i1FIC03', 4: '10i1FIC04',
        5: '10i2FIC01', 6: '10i2FIC02', 7: '10i2FIC03', 8: '10i2FIC04'
    };
    const TEMPERATURE_MAPPING = {
        1: '10i1TIC02', 2: '10i1TIC02', 3: '10i1TIC02', 4: '10i1TIC02',
        5: '10i2TIC02', 6: '10i2TIC02', 7: '10i2TIC02', 8: '10i2TIC02'
    };
    const PRESSURE_MAPPING = {
        1: '10i1PIC01', 2: '10i1PIC01', 3: '10i1PIC01', 4: '10i1PIC01',
        5: '10i2PIC01', 6: '10i2PIC01', 7: '10i2PIC01', 8: '10i2PIC01'
    };

    // Base Table column tags under Calculation Table page
    const BASE_TABLE_NUMERIC_COLS = [
        'Temperature',
        'Pressure',
        'N2[SLPH]',
        'Naphtha_online',
        'H2_out',
        'Naphtha_out',
        'Carbon_out',
        'Naphtha_in',
        'Naphtha/H2',
        'ESTD_H2',
        'ESTD_N2',
        'TOS[h]'
    ];

    const BASE_TABLE_LABELS = {
        'Temperature': 'Temperature [°C]',
        'Pressure': 'Pressure [bar]',
        'N2[SLPH]': 'N2 [SLPH]',
        'Naphtha_online': 'Naphtha_online [mol%]',
        'H2_out': 'H2_out [g/h]',
        'Naphtha_out': 'Naphtha_out [g/h]',
        'Carbon_out': 'Carbon_out [wt%]',
        'Naphtha_in': 'Naphtha_in [g/h]',
        'Naphtha/H2': 'Naphtha/H2 [w/w]',
        'ESTD_H2': 'ESTD_H2 [mol%]',
        'ESTD_N2': 'ESTD_N2 [mol%]',
        'TOS[h]': 'TOS [h]'
    };

    // Table-3 Octane Table column tags from Offline Analysis
    const TABLE3_NUMERIC_COLS = [
        'Lin-RON',
        'Lin-MON',
        'Cal-RON',
        'Cal-MON',
        'TOS(h)'
    ];

    const TABLE3_LABELS = {
        'Lin-RON': 'Lin-RON',
        'Lin-MON': 'Lin-MON',
        'Cal-RON': 'Cal-RON',
        'Cal-MON': 'Cal-MON',
        'TOS(h)': 'TOS(h)'
    };

    function getParamLabel(param) {
        if (!param) return '—';
        return BASE_TABLE_LABELS[param] || TABLE3_LABELS[param] || param;
    }

    // Internal state - strictly single Y axis
    const plotState = {
        rows: [],
        columns: [],
        baseRows: [],
        table3Rows: [],
        chart: null,
        availableColumns: [],
        selectedX: 'TOS(h)',
        selectedY: '',
        allKnownReactors: [...STANDARD_REACTORS],
        selectedReactors: new Set([...STANDARD_REACTORS]),
        fromDate: '',
        toDate: '',
        xMin: null,
        xMax: null,
        yMin: null,
        yMax: null
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

    function findMatchingDateTime(dtStr, candidateList) {
        if (!dtStr || !candidateList || !candidateList.length) return null;
        const targetDate = parseDate(dtStr);
        if (!targetDate) return null;
        const targetTime = targetDate.getTime();
        let closest = null;
        let minDiff = 3600 * 1000 + 1; // 1-hour window
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

            const n2Slph = (row['N2[SLPH]'] !== undefined && row['N2[SLPH]'] !== null && row['N2[SLPH]'] !== '')
                ? Number(row['N2[SLPH]'])
                : ((ficCol && row[ficCol] !== undefined && row[ficCol] !== null && row[ficCol] !== '')
                    ? Number(row[ficCol])
                    : (row['FIC_' + rNum] !== undefined ? Number(row['FIC_' + rNum]) : null));

            const temp = (row.Temperature !== undefined && row.Temperature !== null && row.Temperature !== '')
                ? Number(row.Temperature)
                : ((tempCol && row[tempCol] !== undefined && row[tempCol] !== null && row[tempCol] !== '')
                    ? Number(row[tempCol])
                    : (row['TI_' + rNum] !== undefined ? Number(row['TI_' + rNum]) : null));

            const press = (row.Pressure !== undefined && row.Pressure !== null && row.Pressure !== '')
                ? Number(row.Pressure)
                : ((pressCol && row[pressCol] !== undefined && row[pressCol] !== null && row[pressCol] !== '')
                    ? Number(row[pressCol])
                    : (row['PI_' + rNum] !== undefined ? Number(row['PI_' + rNum]) : null));

            const estdH2 = (row.ESTD_H2 !== undefined && row.ESTD_H2 !== null && row.ESTD_H2 !== '') ? Number(row.ESTD_H2) : null;
            const estdN2 = (row.ESTD_N2 !== undefined && row.ESTD_N2 !== null && row.ESTD_N2 !== '') ? Number(row.ESTD_N2) : null;

            let naphthaOnline = (row.Naphtha_online !== undefined && row.Naphtha_online !== null && row.Naphtha_online !== '')
                ? Number(row.Naphtha_online)
                : null;
            let h2Out = (row.H2_out !== undefined && row.H2_out !== null && row.H2_out !== '')
                ? Number(row.H2_out)
                : null;
            let naphthaOut = (row.Naphtha_out !== undefined && row.Naphtha_out !== null && row.Naphtha_out !== '')
                ? Number(row.Naphtha_out)
                : null;
            let carbonOut = (row.Carbon_out !== undefined && row.Carbon_out !== null && row.Carbon_out !== '')
                ? Number(row.Carbon_out)
                : null;
            let naphthaIn = (row.Naphtha_in !== undefined && row.Naphtha_in !== null && row.Naphtha_in !== '')
                ? Number(row.Naphtha_in)
                : null;
            let naphthaH2 = (row['Naphtha/H2'] !== undefined && row['Naphtha/H2'] !== null && row['Naphtha/H2'] !== '')
                ? Number(row['Naphtha/H2'])
                : null;

            if (naphthaOnline === null && estdH2 !== null && estdN2 !== null) {
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

            if (naphthaH2 === null) {
                if (estdH2 !== 0 && estdH2 !== null && naphthaOnline !== null) {
                    naphthaH2 = (naphthaOnline * mw) / (estdH2 * 2);
                } else if (naphthaIn !== null && h2Out !== null && h2Out !== 0) {
                    naphthaH2 = naphthaIn / h2Out;
                }
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

    function getBaseTableRows() {
        // 1. Try ils_base_table_state
        try {
            const raw = sessionStorage.getItem('ils_base_table_state');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
                    return parsed.rows;
                }
            }
        } catch (e) { }

        // 2. Try reconstruct from dhaOnlineState
        try {
            let onlineRows = [];
            const onlineRaw = sessionStorage.getItem('dhaOnlineState') || localStorage.getItem('dhaOnlineState');
            if (onlineRaw) {
                const onlineState = JSON.parse(onlineRaw);
                onlineRows = onlineState.rows || [];
            }
            if (onlineRows.length > 0) {
                let reactorRows = [];
                const dashRaw = sessionStorage.getItem('dhaDashboardState') || localStorage.getItem('dhaDashboardState');
                if (dashRaw) {
                    const dashState = JSON.parse(dashRaw);
                    reactorRows = dashState.reactorRows || [];
                }
                const { carbon, mw } = getActiveFeedCarbonAndMw();
                return reconstructBaseRows(onlineRows, carbon, mw, reactorRows);
            }
        } catch (e) { }

        return [];
    }

    function mergeBaseTableValues(yieldRows, baseRows) {
        if (!Array.isArray(yieldRows) || !yieldRows.length) return [];
        if (!Array.isArray(baseRows) || !baseRows.length) return yieldRows;

        return yieldRows.map(row => {
            const matched = findMatchingDateTime(row.DateTime, baseRows);
            if (matched) {
                BASE_TABLE_NUMERIC_COLS.forEach(col => {
                    if (row[col] === undefined || row[col] === null || row[col] === '') {
                        if (matched[col] !== undefined && matched[col] !== null) {
                            row[col] = matched[col];
                        }
                    }
                });
                if ((row['TOS(h)'] === undefined || row['TOS(h)'] === '') && matched['TOS[h]'] !== undefined) {
                    row['TOS(h)'] = matched['TOS[h]'];
                }
            }
            return row;
        });
    }

    function withTos(rows) {
        let cumulative = 0.0, prevTime = null;
        return rows.map((row, idx) => {
            if (row['TOS(h)'] !== undefined && row['TOS(h)'] !== null && row['TOS(h)'] !== '') return row;
            const t = parseDate(row.DateTime);
            let tos = 0.0;
            if (idx === 0) {
                tos = 0.0;
                prevTime = t ? t.getTime() : null;
            } else if (t !== null && prevTime !== null) {
                const diff = (t.getTime() - prevTime) / 3600000;
                cumulative += diff;
                tos = Math.round(cumulative * 100) / 100;
                prevTime = t.getTime();
            } else {
                tos = 0.0;
            }
            return { ...row, 'TOS(h)': tos };
        });
    }

    function getTable3Rows() {
        try {
            const raw = sessionStorage.getItem('dhaDashboardState') || localStorage.getItem('dhaDashboardState');
            if (raw) {
                const state = JSON.parse(raw);
                const r3 = state.r3 || state.table3_rows || state.table3Rows || [];
                if (Array.isArray(r3) && r3.length > 0) {
                    return withTos(r3);
                }
            }
        } catch (e) {
            console.warn('Failed to retrieve Table-3 rows:', e);
        }
        return [];
    }

    function mergeTable3Values(targetRows, table3Rows) {
        if (!Array.isArray(targetRows) || !targetRows.length) return [];
        if (!Array.isArray(table3Rows) || !table3Rows.length) return targetRows;

        const colsToCopy = ['Lin-RON', 'Lin-MON', 'Cal-RON', 'Cal-MON', 'TOS(h)'];

        return targetRows.map(row => {
            let matched = null;
            if (row['File Name']) {
                matched = table3Rows.find(t => t['File Name'] === row['File Name']);
            }
            if (!matched && row.UID) {
                matched = table3Rows.find(t => t.UID === row.UID);
            }
            if (!matched && row.DateTime) {
                const rVal = getRowReactor(row);
                const candidates = (rVal && rVal !== 'Unknown')
                    ? table3Rows.filter(t => {
                        const tr = normalizeReactor(t.Reactor || t['Active Reactor']);
                        return !tr || tr === rVal;
                    })
                    : table3Rows;
                matched = findMatchingDateTime(row.DateTime, candidates.length ? candidates : table3Rows);
            }

            if (matched) {
                colsToCopy.forEach(col => {
                    if (matched[col] !== undefined && matched[col] !== null && matched[col] !== '') {
                        if (row[col] === undefined || row[col] === null || row[col] === '') {
                            row[col] = matched[col];
                        }
                    }
                });
                if ((row['TOS(h)'] === undefined || row['TOS(h)'] === '') && matched['TOS(h)'] !== undefined) {
                    row['TOS(h)'] = matched['TOS(h)'];
                }
            }
            return row;
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
                const onlineState = JSON.parse(onlineRaw);
                onlineRows = onlineState.rows || [];
            }
        } catch (e) { }

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
     * Load Yield Table Data from sessionStorage or fallback calculate,
     * and enrich with Base Table columns.
     */
    async function loadYieldData() {
        setStatus('Loading...', false);
        showError('');

        // Get Base Table rows
        const baseRows = getBaseTableRows();
        plotState.baseRows = baseRows;

        // Get Table-3 Octane rows
        const table3Rows = getTable3Rows();
        plotState.table3Rows = table3Rows;

        // 1. Try reading from cached ils_yield_table_state
        try {
            const rawCached = sessionStorage.getItem('ils_yield_table_state');
            if (rawCached) {
                const cached = JSON.parse(rawCached);
                if (Array.isArray(cached.rows) && cached.rows.length > 0) {
                    let enriched = enrichRowsWithReactors(cached.rows);
                    if (baseRows.length > 0) {
                        enriched = mergeBaseTableValues(enriched, baseRows);
                    }
                    if (table3Rows.length > 0) {
                        enriched = mergeTable3Values(enriched, table3Rows);
                    }
                    plotState.rows = enriched;
                    plotState.columns = cached.columns || Object.keys(plotState.rows[0]);
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
                const computedBaseRows = reconstructBaseRows(onlineRows, carbon, mw, reactorRows);
                plotState.baseRows = computedBaseRows;

                const res = await fetch('/api/calculate-yield-table', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        carbon_rows: componentRows,
                        carbon_columns: componentColumns.length ? componentColumns : Object.keys(componentRows[0]),
                        base_rows: computedBaseRows
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    let enriched = enrichRowsWithReactors(data.rows || []);
                    if (computedBaseRows.length > 0) {
                        enriched = mergeBaseTableValues(enriched, computedBaseRows);
                    }
                    if (table3Rows.length > 0) {
                        enriched = mergeTable3Values(enriched, table3Rows);
                    }
                    plotState.rows = enriched;
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

        // 3. Fallback: If no yield table rows but Base Table rows exist, plot Base Table directly!
        if (baseRows && baseRows.length > 0) {
            let enriched = enrichRowsWithReactors(baseRows);
            if (table3Rows.length > 0) {
                enriched = mergeTable3Values(enriched, table3Rows);
            }
            plotState.rows = enriched;
            plotState.columns = Object.keys(enriched[0]);
            onDataLoaded();
            return;
        }

        // 4. Fallback: If no yield table and no base table, but Table-3 rows exist, plot Table-3 directly!
        if (table3Rows && table3Rows.length > 0) {
            let enriched = enrichRowsWithReactors(table3Rows);
            plotState.rows = enriched;
            plotState.columns = Object.keys(enriched[0]);
            onDataLoaded();
            return;
        }

        // 5. No data available
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
        const nonPlottable = new Set(['File Name', 'UID', '_row_error', 'Reactor', 'Active Reactor', 'Sampled_reactor', 'Component', 'DateTime', 'Date/Time']);
        const rowKeys = plotState.rows.length ? Object.keys(plotState.rows[0]) : [];
        const rawCols = (plotState.columns && plotState.columns.length > 0)
            ? [...new Set([...plotState.columns, ...rowKeys])]
            : rowKeys;

        // Ensure Base Table numeric columns that exist in rows are included
        const existingBaseCols = BASE_TABLE_NUMERIC_COLS.filter(c => rowKeys.includes(c));
        // Ensure Table-3 numeric columns that exist in rows are included
        const existingTable3Cols = TABLE3_NUMERIC_COLS.filter(c => rowKeys.includes(c));
        const combined = [...new Set([...rawCols, ...existingBaseCols, ...existingTable3Cols])];

        plotState.availableColumns = combined.filter(c => !nonPlottable.has(c));

        // Populate X and single Y dropdowns
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
            if (cols.includes('TOS(h)')) {
                plotState.selectedX = 'TOS(h)';
            } else if (cols.includes('TOS[h]')) {
                plotState.selectedX = 'TOS[h]';
            } else {
                plotState.selectedX = cols[0];
            }
        }

        if (!plotState.selectedY || !cols.includes(plotState.selectedY) || plotState.selectedY === plotState.selectedX) {
            const preferred = ['Lin-RON', 'Cal-RON', 'n-Hexane', 'C5+', 'Gas', 'H2_Consumption', 'Propane', 'Temperature', 'Pressure'];
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

        // Separate Base Table, Table-3 Octane Table, and Yield Table columns for organized optgroups
        const baseColsAvailable = BASE_TABLE_NUMERIC_COLS.filter(c => cols.includes(c));
        const table3ColsAvailable = TABLE3_NUMERIC_COLS.filter(c => cols.includes(c));
        const yieldColsAvailable = cols.filter(c => !BASE_TABLE_NUMERIC_COLS.includes(c) && !TABLE3_NUMERIC_COLS.includes(c));

        function generateOptionsHtml(currentSelected, currentDisabled) {
            let html = '';

            // Group 1: Table-3 Octane Table columns
            if (table3ColsAvailable.length > 0) {
                html += `<optgroup label="Table-3 Octane Table (Offline Analysis)">`;
                table3ColsAvailable.forEach(col => {
                    const isSelected = col === currentSelected ? ' selected' : '';
                    const isDisabled = col === currentDisabled ? ' disabled' : '';
                    const label = TABLE3_LABELS[col] || col;
                    html += `<option value="${col}"${isSelected}${isDisabled}>${label}</option>`;
                });
                html += `</optgroup>`;
            }

            // Group 2: Base Table tags
            if (baseColsAvailable.length > 0) {
                html += `<optgroup label="Base Table (Calculation Table)">`;
                baseColsAvailable.forEach(col => {
                    const isSelected = col === currentSelected ? ' selected' : '';
                    const isDisabled = col === currentDisabled ? ' disabled' : '';
                    const label = BASE_TABLE_LABELS[col] || col;
                    html += `<option value="${col}"${isSelected}${isDisabled}>${label}</option>`;
                });
                html += `</optgroup>`;
            }

            // Group 3: Yield Table components
            if (yieldColsAvailable.length > 0) {
                html += `<optgroup label="Yield Table Parameters">`;
                yieldColsAvailable.forEach(col => {
                    const isSelected = col === currentSelected ? ' selected' : '';
                    const isDisabled = col === currentDisabled ? ' disabled' : '';
                    html += `<option value="${col}"${isSelected}${isDisabled}>${col}</option>`;
                });
                html += `</optgroup>`;
            }

            return html;
        }

        xSelect.innerHTML = generateOptionsHtml(currentX, currentY);
        ySelect.innerHTML = generateOptionsHtml(currentY, currentX);

        // Update KPIs
        if ($('#kpiPlotX')) $('#kpiPlotX').textContent = getParamLabel(currentX);
        if ($('#kpiPlotY')) $('#kpiPlotY').textContent = getParamLabel(currentY);
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
     * Render the Scatter Plot using Chart.js with single Y axis
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
                tos: (row['TOS(h)'] !== undefined) ? row['TOS(h)'] : (row['TOS[h]'] !== undefined ? row['TOS[h]'] : '')
            });
            totalPlottedPoints++;
        });

        // Update KPIs
        if ($('#kpiPlotPoints')) $('#kpiPlotPoints').textContent = totalPlottedPoints;
        const activeReactors = Object.keys(reactorGroups);
        if ($('#kpiPlotReactors')) $('#kpiPlotReactors').textContent = activeReactors.length;
        if ($('#kpiPlotX')) $('#kpiPlotX').textContent = getParamLabel(xCol);
        if ($('#kpiPlotY')) $('#kpiPlotY').textContent = getParamLabel(yCol);

        // Update Chart Title and Eyebrow
        const yLabel = getParamLabel(yCol);
        const xLabel = getParamLabel(xCol);

        $('#plotChartTitle').textContent = `${yLabel} vs ${xLabel}`;
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
        const sortedReactors = activeReactors.sort((a, b) => {
            const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return na - nb;
        });

        // Build Chart.js datasets: Each reactor gets distinct geometric symbol and theme color
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
                                    `${xLabel}: ${pt.x.toFixed(3)}`,
                                    `${yLabel}: ${pt.y.toFixed(3)}`
                                ];
                                if (pt.tos !== '' && pt.tos !== undefined && xCol !== 'TOS(h)' && xCol !== 'TOS[h]') {
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
                        min: plotState.xMin !== null ? plotState.xMin : undefined,
                        max: plotState.xMax !== null ? plotState.xMax : undefined,
                        title: {
                            display: true,
                            text: xLabel,
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
                        min: plotState.yMin !== null ? plotState.yMin : undefined,
                        max: plotState.yMax !== null ? plotState.yMax : undefined,
                        title: {
                            display: true,
                            text: yLabel,
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
     * Sync the axis limit popover inputs with current plotState values
     */
    function syncAxisLimitInputs() {
        const xMinInput = $('#xAxisMin');
        const xMaxInput = $('#xAxisMax');
        const yMinInput = $('#yAxisMin');
        const yMaxInput = $('#yAxisMax');
        if (xMinInput) xMinInput.value = plotState.xMin !== null ? plotState.xMin : '';
        if (xMaxInput) xMaxInput.value = plotState.xMax !== null ? plotState.xMax : '';
        if (yMinInput) yMinInput.value = plotState.yMin !== null ? plotState.yMin : '';
        if (yMaxInput) yMaxInput.value = plotState.yMax !== null ? plotState.yMax : '';
    }

    /**
     * Wire the X/Y axis limit popover buttons (open/close, apply, reset)
     */
    function setupAxisLimitControls() {
        function wireAxis(axisKey, btnId, menuId, minId, maxId, resetId, applyId) {
            const btn = $(btnId);
            const menu = $(menuId);
            const minInput = $(minId);
            const maxInput = $(maxId);
            const resetBtn = $(resetId);
            const applyBtn = $(applyId);
            if (!btn || !menu) return;

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const isOpen = menu.classList.toggle('open');
                btn.classList.toggle('open', isOpen);
                btn.setAttribute('aria-expanded', String(isOpen));
            });

            menu.addEventListener('click', function (e) {
                e.stopPropagation();
            });

            document.addEventListener('click', function () {
                menu.classList.remove('open');
                btn.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            });

            if (applyBtn) {
                applyBtn.addEventListener('click', function () {
                    const minVal = minInput && minInput.value !== '' ? Number(minInput.value) : null;
                    const maxVal = maxInput && maxInput.value !== '' ? Number(maxInput.value) : null;
                    plotState[`${axisKey}Min`] = (minVal !== null && !isNaN(minVal)) ? minVal : null;
                    plotState[`${axisKey}Max`] = (maxVal !== null && !isNaN(maxVal)) ? maxVal : null;
                    menu.classList.remove('open');
                    btn.classList.remove('open');
                    btn.setAttribute('aria-expanded', 'false');
                    renderPlot();
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', function () {
                    plotState[`${axisKey}Min`] = null;
                    plotState[`${axisKey}Max`] = null;
                    if (minInput) minInput.value = '';
                    if (maxInput) maxInput.value = '';
                    renderPlot();
                });
            }
        }

        wireAxis('x', '#xAxisLimitBtn', '#xAxisLimitMenu', '#xAxisMin', '#xAxisMax', '#xAxisLimitReset', '#xAxisLimitApply');
        wireAxis('y', '#yAxisLimitBtn', '#yAxisLimitMenu', '#yAxisMin', '#yAxisMax', '#yAxisLimitReset', '#yAxisLimitApply');
    }

    /**
     * Setup Event Listeners
     */
    function setupEvents() {
        const xSelect = $('#plotXSelect');
        const ySelect = $('#plotYSelect');
        const swapAxesBtn = $('#plotSwapAxes');
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

        // Mutual exclusion between single X and single Y
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

        // Swap X and Y axis selections
        if (swapAxesBtn) {
            swapAxesBtn.addEventListener('click', function () {
                const currentX = plotState.selectedX;
                const currentY = plotState.selectedY;
                if (!currentX || !currentY) return;
                plotState.selectedX = currentY;
                plotState.selectedY = currentX;

                const currentXMin = plotState.xMin, currentXMax = plotState.xMax;
                plotState.xMin = plotState.yMin;
                plotState.xMax = plotState.yMax;
                plotState.yMin = currentXMin;
                plotState.yMax = currentXMax;
                syncAxisLimitInputs();

                renderDropdownOptions();
                renderPlot();
            });
        }

        setupAxisLimitControls();

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
            if (e.key === 'ils_yield_table_state' || e.key === 'ils_base_table_state' || e.key === 'dhaOnlineState' || e.key === 'dhaDashboardState') {
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
