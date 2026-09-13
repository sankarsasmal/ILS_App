document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('main > header');
    if (!header || document.querySelector('.analysis-tabs')) return;

    const path = window.location.pathname.toLowerCase();
    const isOnline = path.endsWith('/online_analysis.html') || path.endsWith('/online-analysis') || path.endsWith('/online_analysis');
    const isRunPlan = path.endsWith('/run_plan.html') || path.endsWith('/run-plan') || path.endsWith('/run_plan');
    const isOffline = !isOnline && !isRunPlan;

    header.insertAdjacentHTML(
        'afterend',
        `<nav aria-label="Analysis mode" class="analysis-tabs">` +
        `<a aria-current="${isOffline ? 'page' : 'false'}" class="analysis-tab${isOffline ? ' active' : ''}" href="/">Offline Analysis</a>` +
        `<a aria-current="${isOnline ? 'page' : 'false'}" class="analysis-tab${isOnline ? ' active' : ''}" href="/frontend/online_analysis.html">Online Analysis</a>` +
        `<a aria-current="${isRunPlan ? 'page' : 'false'}" class="analysis-tab${isRunPlan ? ' active' : ''}" href="/frontend/run_plan.html">Run Plan</a>` +
        `</nav>`
    );
    header.insertAdjacentHTML('beforeend', '<button aria-label="Refresh dashboard" class="page-refresh" id="pageRefresh" title="Refresh dashboard" type="button">↻</button>');
    document.querySelector('#pageRefresh').onclick = () => { sessionStorage.clear(); window.location.reload(); };
});
