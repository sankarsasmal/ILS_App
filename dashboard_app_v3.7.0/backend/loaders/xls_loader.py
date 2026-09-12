import re
import olefile
import xlrd
from datetime import datetime
import pandas as pd

from backend.calculations.constants import *
from backend.validators.values import clean_numeric_value, normalize_header
from backend.calculations.component_category import build_component_category

DT = re.compile(r"S1_\d+_(\d{4}-\d{2}-\d{2})\s+(\d{2})-(\d{2})-(\d{2})")

UID = re.compile(r"([A-Za-z0-9]+_C\d+_S\d+_\d+)_\d{4}-\d{2}-\d{2}")


def open_xls(path):
    with olefile.OleFileIO(str(path)) as ole:
        stream = (
            "Workbook"
            if ole.exists("Workbook")
            else "Book"
            if ole.exists("Book")
            else None
        )

        if not stream:
            raise ValueError("Workbook/Book OLE stream not found")

        raw = ole.openstream(stream).read()

    return xlrd.open_workbook(file_contents=raw, ignore_workbook_corruption=True)


def extract_metadata(workbook):

    if HEADER_SHEET not in workbook.sheet_names():
        raise ValueError("HEADER worksheet not found")

    header_sheet = workbook.sheet_by_name(HEADER_SHEET)

    text = str(header_sheet.cell_value(5, 1)).strip()

    date_match = DT.search(text)
    uid_match = UID.search(text)

    if not date_match or not uid_match:
        raise ValueError("UID or DateTime pattern not found in HEADER!B6")

    date_string, hh, mm, ss = date_match.groups()

    dt = datetime.strptime(f"{date_string} {hh}:{mm}:{ss}", "%Y-%m-%d %H:%M:%S")

    return (uid_match.group(1), dt.strftime("%d/%m/%Y %H:%M"))


def canonical_header(value):

    header = normalize_header(value)

    text = (
        str(header).strip().upper().replace(" ", "").replace("-", "").replace("_", "")
    )

    aliases = {
        "PARAFFIN": "Paraffin",
        "PARAFFINS": "Paraffin",
        "IPARAFFINS": "I-Paraffins",
        "ISOPARAFFINS": "I-Paraffins",
        "AROMATIC": "Aromatics",
        "AROMATICS": "Aromatics",
        "NAPHTHENE": "Naphthenes",
        "NAPHTHENES": "Naphthenes",
        "OLEFIN": "Olefins",
        "OLEFINS": "Olefins",
        "UNKNOWN": "Unknown",
        "UNKNOWNS": "Unknown",
        "UNIDENTIFIED": "Unknown",
        "CARBON#": "CARBON#",
        "CARBON": "CARBON#",
    }

    return aliases.get(text, header)


def extract(path):

    workbook = open_xls(path)

    uid, dt = extract_metadata(workbook)

    if CARBON_SHEET not in workbook.sheet_names():
        raise ValueError(f"{CARBON_SHEET} worksheet not found")

    sheet = workbook.sheet_by_name(CARBON_SHEET)

    # K21 = row 20, column 10 (zero-based)
    try:
        unknowns_value = clean_numeric_value(sheet.cell_value(20, 10))
    except Exception:
        unknowns_value = None

    header_row = None
    column_index = None

    for r in range(min(sheet.nrows, 15)):
        headers = [canonical_header(sheet.cell_value(r, c)) for c in range(sheet.ncols)]

        current = {h: c for c, h in enumerate(headers) if h}

        if "CARBON#" in current and any(
            comp in current
            for comp in [
                "Paraffin",
                "I-Paraffins",
                "Aromatics",
                "Naphthenes",
                "Olefins",
            ]
        ):
            header_row = r
            column_index = current
            break

    if header_row is None:
        raise ValueError("Carbon table header row not found")

    required = [
        "CARBON#",
        "Paraffin",
        "I-Paraffins",
        "Aromatics",
        "Naphthenes",
        "Olefins",
    ]

    missing = [x for x in required if x not in column_index]

    if missing:
        raise ValueError(f"Missing required headers: {missing}")

    components = [
        "Paraffin",
        "I-Paraffins",
        "Aromatics",
        "Naphthenes",
        "Olefins",
        "Unknown",
    ]

    results = []

    for component in components:
        row = {
            "File Name": path.name,
            "UID": uid,
            "DateTime": dt,
            "Component": component,
            "Unknowns": unknowns_value,
        }

        row.update({f"C{n}": None for n in range(1, 16)})

        if component in column_index:
            for r in range(header_row + 1, sheet.nrows):
                carbon = clean_numeric_value(
                    sheet.cell_value(r, column_index["CARBON#"])
                )

                if carbon is not None and int(carbon) in range(1, 16):
                    row[f"C{int(carbon)}"] = clean_numeric_value(
                        sheet.cell_value(r, column_index[component])
                    )

        results.append(row)

    return results


def extract_component_list(path):

    workbook = open_xls(path)

    uid, dt = extract_metadata(workbook)

    sheet_name = "COMPONENT_LIST"

    if sheet_name not in workbook.sheet_names():
        raise ValueError("COMPONENT_LIST worksheet not found")

    sheet = workbook.sheet_by_name(sheet_name)

    header_row = None
    column_map = None

    for r in range(min(sheet.nrows, 30)):
        headers = {str(sheet.cell_value(r, c)).strip(): c for c in range(sheet.ncols)}

        if {"COMPONENT", "%WGT", "CARBON#"}.issubset(headers):
            header_row = r
            column_map = headers
            break

    if header_row is None:
        raise ValueError("COMPONENT_LIST headers not found")

    records = []

    for r in range(header_row + 1, sheet.nrows):
        component = str(sheet.cell_value(r, column_map["COMPONENT"])).strip()

        if not component:
            continue

        records.append(
            {
                "COMPONENT": component,
                "%WGT": sheet.cell_value(r, column_map["%WGT"]),
                "CARBON#": sheet.cell_value(r, column_map["CARBON#"]),
            }
        )

    df = pd.DataFrame(records)

    values = build_component_category(df)

    return {"File Name": path.name, "UID": uid, "DateTime": dt, **values}

def extract_octane(path):
    """Extract per-file octane values from OCTANE_NUMBERS!B1:B4.

    Output fields are File Name, UID, DateTime, Lin-RON, Lin-MON, Cal-RON,
    and Cal-MON. Blank or nonnumeric cells are returned as None.
    """
    workbook = open_xls(path)
    uid, dt = extract_metadata(workbook)
    sheet_name = "OCTANE_NUMBERS"
    if sheet_name not in workbook.sheet_names():
        raise ValueError("OCTANE_NUMBERS worksheet not found")
    sheet = workbook.sheet_by_name(sheet_name)
    if sheet.nrows < 4 or sheet.ncols < 2:
        raise ValueError("Required range OCTANE_NUMBERS!B1:B4 is incomplete")
    fields = ("Lin-RON", "Lin-MON", "Cal-RON", "Cal-MON")
    values = [clean_numeric_value(sheet.cell_value(row, 1)) for row in range(4)]
    return {"File Name": path.name, "UID": uid, "DateTime": dt, **dict(zip(fields, values))}
