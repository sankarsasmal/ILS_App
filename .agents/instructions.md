# Agent Harness

- Use this as the baseline memory layer for the project.
- Before coding, recall current context from the local memories store via MCP (`get_context`) or CLI (`memories recall`).
- Memories are local-first: project + global records come from your local DB; cloud sync mirrors that state.
- When rules conflict, prefer path-scoped rules, then project rules, then global rules.

## Runtime Checklist

- Start tasks with a context recall (`memories recall --json`).
- Persist important decisions with `memories add` or MCP `add_memory`.
- Edit source memories instead of hand-editing generated integration files.

## Stored Memories

## Rules

- # Antigravity Context & Memory Strategy

Before scanning full directories, reading raw files, or analyzing the entire codebase:
1. Always call memories:get_context or memories:search_memories to retrieve existing architectural notes, file structures, and past session summaries.
2. Only scan raw files if the memory store does not contain the required context.
3. After completing major tasks, updates, or code additions, save key takeaways using memories:add_memory.

## Key Decisions

- # Run Plan Page Added to Dashboard App v3.7.0

Added Run Plan page beside Online Analysis tab. Implemented RunPlan.py and run_plan_service.py parsing Feed (df_feed), Plan (df_Plan + objective), and DOE (df_DOE with column forward-fill). Added dynamic file browsing with browse_file_dialog and full sub-tab switching in frontend.

## Project Facts

- # ILS_App (DHA & Reactor Data Dashboard) - Workspace Summary

### 1. Project Purpose
The ILS_App workspace houses analytical dashboards and processing pipelines for refinery/chemical lab data, primarily Detailed Hydrocarbon Analysis (DHA), octane rating calculations, reactor valve-state mapping, and online gas chromatography analysis. The active, packaged version is `dashboard_app_v3.6.0`.

### 2. Main Entry Points
- `dashboard_app_v3.6.0/app.py`: Main Flask application factory (`create_app()`) serving API endpoints under `/api` and frontend static assets.
- `dashboard_app_v3.6.0/run_app.py`: Desktop/local runner script.
- `run_dashboard.bat` / `run_dashboard.ps1`: Quick launch scripts for Windows.
- `ValveOpening.py`: Standalone script for parsing valve opening logs.

### 3. Key Components & Architecture
- **Backend Services (`backend/services`)**:
  - `dashboard_service.py`: Parses DHA XLS workbooks, extracting Table-1 (carbon number breakdown), Table-2 (hydrocarbon categories: Paraffin, I-Paraffin, Aromatic, Naphthene, Olefin), and Table-3 (Lin/Cal RON & MON octane ratings).
  - `reactor_map_service.py`: Parses CSV files tracking reactor valve-state changes (R1-R8) across timestamps.
  - `online_analysis_service.py`: Parses online GC text reports and correlates online stream rows with reactor states.
  - `dialog_service.py`: Cross-platform native folder and file selection dialogs (Tkinter fallback / PowerShell).
- **Backend API Routes (`backend/routes/api.py`)**:
  - Blueprint `/api` with endpoints: `/health`, `/settings`, `/browse-folder`, `/browse-reactor-folder`, `/browse-online-file`, `/process`, `/process-reactor-map`, `/process-online`, `/apply-online-reactor-map`.
- **Frontend (`frontend/`)**:
  - Modular Single Page Application (`index.html`, `online_analysis.html`, `reactor_map.html`).
  - Styled with custom CSS (`frontend/css/dashboard.css`) and dynamic JS filtering, KPI cards, and CSV export.
- **Automated Tests (`tests/`)**:
  - Pytest test suite covering route integration, dialog services, datetime filtering, and octane extraction.
- # Version 3.8.0 Packaged

Created dashboard_app_v3.8.0 directory and dashboard_app_v3.8.0.zip from dashboard_app_v3.7.0. Includes complete Run Plan page with Feed, Plan, and DOE sub-tabs, dynamic Excel loading from RunPlan.py, and tailored table alignments (Feed/Plan 1st column left-aligned, DOE last column left-aligned, others center-aligned). Passed all 41 automated tests.
- # ILS_App (DHA, Reactor Map & Online GC Dashboard) - Workspace Summary

### 1. Project Purpose
The `ILS_App` workspace houses analytical dashboards and data processing pipelines for refinery and chemical laboratory operations. The active, primary application package is `dashboard_app_v3.7.0`.
Core functionalities include:
- **Detailed Hydrocarbon Analysis (DHA)**: Batch parsing of legacy Excel (.xls) reports to extract Table-1 (carbon number distribution C1-C14+ and Unknowns), Table-2 (PIONA hydrocarbon groups: Paraffins, I-Paraffins, Aromatics, Naphthenes, Olefins), and Table-3 (Lin-RON, Lin-MON, Cal-RON, and Cal-MON octane ratings from `OCTANE_NUMBERS!B1:B4`).
- **Reactor Valve-State Mapping**: Parsing CSV logs tracking reactor valve-state transitions (R1-R8) across timestamps to visualize active reactor cycles.
- **Online Gas Chromatography (GC) Analysis**: Processing online GC raw text data (`.txt`), applying datetime filters, and mapping online stream measurements to reactor valve states (`apply-online-reactor-map`).
- **Data Visualization & Export**: Interactive SPA with KPI cards, multi-criteria filtering (components, dates, keywords), and CSV export capabilities.

### 2. Main Entry Points
- `dashboard_app_v3.7.0/run_app.py`: Desktop/local entry runner that loads configuration from `config/settings.json`, optionally opens the system browser, and starts the Flask server.
- `dashboard_app_v3.7.0/app.py`: Main Flask application factory (`create_app()`) registering backend routes (`/api`) and serving frontend static assets (`/` and `/frontend/<path:path>`).
- `dashboard_app_v3.7.0/run_dashboard.bat` & `run_dashboard.ps1`: Quick launch scripts for Windows environments.
- `ValveOpening.py`: Standalone CLI utility for parsing and analyzing valve log files.

### 3. Key Components & Architecture
- **Backend Services (`dashboard_app_v3.7.0/backend/services/`)**:
  - `dashboard_service.py`: Ingests and processes DHA workbooks into Table-1, Table-2, and Table-3 datasets.
  - `reactor_map_service.py`: Ingests CSV logs and processes R1-R8 valve positions and active state intervals.
  - `online_analysis_service.py`: Parses GC text reports, implements datetime windowing, and maps GC records to reactor states (`apply_reactor_map_to_online_rows`).
  - `dialog_service.py` & `picker.py`: Native directory/file browsing dialogs with Tkinter and PowerShell fallbacks.
- **Backend Loaders & Calculations (`dashboard_app_v3.7.0/backend/loaders/`, `calculations/`)**:
  - XLS parsing engines, dynamic carbon header detection, and component classification.
- **Backend API Routes (`dashboard_app_v3.7.0/backend/routes/api.py`)**:
  - Endpoints: `/api/health`, `/api/settings`, `/api/browse-folder`, `/api/process`, `/api/browse-reactor-folder`, `/api/process-reactor-map`, `/api/browse-online-file`, `/api/process-online`, `/api/apply-online-reactor-map`.
- **Frontend (`dashboard_app_v3.7.0/frontend/`)**:
  - Single-Page Application (`index.html`, `online_analysis.html`, `reactor_map.html`).
  - Tab views for Table-1, Table-2, Table-3, Reactor Map (isolated tab layout), and Online Analysis.
  - Custom CSS styling (`frontend/css/dashboard.css`) and modular client-side logic (`frontend/js/`).
- **Automated Tests (`dashboard_app_v3.7.0/tests/`)**:
  - Pytest test suite covering route integration, native dialogs, online analysis parsers, datetime filtering, and XLS extraction.
<!-- Generated by memories.sh at 2026-09-13T04:05:24.884Z -->