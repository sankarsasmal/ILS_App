document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('main > header');
    if (!header || document.querySelector('.analysis-tabs')) return;

    const online = window.location.pathname.endsWith('/online_analysis.html');
    header.insertAdjacentHTML('afterend', `<nav aria-label="Analysis mode" class="analysis-tabs"><a aria-current="${online ? 'false' : 'page'}" class="analysis-tab${online ? '' : ' active'}" href="/">Offline Analysis</a><a aria-current="${online ? 'page' : 'false'}" class="analysis-tab${online ? ' active' : ''}" href="/frontend/online_analysis.html">Online Analysis</a></nav>`);
    header.insertAdjacentHTML('beforeend', '<button aria-label="Refresh dashboard" class="page-refresh" id="pageRefresh" title="Refresh dashboard" type="button">↻</button>');
    document.querySelector('#pageRefresh').onclick = () => { sessionStorage.clear(); window.location.reload(); };
});
