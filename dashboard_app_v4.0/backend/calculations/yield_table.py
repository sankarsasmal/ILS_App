from collections import defaultdict
from datetime import datetime
from numbers import Number


DATE_HOUR_TOLERANCE_HOURS = 1
CALCULATED_COLUMNS = ["Gas", "C5+", "H2_Consumption"]


def _is_valid_number(value):
    if value is None or isinstance(value, bool):
        return False
    if isinstance(value, Number):
        return value == value and value not in (float("inf"), float("-inf"))
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return False
    return number == number and number not in (float("inf"), float("-inf"))


def _normalize_reactor(val):
    if val is None:
        return ""
    s = str(val).strip()
    if not s or s in ("0", "0.0", "None", "nan"):
        return ""
    if s.upper().startswith("R"):
        sub = s[1:].strip()
        if sub in ("1", "2", "3", "4", "5", "6", "7", "8"):
            return "R" + sub
        return s.upper()
    if s in ("1", "2", "3", "4", "5", "6", "7", "8"):
        return f"R{s}"
    try:
        f = float(s)
        if f.is_integer() and 1 <= int(f) <= 8:
            return f"R{int(f)}"
    except ValueError:
        pass
    return s


def _output_columns(carbon_rows, carbon_columns=None):
    columns = list(carbon_columns or [])
    if not columns and carbon_rows:
        columns = list(carbon_rows[0].keys())
    try:
        start = columns.index("DateTime")
    except ValueError:
        return []
    base_cols = [col for col in columns[start:] if col not in CALCULATED_COLUMNS and col != "TOS(h)"]
    if "DateTime" in base_cols:
        dt_idx = base_cols.index("DateTime")
        base_cols.insert(dt_idx + 1, "TOS(h)")
    else:
        base_cols.insert(0, "TOS(h)")
    return base_cols + CALCULATED_COLUMNS


def _parse_datetime(value):
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text.replace(" ", "T"))
    except ValueError:
        for pattern in (
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d.%m.%Y %H:%M:%S",
            "%d.%m.%Y %H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
        ):
            try:
                return datetime.strptime(str(value).strip(), pattern)
            except ValueError:
                continue
    return None


def _date_hour_key(value):
    """Return calendar date and hour for hour-value matching."""
    parsed = _parse_datetime(value)
    return (parsed.date().isoformat(), parsed.hour) if parsed else None


def _find_gas_columns(columns):
    target_names = {"c3 & below", "propane", "i-butane", "isobutane", "n-butane"}
    return [col for col in columns if col.strip().lower() in target_names]


def _find_c3_to_noctane_columns(columns, numeric_columns):
    start_idx = None
    end_idx = None
    for idx, col in enumerate(columns):
        cl = col.strip().lower()
        if start_idx is None and cl == "c3 & below":
            start_idx = idx
        if cl in ("n-octane", "noctane", "n_octane", "octane"):
            end_idx = idx

    # If "c3 & below" not found by name, start from first numeric column
    if start_idx is None:
        for idx, col in enumerate(columns):
            if col in numeric_columns:
                start_idx = idx
                break

    if start_idx is None:
        return []

    if end_idx is not None and end_idx >= start_idx:
        candidate_cols = columns[start_idx : end_idx + 1]
    else:
        candidate_cols = columns[start_idx:]

    return [c for c in candidate_cols if c in numeric_columns]


def calculate_yield_table(carbon_rows, base_rows, carbon_columns=None):
    """Scale Table-2 Component List values by Base Table Naphtha ratios."""
    carbon_rows = list(carbon_rows or [])
    base_rows = list(base_rows or [])
    columns = _output_columns(carbon_rows, carbon_columns)
    if not columns:
        return {"columns": [], "rows": [], "record_count": 0}

    base_by_date = defaultdict(list)
    for base_row in base_rows:
        date_time = base_row.get("DateTime", base_row.get("Date/Time", ""))
        key = _date_hour_key(date_time)
        if key is not None:
            base_by_date[key[0]].append((key[1], base_row))

    numeric_columns = [
        column
        for column in columns
        if column
        not in (
            "DateTime",
            "TOS(h)",
            "Component",
            "Active Reactor",
            "Reactor",
            "Sampled_reactor",
            *CALCULATED_COLUMNS,
        )
    ]
    gas_cols = _find_gas_columns(numeric_columns)
    range_cols = _find_c3_to_noctane_columns(columns, numeric_columns)

    result_rows = []
    for carbon_row in carbon_rows:
        result = {column: carbon_row.get(column, "") for column in columns}
        date_time = carbon_row.get("DateTime", "")
        carbon_key = _date_hour_key(date_time)
        candidates = base_by_date.get(carbon_key[0], []) if carbon_key else []
        matching = (
            [
                row
                for base_hour, row in candidates
                if abs(base_hour - carbon_key[1]) <= DATE_HOUR_TOLERANCE_HOURS
            ]
            if carbon_key
            else []
        )
        if matching:
            matching.sort(
                key=lambda row: abs(
                    (
                        _date_hour_key(row.get("DateTime", row.get("Date/Time", "")))[1]
                        - carbon_key[1]
                    )
                )
            )

        reactor_val = _normalize_reactor(
            carbon_row.get("Reactor")
            or carbon_row.get("Active Reactor")
            or carbon_row.get("Sampled_reactor")
        )
        if reactor_val and not result.get("Reactor"):
            result["Reactor"] = reactor_val
        if not matching:
            for column in numeric_columns:
                if carbon_row.get(column, "") not in (None, ""):
                    result[column] = "ERROR: No matching DateTime"
            result["_row_error"] = "ERROR: No matching DateTime"
            for col in CALCULATED_COLUMNS:
                result[col] = "ERROR: No matching DateTime"
            result_rows.append(result)
            continue

        base_row = matching[0]
        if not result.get("Reactor"):
            b_reactor = _normalize_reactor(
                base_row.get("Reactor")
                or base_row.get("Active Reactor")
                or base_row.get("Sampled_reactor")
            )
            if b_reactor:
                result["Reactor"] = b_reactor
        naphtha_in = base_row.get("Naphtha_in", base_row.get("Naphtha_in [mol%]"))
        naphtha_out = base_row.get("Naphtha_out", base_row.get("Naphtha_out [mol%]"))
        if not _is_valid_number(naphtha_in) or float(naphtha_in) == 0:
            ratio_error = "ERROR: Invalid Naphtha_in [mol%]"
        elif not _is_valid_number(naphtha_out):
            ratio_error = "ERROR: Invalid Naphtha_out [mol%]"
        else:
            ratio_error = ""
            ratio = float(naphtha_out) / float(naphtha_in)

        has_any_numeric_input = False
        for column in numeric_columns:
            value = carbon_row.get(column, "")
            if value in (None, ""):
                result[column] = ""
            elif ratio_error:
                result[column] = ratio_error
            elif _is_valid_number(value):
                result[column] = float(value) * ratio
                has_any_numeric_input = True
            else:
                result[column] = "ERROR: Invalid source value"
        result["_row_error"] = ratio_error

        if ratio_error:
            for col in CALCULATED_COLUMNS:
                result[col] = ratio_error
        elif not has_any_numeric_input:
            for col in CALCULATED_COLUMNS:
                result[col] = ""
        else:
            err_val = None
            gas_sum = 0.0
            for col in gas_cols:
                val = result.get(col, "")
                if isinstance(val, str) and val.startswith("ERROR"):
                    err_val = val
                    break
                if _is_valid_number(val):
                    gas_sum += float(val)

            range_sum = 0.0
            if not err_val:
                for col in range_cols:
                    val = result.get(col, "")
                    if isinstance(val, str) and val.startswith("ERROR"):
                        err_val = val
                        break
                    if _is_valid_number(val):
                        range_sum += float(val)

            if err_val:
                for col in CALCULATED_COLUMNS:
                    result[col] = err_val
            else:
                result["Gas"] = gas_sum
                result["C5+"] = range_sum - gas_sum
                result["H2_Consumption"] = range_sum - 100.0

        result_rows.append(result)

    # Calculate cumulative TOS(h): starts with zero, then (n+1)dateTime - nth DateTime + nth TOS(h)
    cumulative_tos = 0.0
    prev_dt = None
    for idx, row in enumerate(result_rows):
        dt_val = row.get("DateTime")
        curr_dt = _parse_datetime(dt_val)
        if idx == 0:
            row["TOS(h)"] = 0.0
            prev_dt = curr_dt
        else:
            if curr_dt is not None and prev_dt is not None:
                diff_hours = (curr_dt - prev_dt).total_seconds() / 3600.0
                cumulative_tos += diff_hours
                row["TOS(h)"] = round(cumulative_tos, 2)
                prev_dt = curr_dt
            elif curr_dt is not None and prev_dt is None:
                row["TOS(h)"] = round(cumulative_tos, 2)
                prev_dt = curr_dt
            else:
                row["TOS(h)"] = None

    return {"columns": columns, "rows": result_rows, "record_count": len(result_rows)}
