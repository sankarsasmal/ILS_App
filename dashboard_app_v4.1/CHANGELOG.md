### 4.1.0 - 2026-09-21
- Added Custom Table Studio (`/custom-table`) enabling Excel-like formula flexibility.
- Implemented Dual-Mode Builder (Guided Visual Builder for non-programmers + Excel Formula Bar for power users).
- Added safe AST expression evaluator (zero arbitrary code execution, safe division by zero, DAG cycle detection).
- Added Cell Lineage & Audit Explain inspector to verify intermediate calculations and inputs.
- Added support for cross-referencing Base Table, Offline Table-2, Yield Table, and Demo datasets.
- Added CSV export and JSON calculation template import/export.

### 4.0.0 - 2026-09-15
- Yield table wof% calculation synchronization.
- Base reactor conditions and feed property bindings.

### 3.4.0 - 2026-09-10
- Added a Reactor Map tab beside Table-3 · Octane Table.
- Linked the tab to the packaged valve-opening dashboard at /frontend/reactor_map.html.
- Restyled the Reactor Map with the main dashboard palette, typography, cards, filters, table, and responsive behavior.
- Added tab/route regression checks and a complete v3.3.0 rollback archive.
- No DHA or valve-state calculation logic was changed.

### 3.3.0 - 2026-09-09
- Added Table-3 · Octane Table as a third tab beside Tables 1 and 2.
- Extracts Lin-RON, Lin-MON, Cal-RON, and Cal-MON from OCTANE_NUMBERS!B1:B4 for each XLS file.
- Added Table-3 processed KPI and file-level partial/error reporting.
- Formats all displayed numeric table values to two decimal places without altering extracted numeric data.
- Added automated tests for octane cell mapping and updated documentation.

### 1.3.2 - 2026-09-08
- Fixed Table-1 returning zero rows when the optional Unknown column is absent or labeled Unknowns/Unidentified.
- Table-1 now detects the carbon header row and all available worksheet columns dynamically.
- Added separate Table-1 and Table-2 processed KPIs so partial processing is visible.
- Preserved revised HC_category.py Table-2 logic and restored the full startup package.

## Changelog

### 1.2.0 - 2026-09-08
- Added a Components filter dropdown to the DHA Data table.
- Added Paraffin, I-Paraffins, Aromatics, Naphthenes, and Olefins multi-select options.
- Added Select all and Clear controls and an active-filter summary.
- Preserved text search and folder processing behavior.
- Added safer JSON response handling for API errors.

### 1.1.0 - 2026-09-08
- Consolidated the component views into one DHA Data table.
