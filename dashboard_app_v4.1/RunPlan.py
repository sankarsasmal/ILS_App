import os
from pathlib import Path
import pandas as pd

DEFAULT_RUN_PLAN_PATH = os.environ.get(
    "RUN_PLAN_FILE",
    str(Path(__file__).resolve().parent / "data" / "RunPlan.xlsx"),
)
if not Path(DEFAULT_RUN_PLAN_PATH).exists() and Path(r"C:\Users\sanka\Desktop\Python_Playground\RunPlan.xlsx").exists():
    DEFAULT_RUN_PLAN_PATH = r"C:\Users\sanka\Desktop\Python_Playground\RunPlan.xlsx"


def read_excel_range(file_path, sheet_name, range_string):
    """
    Reads a specific range from a specific sheet.
    Example range_string: 'A2:B2'
    """
    # Split the range into start/end columns and rows
    start_cell, end_cell = range_string.split(":")

    # Extract columns (letters) and rows (numbers)
    start_col = "".join([c for c in start_cell if c.isalpha()])
    end_col = "".join([c for c in end_cell if c.isalpha()])

    start_row = int("".join([c for c in start_cell if c.isdigit()]))
    end_row = int("".join([c for c in end_cell if c.isdigit()]))

    # Calculate rows to skip and total rows to read
    # skiprows is 0-indexed, so row 2 means skipping 1 row
    skip = start_row - 1
    nrows = (end_row - start_row) + 1
    cols = f"{start_col}:{end_col}"

    # Read the separate sheet
    return pd.read_excel(
        file_path,
        sheet_name=sheet_name,
        skiprows=skip,
        nrows=nrows,
        usecols=cols,
        header=None,
    )


def load_run_plan_data(file_path=None):
    """
    Loads df_plan, df_Loading_plan, df_DOE, and df_synFeed/df_feed from the Excel workbook.
    """
    path = file_path or DEFAULT_RUN_PLAN_PATH
    if not Path(path).exists():
        raise FileNotFoundError(f"RunPlan Excel file not found: {path}")

    # Read "Plan" sheet (A2:B2)
    df_plan_local = read_excel_range(path, sheet_name="Plan", range_string="A2:B2")
    df_loading_local = read_excel_range(path, sheet_name="Plan", range_string="A4:j14")

    # Read "DOE" sheet (range A10:M58)
    df_doe_local = read_excel_range(path, sheet_name="DOE", range_string="A10:M58")
    # Fill the NaN caused by the horizontal merge (1st two columns)
    df_doe_local.iloc[:, 0:2] = df_doe_local.iloc[:, 0:2].ffill(axis=0)

    # Read "Feed" sheet (range A2:E25)
    df_feed_local = read_excel_range(path, sheet_name="Feed", range_string="A2:E25")

    return {
        "df_plan": df_plan_local,
        "df_Loading_plan": df_loading_local,
        "df_Plan": df_loading_local,
        "df_DOE": df_doe_local,
        "df_synFeed": df_feed_local,
        "df_feed": df_feed_local,
    }


# Initialize default module-level DataFrames if default file exists
file_path = DEFAULT_RUN_PLAN_PATH
if Path(file_path).exists():
    _data = load_run_plan_data(file_path)
    df_plan = _data["df_plan"]
    df_Loading_plan = _data["df_Loading_plan"]
    df_Plan = _data["df_Plan"]
    df_DOE = _data["df_DOE"]
    df_synFeed = _data["df_synFeed"]
    df_feed = _data["df_feed"]
else:
    df_plan = pd.DataFrame()
    df_Loading_plan = pd.DataFrame()
    df_Plan = pd.DataFrame()
    df_DOE = pd.DataFrame()
    df_synFeed = pd.DataFrame()
    df_feed = pd.DataFrame()


if __name__ == "__main__":
    print("df_plan:")
    print(df_plan)
    print("\ndf_Plan (Loading Plan):")
    print(df_Plan)
    print("\ndf_DOE shape:", df_DOE.shape)
    print("\ndf_feed shape:", df_feed.shape)
