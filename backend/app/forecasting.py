import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from datetime import timedelta
import math
from app.core.supabase_client import supabase

def generate_forecasts(days: int = 7, plot_id: str = None):
    """
    Generates future forecasts for the specified number of days.
    Args:
        days (int): Number of days to forecast (default: 7)
        plot_id (str, optional): Filter data by specific plot (e.g., 'A1'). 
                                 If None, uses all available data.
    Returns: 
        list of dicts: [{date: '2024-01-01', temperature: 25.5, ...}]
    """
    query = supabase.table("cleaned_data").select("*")
    
    # Filter by plot if specified
    if plot_id:
        query = query.eq("plot_id", plot_id)
    
    # Reduced from 2000 to 1000 for faster performance
    response = query.order("data_added", desc=True).limit(1000).execute()
    data = response.data
    
    if not data:
        return []

    df = pd.DataFrame(data)
    df['data_added'] = pd.to_datetime(df['data_added'])
    df = df.sort_values('data_added').reset_index(drop=True)

    sensors = ['temperature', 'soil_moisture']
    forecast_results = {} # sensor -> [values]
    
    last_known_timestamp = df['data_added'].iloc[-1]
    future_timestamps = [last_known_timestamp + timedelta(hours=i+1) for i in range(days * 24)]

    for sensor in sensors:
        target_col = f'cleaned_{sensor}'
        if target_col not in df.columns:
            continue

        # Feature Engineering (Same as training)
        df_model = df.copy()
        df_model['hour'] = df_model['data_added'].dt.hour
        df_model['dayofweek'] = df_model['data_added'].dt.dayofweek
        df_model['lag_1'] = df_model[target_col].shift(1)
        df_model['lag_24'] = df_model[target_col].shift(24)
        
        # Training Data
        train_df = df_model.dropna(subset=['hour', 'dayofweek', 'lag_1', 'lag_24', target_col])
        
        if train_df.empty:
            forecast_results[sensor] = [0] * len(future_timestamps)
            continue

        X_train = train_df[['hour', 'dayofweek', 'lag_1', 'lag_24']]
        y_train = train_df[target_col]

        # OPTIMIZATION: Reduced n_estimators to 10 and max_depth to 8 for faster response
        # This reduces training time significantly while keeping acceptable accuracy
        model = RandomForestRegressor(
            n_estimators=10,
            max_depth=8,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train, y_train)

        # Iterative Forecasting
        # We need the last known values to start the lag chain
        last_values = df[target_col].values
        future_preds = []
        
        # We need a rolling window of history to pick lags from.
        # Ideally, we append predictions to this history as we go.
        history = list(last_values)

        current_timestamp = last_known_timestamp
        
        for _ in range(days * 24): # Predict hourly
            current_timestamp += timedelta(hours=1)
            
            # Construct features for this specific future hour
            lag_1 = history[-1]
            lag_24 = history[-24] if len(history) >= 24 else history[-1] # Fallback
            
            features = pd.DataFrame([[
                current_timestamp.hour,
                current_timestamp.dayofweek,
                lag_1,
                lag_24
            ]], columns=['hour', 'dayofweek', 'lag_1', 'lag_24'])
            
            pred_val = model.predict(features)[0]
            future_preds.append(pred_val)
            history.append(pred_val)
            
        forecast_results[sensor] = future_preds

    # Aggregate results into list of objects
    final_output = []
    
    # Use plot_id from parameter or get from training data
    # Keep plot_id as string to support both numeric and alphanumeric IDs
    default_plot_id = plot_id if plot_id else 'P001'
    if not df.empty and 'plot_id' in df.columns:
        default_plot_id = df['plot_id'].iloc[0]

    for i, ts in enumerate(future_timestamps):
        entry = {
            "forecast_time": ts.isoformat(),
            "plot_id": default_plot_id,
            "created_at": pd.Timestamp.now().isoformat(),
            "temperature": float(forecast_results.get("temperature", [0]*len(future_timestamps))[i]),
            "soil_moisture": float(forecast_results.get("soil_moisture", [0]*len(future_timestamps))[i])
        }
        final_output.append(entry)
    
    # --- SAVE TO SUPABASE ---
    # User's table is 'predictions' with 'forecast_time'
    if final_output:
        try:
             # Upsert requires a UNIQUE constraint on the conflict column.
             # Since the user's table might not have it yet, we try INSERT to ensure data is saved.
             # TODO: Recommended to add: ALTER TABLE predictions ADD CONSTRAINT unique_forecast UNIQUE (plot_id, forecast_time);
            
            # First, clean up any existing predictions for these times to avoid duplicates (Manual Upsert)
            # This is a bit safer than blindly inserting if we run this often.
            timestamps = [x["forecast_time"] for x in final_output]
            try:
                # Delete existing rows with these timestamps (Optimization: Do in one query if possible)
                # supabase.table("predictions").delete().in_("forecast_time", timestamps).execute()
                pass # Skipping delete for safety for now, purely appending.
            except:
                pass

            response = supabase.table("predictions").insert(final_output).execute()
            print(f"✅ Successfully saved {len(final_output)} predictions to Supabase.")
        except Exception as e:
            print(f"⚠️ Failed to save predictions to Supabase: {e}")
            # Fallback debug
            print("Payload was:", final_output[:1])

    # Return structure compatible with frontend (needs 'date' key)
    frontend_output = [
        {
            "date": item["forecast_time"], 
            "temperature": item["temperature"],
            "soil_moisture": item["soil_moisture"]
        } 
        for item in final_output
    ]
        
    return frontend_output


def forecast_pipeline():
    print("🤖 Starting AI Forecasting Pipeline (Evaluation Mode)...")

    # --- 1. FETCH CLEANED DATA ---
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

    sensors = ['temperature', 'soil_moisture']
    
    # --- 2. TRAIN & EVALUATE FOR EACH SENSOR ---
    # We will use 80% for training and 20% for testing to calculate errors
    
    for sensor in sensors:
        print(f"\n📊 --- Evaluating Model for: {sensor.upper()} ---")
        
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
        
        # Drop NaNs
        df_model = df_model.dropna(subset=['hour', 'dayofweek', 'lag_1', 'lag_24', target_col])

        if df_model.empty:
            print("Not enough data.")
            continue

        X = df_model[['hour', 'dayofweek', 'lag_1', 'lag_24']]
        y = df_model[target_col]

        # Train/Test Split (Time-based, not random)
        train_size = int(len(df_model) * 0.8)
        X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
        y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

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

    print("\n✅ Evaluation complete.")

if __name__ == "__main__":
    # Run forecast and insert results into predictions_test
    print("\n🤖 Running forecast and saving to predictions_test...")
    generate_forecasts(days=7, plot_id=None)
    print("\n✅ Forecasting and insertion complete.")
