"""
Model Comparison: Random Forest vs XGBoost
Compare forecasting performance for temperature and soil moisture
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
import math
from app.core.supabase_client import supabase

def compare_models():
    """
    Compare Random Forest vs XGBoost for temperature and moisture forecasting
    """
    print("=" * 70)
    print("MODEL COMPARISON: Random Forest vs XGBoost")
    print("=" * 70)
    
    # Fetch data
    print("\n[1] Fetching cleaned data from database...")
    response = supabase.table("cleaned_data").select("*").order("data_added", desc=True).limit(2000).execute()
    data = response.data
    
    if not data:
        print("❌ No data found!")
        return
    
    df = pd.DataFrame(data)
    df['data_added'] = pd.to_datetime(df['data_added'])
    df = df.sort_values('data_added').reset_index(drop=True)
    print(f"✅ Loaded {len(df)} records")
    
    sensors = ['temperature', 'soil_moisture']
    results = {}
    
    for sensor in sensors:
        print(f"\n{'=' * 70}")
        print(f"TESTING: {sensor.upper()}")
        print(f"{'=' * 70}")
        
        target_col = f'cleaned_{sensor}'
        if target_col not in df.columns:
            print(f"❌ Column {target_col} not found")
            continue
        
        # Feature Engineering
        df_model = df.copy()
        df_model['hour'] = df_model['data_added'].dt.hour
        df_model['dayofweek'] = df_model['data_added'].dt.dayofweek
        df_model['lag_1'] = df_model[target_col].shift(1)
        df_model['lag_24'] = df_model[target_col].shift(24)
        df_model = df_model.dropna()
        
        if len(df_model) < 100:
            print(f"❌ Not enough data after feature engineering")
            continue
        
        # Prepare train/test split
        features = ['hour', 'dayofweek', 'lag_1', 'lag_24']
        X = df_model[features]
        y = df_model[target_col]
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=False
        )
        
        print(f"\n📊 Dataset:")
        print(f"   Training samples: {len(X_train)}")
        print(f"   Testing samples:  {len(X_test)}")
        
        # ================================================================
        # MODEL 1: Random Forest
        # ================================================================
        print(f"\n🌲 Training Random Forest...")
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        rf_model.fit(X_train, y_train)
        rf_pred = rf_model.predict(X_test)
        
        rf_mse = mean_squared_error(y_test, rf_pred)
        rf_mae = mean_absolute_error(y_test, rf_pred)
        rf_r2 = r2_score(y_test, rf_pred)
        rf_rmse = math.sqrt(rf_mse)
        
        print(f"   ✅ Training complete")
        print(f"   📈 Random Forest Metrics:")
        print(f"      RMSE: {rf_rmse:.4f}")
        print(f"      MAE:  {rf_mae:.4f}")
        print(f"      R²:   {rf_r2:.4f}")
        
        # ================================================================
        # MODEL 2: XGBoost
        # ================================================================
        print(f"\n🚀 Training XGBoost...")
        xgb_model = XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            n_jobs=-1
        )
        xgb_model.fit(X_train, y_train)
        xgb_pred = xgb_model.predict(X_test)
        
        xgb_mse = mean_squared_error(y_test, xgb_pred)
        xgb_mae = mean_absolute_error(y_test, xgb_pred)
        xgb_r2 = r2_score(y_test, xgb_pred)
        xgb_rmse = math.sqrt(xgb_mse)
        
        print(f"   ✅ Training complete")
        print(f"   📈 XGBoost Metrics:")
        print(f"      RMSE: {xgb_rmse:.4f}")
        print(f"      MAE:  {xgb_mae:.4f}")
        print(f"      R²:   {xgb_r2:.4f}")
        
        # ================================================================
        # COMPARISON
        # ================================================================
        print(f"\n🏆 WINNER ANALYSIS:")
        print(f"   {'Metric':<10} {'Random Forest':<15} {'XGBoost':<15} {'Winner':<15}")
        print(f"   {'-' * 60}")
        
        # Lower is better for RMSE and MAE
        rmse_winner = "Random Forest" if rf_rmse < xgb_rmse else "XGBoost"
        mae_winner = "Random Forest" if rf_mae < xgb_mae else "XGBoost"
        r2_winner = "Random Forest" if rf_r2 > xgb_r2 else "XGBoost"  # Higher is better for R²
        
        print(f"   {'RMSE':<10} {rf_rmse:<15.4f} {xgb_rmse:<15.4f} {rmse_winner:<15}")
        print(f"   {'MAE':<10} {rf_mae:<15.4f} {xgb_mae:<15.4f} {mae_winner:<15}")
        print(f"   {'R²':<10} {rf_r2:<15.4f} {xgb_r2:<15.4f} {r2_winner:<15}")
        
        # Calculate improvement percentages
        rmse_improvement = abs(rf_rmse - xgb_rmse) / max(rf_rmse, xgb_rmse) * 100
        mae_improvement = abs(rf_mae - xgb_mae) / max(rf_mae, xgb_mae) * 100
        
        print(f"\n   💡 Improvement: {rmse_improvement:.2f}% in RMSE, {mae_improvement:.2f}% in MAE")
        
        # Overall winner (based on majority of metrics)
        wins = {
            'Random Forest': [rmse_winner, mae_winner, r2_winner].count('Random Forest'),
            'XGBoost': [rmse_winner, mae_winner, r2_winner].count('XGBoost')
        }
        overall_winner = max(wins, key=wins.get)
        print(f"\n   🎯 Overall Winner for {sensor}: {overall_winner}")
        
        # Store results
        results[sensor] = {
            'rf': {'rmse': rf_rmse, 'mae': rf_mae, 'r2': rf_r2},
            'xgb': {'rmse': xgb_rmse, 'mae': xgb_mae, 'r2': xgb_r2},
            'winner': overall_winner
        }
    
    # ================================================================
    # FINAL SUMMARY
    # ================================================================
    print(f"\n{'=' * 70}")
    print("FINAL SUMMARY")
    print(f"{'=' * 70}")
    
    for sensor, data in results.items():
        print(f"\n📊 {sensor.upper()}:")
        print(f"   Random Forest - RMSE: {data['rf']['rmse']:.4f}, MAE: {data['rf']['mae']:.4f}, R²: {data['rf']['r2']:.4f}")
        print(f"   XGBoost       - RMSE: {data['xgb']['rmse']:.4f}, MAE: {data['xgb']['mae']:.4f}, R²: {data['xgb']['r2']:.4f}")
        print(f"   ✅ Best Model: {data['winner']}")
    
    # Overall recommendation
    winners = [data['winner'] for data in results.values()]
    if winners.count('Random Forest') > winners.count('XGBoost'):
        recommendation = "Random Forest"
    elif winners.count('XGBoost') > winners.count('Random Forest'):
        recommendation = "XGBoost"
    else:
        recommendation = "Both models perform similarly"
    
    print(f"\n{'=' * 70}")
    print(f"🎯 RECOMMENDATION: Use {recommendation} for your system")
    print(f"{'=' * 70}\n")
    
    return results


if __name__ == "__main__":
    compare_models()
