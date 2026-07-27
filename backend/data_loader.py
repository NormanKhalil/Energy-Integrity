import pandas as pd
import os

CSV_PATH = os.path.join(os.path.dirname(__file__), "data.csv")

def load_data() -> pd.DataFrame:
    """Load and lightly clean the Nawabshah loadshedding CSV."""
    df = pd.read_csv(CSV_PATH)
    df["Billing_Month"] = pd.to_datetime(df["Billing_Month"], format="%Y-%m")
    df["Year"]  = df["Billing_Month"].dt.year
    df["Month"] = df["Billing_Month"].dt.month
    return df
