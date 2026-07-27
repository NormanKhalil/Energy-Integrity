from flask import Blueprint, jsonify, request, Response
from data_loader import load_data
import numpy as np
import io
import csv

dashboard_bp = Blueprint("dashboard", __name__)

# Short area labels used by the frontend charts
AREA_LABELS = {
    "Society Colony Nawabshah":   "Society Colony",
    "Farsi Bagh Nawabshah":       "Farsi Bagh",
    "Gareebabad Nawabshah":       "Gareebabad",
    "Manwabad Nawabshah":         "Manwabad",
    "University Colony Nawabshah":"Uni Colony",
    "Isharpura Nawabshah":        "Isharpura",
}


# ── helper: filter by year or "all" ──────────────────────────────────────────
# ── helper: filter by year and/or area or "all" ──────────────────────────────
def _filter(df, year, area=None):
    if year and year != "all":
        df = df[df["Year"] == int(year)]
    if area and area != "all":
        df = df[df["Area"].str.contains(area, case=False, na=False)]
    return df


# ── /api/dashboard/kpis ──────────────────────────────────────────────────────
@dashboard_bp.route("/kpis")
def kpis():
    year = request.args.get("year")
    area = request.args.get("area")
    df = _filter(load_data(), year, area)

    if len(df) == 0:
        return jsonify({
            "total_loadshedding_hrs": 0,
            "worst_area": "N/A",
            "worst_area_avg_hrs": 0,
            "billing_compliance_pct": 0,
            "highest_theft_area": "N/A",
            "overall_theft_pct": 0,
        })

    total_ls = round(df["Loadshedding_Hours_Per_Day"].sum(), 1)
    
    try:
        worst_area = (df.groupby("Area")["Loadshedding_Hours_Per_Day"]
                      .mean().idxmax())
        worst_hours = round(df.groupby("Area")["Loadshedding_Hours_Per_Day"]
                            .mean().max(), 1)
    except Exception:
        worst_area = "N/A"
        worst_hours = 0

    paid_pct = round(
        100 * (df["Bill_Payment_Status"] == "Paid").sum() / len(df), 1)

    try:
        theft_area = (df[df["Electricity_Theft_Suspected"] == "Yes"]
                      .groupby("Area").size().idxmax())
    except Exception:
        theft_area = "N/A"
        
    theft_pct = round(
        100 * (df["Electricity_Theft_Suspected"] == "Yes").sum() / len(df), 1)

    return jsonify({
        "total_loadshedding_hrs": total_ls,
        "worst_area":             AREA_LABELS.get(worst_area, worst_area),
        "worst_area_avg_hrs":     worst_hours,
        "billing_compliance_pct": paid_pct,
        "highest_theft_area":     AREA_LABELS.get(theft_area, theft_area),
        "overall_theft_pct":      theft_pct,
    })


# ── /api/dashboard/area_stats ────────────────────────────────────────────────
@dashboard_bp.route("/area_stats")
def area_stats():
    year = request.args.get("year")
    # Area stats chart displays comparison, so we only filter by year
    df = _filter(load_data(), year)

    results = []
    for area, grp in df.groupby("Area"):
        total   = len(grp)
        paid    = (grp["Bill_Payment_Status"] == "Paid").sum()
        unpaid  = (grp["Bill_Payment_Status"] == "Unpaid").sum()
        partial = (grp["Bill_Payment_Status"] == "Partially Paid").sum()
        theft   = (grp["Electricity_Theft_Suspected"] == "Yes").sum()

        results.append({
            "name":             AREA_LABELS.get(area, area),
            "fullName":         area,
            "loadshedding":     round(grp["Loadshedding_Hours_Per_Day"].mean(), 2),
            "theftRate":        round(100 * theft / total, 1),
            "billingPaid":      round(100 * paid    / total, 1),
            "billingUnpaid":    round(100 * unpaid  / total, 1),
            "billingPartial":   round(100 * partial / total, 1),
            "avgBillPKR":       round(grp["Bill_Amount_PKR"].mean(), 0),
            "totalCustomers":   total,
        })

    # sort by loadshedding descending so worst area is first
    results.sort(key=lambda x: x["loadshedding"], reverse=True)
    return jsonify(results)


# ── /api/dashboard/timeseries ────────────────────────────────────────────────
@dashboard_bp.route("/timeseries")
def timeseries():
    year = request.args.get("year")
    area = request.args.get("area")
    df   = _filter(load_data(), year, area)

    month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
                   7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}

    if len(df) == 0:
        return jsonify([])

    ts = (df.groupby("Month")["Loadshedding_Hours_Per_Day"]
            .mean().reset_index())
    ts["month"] = ts["Month"].map(month_names)

    return jsonify([
        {"month": row["month"], "historical": round(row["Loadshedding_Hours_Per_Day"], 2)}
        for _, row in ts.iterrows()
    ])


# ── /api/dashboard/billing_breakdown ─────────────────────────────────────────
@dashboard_bp.route("/billing_breakdown")
def billing_breakdown():
    year = request.args.get("year")
    area = request.args.get("area")
    df   = _filter(load_data(), year, area)

    total = len(df)
    if total == 0:
        return jsonify({
            "paid": 0, "unpaid": 0, "partial": 0,
            "paid_pct": 0, "unpaid_pct": 0, "partial_pct": 0
        })

    paid    = (df["Bill_Payment_Status"] == "Paid").sum()
    unpaid  = (df["Bill_Payment_Status"] == "Unpaid").sum()
    partial = (df["Bill_Payment_Status"] == "Partially Paid").sum()

    return jsonify({
        "paid":    int(paid),
        "unpaid":  int(unpaid),
        "partial": int(partial),
        "paid_pct":    round(100 * paid    / total, 1),
        "unpaid_pct":  round(100 * unpaid  / total, 1),
        "partial_pct": round(100 * partial / total, 1),
    })


# ── /api/dashboard/theft_summary ─────────────────────────────────────────────
@dashboard_bp.route("/theft_summary")
def theft_summary():
    year = request.args.get("year")
    df   = _filter(load_data(), year)

    rows = []
    for area, grp in df.groupby("Area"):
        theft_grp    = grp[grp["Electricity_Theft_Suspected"] == "Yes"]
        no_theft_grp = grp[grp["Electricity_Theft_Suspected"] == "No"]

        avg_diff = 0.0
        if len(theft_grp):
            avg_diff = round(
                (theft_grp["Units_Consumed_kWh"] - theft_grp["Units_Billed_kWh"]).mean(), 2
            )

        rows.append({
            "name":               AREA_LABELS.get(area, area),
            "theftCases":         int((grp["Electricity_Theft_Suspected"] == "Yes").sum()),
            "avgUnitDiff_kWh":    avg_diff,   # consumed - billed → theft indicator
            "theftRate":          round(100 * len(theft_grp) / len(grp), 1),
        })

    rows.sort(key=lambda x: x["theftRate"], reverse=True)
    return jsonify(rows)


# ── /api/dashboard/years ─────────────────────────────────────────────────────
@dashboard_bp.route("/years")
def years():
    df = load_data()
    return jsonify(sorted(df["Year"].unique().tolist()))


# ── /api/dashboard/export ────────────────────────────────────────────────────
@dashboard_bp.route("/export")
def export():
    year = request.args.get("year", "all")
    area = request.args.get("area", "all")
    df = _filter(load_data(), year, area)

    # We write to an in-memory string buffer and return it as a Response
    output = io.StringIO()
    writer = csv.writer(output)

    # Header block
    writer.writerow(["Nawabshah Grid Analytics Report"])
    writer.writerow(["Generated on", "2026-07-24"])
    writer.writerow(["Report Year Filter", year.capitalize() if year != "all" else "All Years"])
    writer.writerow(["Report Area Filter", area.capitalize() if area != "all" else "All Areas"])
    writer.writerow([])

    # Aggregated Summary table
    writer.writerow(["--- AREA SUMMARY STATISTICS ---"])
    writer.writerow([
        "Area",
        "Avg Loadshedding Hours/Day",
        "Theft Rate (%)",
        "Billing Paid (%)",
        "Billing Partial (%)",
        "Billing Unpaid (%)",
        "Avg Bill (PKR)",
        "Total Customers"
    ])

    for area_name, grp in df.groupby("Area"):
        total = len(grp)
        paid = (grp["Bill_Payment_Status"] == "Paid").sum()
        unpaid = (grp["Bill_Payment_Status"] == "Unpaid").sum()
        partial = (grp["Bill_Payment_Status"] == "Partially Paid").sum()
        theft = (grp["Electricity_Theft_Suspected"] == "Yes").sum()

        writer.writerow([
            area_name,
            round(grp["Loadshedding_Hours_Per_Day"].mean(), 2),
            round(100 * theft / total, 1),
            round(100 * paid / total, 1),
            round(100 * partial / total, 1),
            round(100 * unpaid / total, 1),
            round(grp["Bill_Amount_PKR"].mean(), 0),
            total
        ])

    writer.writerow([])
    writer.writerow(["--- RAW CUSTOMER RECORDS ---"])

    # Write column names
    writer.writerow(df.columns.tolist())

    # Write rows
    for _, row in df.iterrows():
        writer.writerow(row.tolist())

    output.seek(0)
    filename = f"nawabshah_grid_report_{year}_{area.replace(' ', '_')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
