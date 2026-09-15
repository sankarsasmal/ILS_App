from collections import defaultdict
from datetime import datetime
from numbers import Number


DATE_HOUR_TOLERANCE_HOURS = 1


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


def _output_columns(carbon_rows, carbon_columns=None):
    columns = list(carbon_columns or [])
    if not columns and carbon_rows:
        columns = list(carbon_rows[0].keys())
    try:
        start = columns.index("DateTime")
    except ValueError:
        return []
    return columns[start:]


def _date_hour_key(value):
    """Return calendar date and hour for hour-value matching."""
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text.replace(" ", "T"))
    except ValueError:
        parsed = None
        for pattern in (
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d.%m.%Y %H:%M:%S",
            "%d.%m.%Y %H:%M",
        ):
            try:
                parsed = datetime.strptime(str(value).strip(), pattern)
                break
            except ValueError:
                continue
    return (parsed.date().isoformat(), parsed.hour) if parsed else None


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
        not in ("DateTime", "Component", "Active Reactor", "Reactor", "Sampled_reactor")
    ]
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

        if not matching:
            for column in numeric_columns:
                if carbon_row.get(column, "") not in (None, ""):
                    result[column] = "ERROR: No matching DateTime"
            result["_row_error"] = "ERROR: No matching DateTime"
            result_rows.append(result)
            continue

        base_row = matching[0]
        naphtha_in = base_row.get("Naphtha_in", base_row.get("Naphtha_in [mol%]"))
        naphtha_out = base_row.get("Naphtha_out", base_row.get("Naphtha_out [mol%]"))
        if not _is_valid_number(naphtha_in) or float(naphtha_in) == 0:
            ratio_error = "ERROR: Invalid Naphtha_in [mol%]"
        elif not _is_valid_number(naphtha_out):
            ratio_error = "ERROR: Invalid Naphtha_out [mol%]"
        else:
            ratio_error = ""
            ratio = float(naphtha_out) / float(naphtha_in)

        for column in numeric_columns:
            value = carbon_row.get(column, "")
            if value in (None, ""):
                result[column] = ""
            elif ratio_error:
                result[column] = ratio_error
            elif _is_valid_number(value):
                result[column] = float(value) * ratio
            else:
                result[column] = "ERROR: Invalid source value"
        result["_row_error"] = ratio_error
        result_rows.append(result)

    return {"columns": columns, "rows": result_rows, "record_count": len(result_rows)}
