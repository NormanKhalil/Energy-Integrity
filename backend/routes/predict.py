from flask import Blueprint, jsonify, request
from data_loader import load_data
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pandas as pd
import numpy as np

predict_bp = Blueprint("predict", __name__)

AREA_LABELS = {
    "Society Colony Nawabshah":   "Society Colony",
    "Farsi Bagh Nawabshah":       "Farsi Bagh",
    "Gareebabad Nawabshah":       "Gareebabad",
    "Manwabad Nawabshah":         "Manwabad",
    "University Colony Nawabshah":"Uni Colony",
    "Isharpura Nawabshah":        "Isharpura",
}

def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode categorical columns and return feature matrix."""
    le_area    = LabelEncoder()
    le_feeder  = LabelEncoder()
    feat = df.copy()
    feat["Area_enc"]   = le_area.fit_transform(feat["Area"])
    feat["Feeder_enc"] = le_feeder.fit_transform(feat["Feeder_Type"])
    return feat, le_area, le_feeder


# ── /api/predict/loadshedding ────────────────────────────────────────────────
# Returns per-area predicted loadshedding hours for a given future month
@predict_bp.route("/loadshedding")
def predict_loadshedding():
    future_month = int(request.args.get("month", 7))  # default: July (peak summer)
    future_year  = int(request.args.get("year",  2026))

    df = load_data()
    feat, le_area, le_feeder = _build_features(df)

    X = feat[["Area_enc", "Feeder_enc", "Month", "Year",
               "Units_Consumed_kWh", "Bill_Amount_PKR"]]
    y = feat["Loadshedding_Hours_Per_Day"]

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    results = []
    for area in df["Area"].unique():
        area_rows = df[df["Area"] == area]
        feeder    = area_rows["Feeder_Type"].iloc[0]

        area_enc   = le_area.transform([area])[0]
        feeder_enc = le_feeder.transform([feeder])[0]
        avg_units  = area_rows["Units_Consumed_kWh"].mean()
        avg_bill   = area_rows["Bill_Amount_PKR"].mean()

        pred = model.predict([[area_enc, feeder_enc, future_month,
                                future_year, avg_units, avg_bill]])[0]

        results.append({
            "name":      AREA_LABELS.get(area, area),
            "predicted": round(pred, 2),
        })

    results.sort(key=lambda x: x["predicted"], reverse=True)
    return jsonify({
        "month":       future_month,
        "year":        future_year,
        "predictions": results,
    })


# ── /api/predict/theft_risk ──────────────────────────────────────────────────
# Classifies each area's next-month theft risk: High / Medium / Low
@predict_bp.route("/theft_risk")
def predict_theft_risk():
    df = load_data()
    feat, le_area, le_feeder = _build_features(df)

    # Binary target: 1 = theft suspected
    feat["theft_flag"] = (feat["Electricity_Theft_Suspected"] == "Yes").astype(int)

    X = feat[["Area_enc", "Feeder_enc", "Month", "Year",
               "Loadshedding_Hours_Per_Day", "Units_Consumed_kWh",
               "Units_Billed_kWh", "Bill_Amount_PKR"]]
    y = feat["theft_flag"]

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    results = []
    future_month = 7  # worst summer month for next prediction window
    future_year  = 2026

    for area in df["Area"].unique():
        area_rows  = df[df["Area"] == area]
        feeder     = area_rows["Feeder_Type"].iloc[0]
        area_enc   = le_area.transform([area])[0]
        feeder_enc = le_feeder.transform([feeder])[0]
        avg_ls     = area_rows["Loadshedding_Hours_Per_Day"].mean()
        avg_units  = area_rows["Units_Consumed_kWh"].mean()
        avg_billed = area_rows["Units_Billed_kWh"].mean()
        avg_bill   = area_rows["Bill_Amount_PKR"].mean()

        prob = clf.predict_proba([[area_enc, feeder_enc, future_month, future_year,
                                   avg_ls, avg_units, avg_billed, avg_bill]])[0][1]

        risk = "High" if prob >= 0.5 else ("Medium" if prob >= 0.25 else "Low")
        results.append({
            "name":       AREA_LABELS.get(area, area),
            "riskLevel":  risk,
            "riskPct":    round(prob * 100, 1),
        })

    results.sort(key=lambda x: x["riskPct"], reverse=True)
    return jsonify(results)


# ── /api/predict/forecast_timeseries ─────────────────────────────────────────
# Returns historical monthly avg + 6-month ML forecast for the line chart
@predict_bp.route("/forecast_timeseries")
def forecast_timeseries():
    area = request.args.get("area", "all")
    df = load_data()
    feat, le_area, le_feeder = _build_features(df)

    X = feat[["Area_enc", "Feeder_enc", "Month", "Year",
               "Units_Consumed_kWh", "Bill_Amount_PKR"]]
    y = feat["Loadshedding_Hours_Per_Day"]

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                   7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}

    # historical: monthly average cross selected area (or all areas)
    hist_df = df.copy()
    if area != "all":
        hist_df = hist_df[hist_df["Area"].str.contains(area, case=False, na=False)]

    hist = (hist_df.groupby("Month")["Loadshedding_Hours_Per_Day"]
              .mean().reset_index())
    hist_list = [
        {"month": month_names[row["Month"]], "historical": round(row["Loadshedding_Hours_Per_Day"], 2), "predicted": None}
        for _, row in hist.iterrows()
    ]

    # forecast: next 6 months from Jan 2026
    future_months = [(2026, m) for m in range(1, 7)]
    
    if area != "all":
        # average encoder values for this specific area
        area_rows = feat[feat["Area"].str.contains(area, case=False, na=False)]
        if len(area_rows) > 0:
            avg_area_enc   = area_rows["Area_enc"].mean()
            avg_feeder_enc = area_rows["Feeder_enc"].mean()
            avg_units      = area_rows["Units_Consumed_kWh"].mean()
            avg_bill       = area_rows["Bill_Amount_PKR"].mean()
        else:
            avg_area_enc   = feat["Area_enc"].mean()
            avg_feeder_enc = feat["Feeder_enc"].mean()
            avg_units      = df["Units_Consumed_kWh"].mean()
            avg_bill       = df["Bill_Amount_PKR"].mean()
    else:
        avg_area_enc   = feat["Area_enc"].mean()
        avg_feeder_enc = feat["Feeder_enc"].mean()
        avg_units      = df["Units_Consumed_kWh"].mean()
        avg_bill       = df["Bill_Amount_PKR"].mean()

    forecast_list = []
    for yr, mo in future_months:
        pred = model.predict([[avg_area_enc, avg_feeder_enc, mo, yr, avg_units, avg_bill]])[0]
        forecast_list.append({
            "month": f"{month_names[mo]} {yr}",
            "historical": None,
            "predicted": round(pred, 2)
        })

    return jsonify(hist_list + forecast_list)
