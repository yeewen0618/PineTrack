import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from datetime import timedelta
from sklearn.impute import SimpleImputer
import math
from app.core.supabase_client import supabase

def forecast_pipeline():
    print("🤖 Starting AI Forecasting Pipeline (Evaluation Mode - RAW DATA)...")

    # --- 1. FETCH DATA (Still from cleaned_data table as it has raw columns too) ---
    print("Fetching historical training data...")
    response = supabase.table("cleaned_data").select("*").order("data_added", desc=True).limit(2000).execute()
    data = response.data
    
    if not data:
        print("No training data found in 'cleaned_data'.")
        return

    df = pd.DataFrame(data)
    
    # Sort by time ascending
    df['data_added'] = pd.to_datetime(df['data_added'])
    df = df.sort_values('data_added').reset_index(drop=True)

    # Note: 'cleaned_data' table has columns 'temperature', 'soil_moisture' etc. as the RAW values
    # and 'cleaned_temperature', etc. as the CLEANED values.
    # Here we use the raw column names directly.
    sensors = ['temperature', 'soil_moisture', 'nitrogen']
    
    # --- 2. TRAIN & EVALUATE FOR EACH SENSOR ---
    for sensor in sensors:
        print(f"\n📊 --- Evaluating Model for: {sensor.upper()} (RAW DATA) ---")
        
        target_col = sensor  # Using the raw column name (e.g., 'temperature')
        if target_col not in df.columns:
            print(f"Skipping {sensor}: Not found.")
            continue

        # Feature Engineering
        df_model = df.copy()
        df_model['hour'] = df_model['data_added'].dt.hour
        df_model['dayofweek'] = df_model['data_added'].dt.dayofweek
        df_model['lag_1'] = df_model[target_col].shift(1)
        df_model['lag_24'] = df_model[target_col].shift(24)
        
        # Raw data might have NaNs (gaps). We must handle them for the model to work.
        # We drop rows where TARGET or FEATURES are NaN.
        # This effectively ignores gaps in evaluation, which is fair for comparison 
        # (predicting only when we have data).
        df_model = df_model.dropna(subset=['hour', 'dayofweek', 'lag_1', 'lag_24', target_col])

        if df_model.empty:
            print("Not enough data (likely too many gaps in raw data).")
            continue

        X = df_model[['hour', 'dayofweek', 'lag_1', 'lag_24']]
        y = df_model[target_col]

        # Train/Test Split (Time-based, not random)
        train_size = int(len(df_model) * 0.8)
        X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
        y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]
        
        if X_train.empty or X_test.empty:
            print("Not enough data after split.")
            continue

        # Train
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)

        # Predict on Test set
        y_pred = model.predict(X_test)

        # Calculate Metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = math.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"   RMSE (Root Mean Sq Error): {rmse:.4f}")
        print(f"   MAE (Mean Abs Error):      {mae:.4f}")
        print(f"   R-Squared Score:           {r2:.4f}")

    print("\n✅ Evaluation complete. (Raw data performance)")

if __name__ == "__main__":
    forecast_pipeline()
