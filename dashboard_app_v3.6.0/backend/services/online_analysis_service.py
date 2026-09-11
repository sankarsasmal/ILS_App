from pathlib import Path

import pandas as pd


ONLINE_COLUMNS = [
    "Date/Time",
    "Sampled_reactor",
    "10i1TIC02",
    "10i2TIC02",
    "10i1PIC01",
    "10i2PIC01",
    "01i14FIC01",
    "01i14FIC02",
    "01i14FIC03",
    "01i14FIC04",
    "01i14FIC05",
    "01i14FIC06",
    "01i14FIC07",
    "01i14FIC08",
    "01i14FI01",
    "ESTD_H2",
    "ESTD_N2",
]


def process_online_file(file_path):
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise ValueError("Selected Online Analysis file does not exist.")
    if path.suffix.lower() != ".txt":
        raise ValueError("Online Analysis requires a tab-delimited .txt file.")

    try:
        frame = pd.read_csv(path, delimiter="\t", encoding="mbcs")
    except (LookupError, UnicodeDecodeError):
        frame = pd.read_csv(path, delimiter="\t", encoding="utf-8-sig")

    missing = [column for column in ONLINE_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(
            f"Online Analysis file is missing columns: {', '.join(missing)}"
        )

    frame = frame[ONLINE_COLUMNS].copy()
    try:
        frame["Date/Time"] = pd.to_datetime(
            frame["Date/Time"], format="%d.%m.%Y %H:%M:%S"
        )
    except (TypeError, ValueError) as error:
        raise ValueError(
            "Date/Time values must use the format DD.MM.YYYY HH:MM:SS."
        ) from error

    frame = frame.rename(
        columns={"Date/Time": "DateTime", "Sampled_reactor": "Reactor"}
    )
    frame["DateTime"] = frame["DateTime"].dt.strftime("%Y-%m-%d %H:%M:%S")
    frame = frame.where(pd.notna(frame), None)

    columns = ["DateTime", "Reactor", *ONLINE_COLUMNS[2:]]
    return {
        "rows": frame.to_dict(orient="records"),
        "columns": columns,
        "record_count": len(frame),
        "source_file": str(path),
    }
