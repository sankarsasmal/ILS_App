const onlineState = { rows: [], columns: [] };
const online$ = (selector) => document.querySelector(selector);
const formatOnlineValue = (value) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : (value ?? '');
function restoreOnlineState() {
    try {
        const saved = JSON.parse(sessionStorage.getItem('dhaOnlineState') || 'null');
        if (!saved) return;
        if (Array.isArray(saved.rows)) onlineState.rows = saved.rows;
        if (Array.isArray(saved.columns)) onlineState.columns = saved.columns;
        if (saved.path) online$('#onlineFile').value = saved.path;
        if (saved.summary) online$('#onlineSummary').textContent = saved.summary;
    } catch (error) { sessionStorage.removeItem('dhaOnlineState'); }
}

function onlineError(message = '') {
    const element = online$('#onlineError');
    element.textContent = message;
    element.classList.toggle('show', Boolean(message));
}

function renderOnlineTable() {
    const query = online$('#onlineSearch').value.toLowerCase();
    const reactor = online$('#onlineReactorFilter').value;
    const rows = onlineState.rows.filter((row) => (!reactor || row.Reactor === reactor) && Object.values(row).join(' ').toLowerCase().includes(query));
    online$('#onlineThead').innerHTML = onlineState.columns.map((column) => `<th>${column}</th>`).join('');
    online$('#onlineTbody').innerHTML = rows.map((row) => `<tr>${onlineState.columns.map((column) => `<td>${column === 'Reactor' ? String(row[column] ?? '') : formatOnlineValue(row[column])}</td>`).join('')}</tr>`).join('');
    online$('#onlineEmpty').style.display = rows.length ? 'none' : 'block';
}

function renderReactorFilter() {
    const reactors = [...new Set(onlineState.rows.map((row) => row.Reactor).filter(Boolean))].sort();
    online$('#onlineReactorFilter').innerHTML = '<option value="">All reactors</option>' + reactors.map((reactor) => `<option value="${reactor}">${reactor}</option>`).join('');
}

async function onlineJson(response) {
    const text = await response.text();
    try { return JSON.parse(text); } catch { throw Error('Server returned an invalid response. Restart the updated dashboard.'); }
}

online$('#onlineBrowse').onclick = async () => {
    onlineError();
    try {
        const response = await fetch('/api/browse-online-file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initial_file: online$('#onlineFile').value }) });
        const data = await onlineJson(response);
        if (!response.ok) throw Error(data.error);
        online$('#onlineFile').value = data.path;
    } catch (error) { onlineError(error.message); }
};

online$('#onlineProcess').onclick = async () => {
    onlineError();
    online$('#onlineStatus').textContent = 'Importing...';
    online$('#onlineProcess').disabled = true;
    try {
        const response = await fetch('/api/process-online', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: online$('#onlineFile').value }) });
        const data = await onlineJson(response);
        if (!response.ok) throw Error(data.error);
        onlineState.rows = data.rows;
        onlineState.columns = data.columns;
        renderReactorFilter();
        online$('#onlineSummary').textContent = `${data.record_count} records loaded from ${data.source_file}`;
        sessionStorage.setItem('dhaOnlineState', JSON.stringify({ rows: onlineState.rows, columns: onlineState.columns, path: online$('#onlineFile').value, summary: online$('#onlineSummary').textContent }));
        renderOnlineTable();
        online$('#onlineStatus').textContent = 'Ready';
    } catch (error) {
        onlineError(error.message);
        online$('#onlineStatus').textContent = 'Failed';
    } finally { online$('#onlineProcess').disabled = false; }
};

online$('#onlineSearch').oninput = renderOnlineTable;
online$('#onlineReactorFilter').onchange = renderOnlineTable;
restoreOnlineState();
renderReactorFilter();
renderOnlineTable();