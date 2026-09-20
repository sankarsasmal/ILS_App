document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('main > header');
    if (!header || document.querySelector('.analysis-tabs')) return;

    const path = window.location.pathname.toLowerCase();
    const isCalculation = path.endsWith('/calculation_table.html') || path.endsWith('/calculation-table') || path.endsWith('/calculation_table') || path.endsWith('/calculation') || path.includes('/frontend/calculation_table.html');
    const isPlots = path.endsWith('/plots.html') || path.endsWith('/plots') || path.includes('/frontend/plots.html');
    const isRunPlan = path === '/' || path.endsWith('/run_plan.html') || path.endsWith('/run-plan') || path.endsWith('/run_plan') || path.includes('/frontend/run_plan.html');
    const isOnline = path.endsWith('/online_analysis.html') || path.endsWith('/online-analysis') || path.endsWith('/online_analysis');
    const isOffline = !isRunPlan && !isOnline && !isCalculation && !isPlots;

    header.insertAdjacentHTML(
        'afterend',
        `<nav aria-label="Analysis mode" class="analysis-tabs">` +
        `<a aria-current="${isRunPlan ? 'page' : 'false'}" class="analysis-tab${isRunPlan ? ' active' : ''}" href="/" data-href="/frontend/run_plan.html">Run Plan</a>` +
        `<a aria-current="${isOffline ? 'page' : 'false'}" class="analysis-tab${isOffline ? ' active' : ''}" href="/frontend/index.html">Offline Analysis</a>` +
        `<a aria-current="${isOnline ? 'page' : 'false'}" class="analysis-tab${isOnline ? ' active' : ''}" href="/frontend/online_analysis.html">Online Analysis</a>` +
        `<a aria-current="${isCalculation ? 'page' : 'false'}" class="analysis-tab${isCalculation ? ' active' : ''}" href="/frontend/calculation_table.html">Calculation table</a>` +
        `<a aria-current="${isPlots ? 'page' : 'false'}" class="analysis-tab${isPlots ? ' active' : ''}" href="/frontend/plots.html">Plots</a>` +
        `</nav>`
    );

    // Run Number state management
    const RUN_NUMBER_KEY = 'ils_run_number';
    let saveTimeout = null;

    function saveToServer(val) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            fetch('/api/run-number', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ run_number: val })
            }).catch(err => console.error('Failed to save run number to backend:', err));
        }, 200);
    }

    // Ensure refresh button exists and is wired up
    let refreshBtn = document.querySelector('#pageRefresh');
    if (!refreshBtn) {
        const targetContainer = header.querySelector('.header-actions') || header;
        targetContainer.insertAdjacentHTML('beforeend', '<button aria-label="Reset dashboard and Run Number" class="page-refresh" id="pageRefresh" title="Reset dashboard and Run Number" type="button">↻</button>');
        refreshBtn = document.querySelector('#pageRefresh');
    }
    if (refreshBtn) {
        refreshBtn.setAttribute('title', 'Reset dashboard and Run Number');
        refreshBtn.onclick = async (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            clearTimeout(saveTimeout);

            // 1. Clear all storages
            try { sessionStorage.clear(); } catch {}
            try {
                localStorage.removeItem(RUN_NUMBER_KEY);
                localStorage.removeItem('ils_run_number_active');
            } catch {}

            // 2. Clear inputs in DOM immediately
            const runInput = document.getElementById('runNumberInput');
            if (runInput) {
                runInput.value = '';
                runInput.defaultValue = '';
            }
            const runDisplay = document.getElementById('runNumberDisplay');
            if (runDisplay) {
                runDisplay.value = '';
                runDisplay.placeholder = '—';
            }

            // 3. Clear errors
            const rpError = document.getElementById('runPlanError');
            if (rpError) {
                rpError.textContent = '';
                rpError.classList.remove('show');
            }
            const dashError = document.getElementById('error');
            if (dashError) {
                dashError.textContent = '';
                dashError.style.display = 'none';
            }
            const onlineError = document.getElementById('onlineError');
            if (onlineError) {
                onlineError.textContent = '';
                onlineError.classList.remove('show');
            }
            const calcError = document.getElementById('calcError');
            if (calcError) {
                calcError.textContent = '';
                calcError.classList.remove('show');
            }
            const plotError = document.getElementById('plotError');
            if (plotError) {
                plotError.textContent = '';
                plotError.classList.remove('show');
            }

            // 4. Send reset to server
            try {
                await fetch('/api/run-number', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ run_number: '' })
                });
            } catch (err) {
                console.error('Failed to reset run number on server:', err);
            }

            // 5. Clean navigation replace to avoid browser restoring cached form input
            window.location.replace(window.location.pathname);
        };
    }

    if (isRunPlan) {
        const runInput = document.getElementById('runNumberInput');
        if (runInput) {
            // Force reset DOM value initially so browser cannot restore previous typed value
            runInput.value = '';
            runInput.defaultValue = '';

            // Check if there is an active session run number
            const activeSession = sessionStorage.getItem('ils_run_number');
            if (activeSession) {
                runInput.value = activeSession;
                localStorage.setItem(RUN_NUMBER_KEY, activeSession);
            } else {
                // If there is NO active session in this tab/window, it's a fresh start -> clear localStorage
                localStorage.removeItem(RUN_NUMBER_KEY);
                runInput.value = '';
            }

            // Sync with backend API
            fetch('/api/run-number')
                .then(r => r.json())
                .then(data => {
                    const serverVal = (data && data.run_number !== undefined && data.run_number !== null) ? String(data.run_number).trim() : '';
                    const activeNow = sessionStorage.getItem('ils_run_number');
                    if (activeNow) {
                        runInput.value = activeNow;
                    } else if (serverVal) {
                        runInput.value = serverVal;
                        sessionStorage.setItem('ils_run_number', serverVal);
                        localStorage.setItem(RUN_NUMBER_KEY, serverVal);
                    } else {
                        runInput.value = '';
                        localStorage.removeItem(RUN_NUMBER_KEY);
                    }
                })
                .catch(() => {
                    if (!sessionStorage.getItem('ils_run_number')) {
                        runInput.value = '';
                        localStorage.removeItem(RUN_NUMBER_KEY);
                    }
                });

            // Prevent browser back/forward or reload restoring stale input
            window.addEventListener('pageshow', () => {
                const activeNow = sessionStorage.getItem('ils_run_number');
                if (!activeNow && runInput) {
                    runInput.value = '';
                    runInput.defaultValue = '';
                    localStorage.removeItem(RUN_NUMBER_KEY);
                }
            });

            // Strict whole-number keyboard input filtering
            runInput.addEventListener('keydown', (e) => {
                const allowed = [
                    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
                ];
                if (allowed.includes(e.key)) return;
                if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) return;

                // Disallow decimals, negatives, signs, exponent 'e', and non-digit characters
                if (!/^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                }
            });

            // Enforce whole-number sanitization on input & paste
            const handleRunNumberUpdate = () => {
                const cleaned = runInput.value.replace(/[^\d]/g, '');
                if (runInput.value !== cleaned) {
                    runInput.value = cleaned;
                }
                if (cleaned) {
                    sessionStorage.setItem('ils_run_number', cleaned);
                    localStorage.setItem(RUN_NUMBER_KEY, cleaned);
                } else {
                    sessionStorage.removeItem('ils_run_number');
                    localStorage.removeItem(RUN_NUMBER_KEY);
                }
                saveToServer(cleaned);
            };

            runInput.addEventListener('input', handleRunNumberUpdate);
            runInput.addEventListener('change', handleRunNumberUpdate);
        }
    } else {
        const runDisplay = document.getElementById('runNumberDisplay');
        if (runDisplay) {
            const updateDisplay = (val) => {
                const clean = (val || '').trim();
                runDisplay.value = clean;
                runDisplay.placeholder = clean ? '' : '—';
            };
            updateDisplay('');

            const sessionVal = sessionStorage.getItem('ils_run_number');
            if (sessionVal) {
                updateDisplay(sessionVal);
            } else {
                fetch('/api/run-number')
                    .then(r => r.json())
                    .then(data => {
                        const serverVal = (data && data.run_number !== undefined && data.run_number !== null) ? String(data.run_number).trim() : '';
                        const activeNow = sessionStorage.getItem('ils_run_number');
                        if (activeNow) {
                            updateDisplay(activeNow);
                        } else if (serverVal) {
                            updateDisplay(serverVal);
                            sessionStorage.setItem('ils_run_number', serverVal);
                            localStorage.setItem(RUN_NUMBER_KEY, serverVal);
                        } else {
                            updateDisplay('');
                            localStorage.removeItem(RUN_NUMBER_KEY);
                        }
                    })
                    .catch(() => updateDisplay(''));
            }

            window.addEventListener('pageshow', () => {
                const activeNow = sessionStorage.getItem('ils_run_number');
                updateDisplay(activeNow || '');
            });

            // Listen for cross-tab storage changes
            window.addEventListener('storage', (e) => {
                if (e.key === RUN_NUMBER_KEY) {
                    updateDisplay(e.newValue || '');
                }
            });
        }
    }

    // Readiness status indicator observer: green dot when idle/ready, hourglass when background file is processing
    const readinessEl = document.querySelector('.readiness-indicator');
    const statusTextEl = document.querySelector('.readiness-indicator .pill');
    if (readinessEl && statusTextEl) {
        function updateReadinessState() {
            const txt = (statusTextEl.textContent || '').trim().toLowerCase();
            const isBusy = txt.includes('...') || txt.includes('loading') || txt.includes('processing') || txt.includes('importing') || txt.includes('browsing');
            readinessEl.classList.toggle('processing', isBusy);
        }
        updateReadinessState();
        const obs = new MutationObserver(updateReadinessState);
        obs.observe(statusTextEl, { characterData: true, childList: true, subtree: true });
    }
});

