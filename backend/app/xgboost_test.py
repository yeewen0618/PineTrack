import pandas as pd
import numpy as np
import xgboost as xgb  # Changed from RandomForest
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from datetime import timedelta
import math
import warnings
from app.core.supabase_client import supabase

# Suppress minor warnings for a clean terminal
warnings.filterwarnings("ignore", category=UserWarning)

def forecast_pipeline():
    print("🤖 Starting AI Forecasting Pipeline (XGBoost Mode)...")

    # --- 1. FETCH CLEANED DATA ---
    print("Fetching historical training data...")
    response = supabase.table("cleaned_data").select("*").order("data_added", desc=True).limit(2000).execute()
    data = response.data
    
    if not data:
        print("No training data found in 'cleaned_data'.")
        return

    df = pd.DataFrame(data)
    df['data_added'] = pd.to_datetime(df['data_added'])
    df = df.sort_values('data_added').reset_index(drop=True)

    sensors = ['temperature', 'soil_moisture', 'nitrogen']
    
    for sensor in sensors:
        print(f"\n📊 --- Evaluating XGBoost Model for: {sensor.upper()} ---")
        
        target_col = f'cleaned_{sensor}'
        if target_col not in df.columns:
            print(f"Skipping {sensor}: Not found.")
            continue

        # Feature Engineering
        df_model = df.copy()
        df_model['hour'] = df_model['data_added'].dt.hour
        df_model['dayofweek'] = df_model['data_added'].dt.dayofweek
        df_model['lag_1'] = df_model[target_col].shift(1)
        df_model['lag_24'] = df_model[target_col].shift(24)
        
        df_model = df_model.dropna(subset=['hour', 'dayofweek', 'lag_1', 'lag_24', target_col])

        if df_model.empty:
            print("Not enough data.")
            continue

        feature_cols = ['hour', 'dayofweek', 'lag_1', 'lag_24']
        X = df_model[feature_cols]
        y = df_model[target_col]

        # Time-based Train/Test Split
        train_size = int(len(df_model) * 0.8)
        X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
        y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

        # --- UPDATED: XGBOOST MODEL ---
        # Using standard parameters suited for sensor data
        model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            objective='reg:squarederror',
            random_state=42
        )
        model.fit(X_train, y_train)

        # Predict on Test set
        y_pred = model.predict(X_test)

        # Calculate Metrics
        rmse = math.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"   RMSE (Root Mean Sq Error): {rmse:.4f}")
        print(f"   MAE (Mean Abs Error):      {mae:.4f}")
        print(f"   R-Squared Score:           {r2:.4f}")

    print("\n✅ XGBoost Evaluation complete.")

if __name__ == "__main__":
    forecast_pipeline()
