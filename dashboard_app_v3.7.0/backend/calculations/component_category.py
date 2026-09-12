"""COMPONENT_LIST aggregation from HC_category.py. Values use %WGT."""
import pandas as pd


def build_component_category(df):
    required = {"COMPONENT", "%WGT", "CARBON#"}
    missing = required - set(df.columns)

    if missing:
        raise ValueError(
            f"COMPONENT_LIST missing columns: {sorted(missing)}"
        )

    values = {}

    propane = df.index[df["COMPONENT"].eq("Propane")]

    # Propane is optional
    if propane.empty:
        values["C3 & Below"] = 0.0
        start_index = 0
    else:
        first = propane[0]

        values["C3 & Below"] = float(
            pd.to_numeric(
                df.loc[: first - 1, "%WGT"],
                errors="coerce"
            ).sum()
        )

        start_index = first

    for i, row in df.loc[start_index:].iterrows():
        component = row["COMPONENT"]
        weight = pd.to_numeric(row["%WGT"], errors="coerce")

        if pd.isna(weight):
            continue

        if component != "Unidentified":
            values[component] = (
                values.get(component, 0.0) + float(weight)
            )
            continue

        prev = (
            df.loc[: i - 1]
            .loc[df.loc[: i - 1, "COMPONENT"] != "Unidentified"]
            .tail(1)
        )

        nxt = (
            df.loc[i + 1 :]
            .loc[df.loc[i + 1 :, "COMPONENT"] != "Unidentified"]
            .head(1)
        )

        if not prev.empty and not nxt.empty:
            key = (
                f"C{int(prev.iloc[0]['CARBON#'])}"
                f"-C{int(nxt.iloc[0]['CARBON#'])}"
            )

            values[key] = (
                values.get(key, 0.0) + float(weight)
            )

    return values