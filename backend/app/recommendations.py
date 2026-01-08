import pandas as pd
from datetime import datetime, timedelta
from app.core.supabase_client import supabase

def run_decision_support(device_id: int):
    """
    Analyzes historical and forecast data to generate actionable recommendations.
    Refreshes the 'recommendations' table for the given device.
    """
    print(f"🧠 Generating Recommendations for Device {device_id}...")

    # --- 1. Fetch History (Last 24 Hours) ---
    # We use 'cleaned_soil_moisture' and 'cleaned_nitrogen' for accuracy
    response = supabase.table("cleaned_data")\
        .select("cleaned_soil_moisture, cleaned_nitrogen, data_added")\
        .eq("device_id", device_id)\
        .order("data_added", desc=True)\
        .limit(24).execute()
    
    hist_data = response.data
    hist_df = pd.DataFrame(hist_data) if hist_data else pd.DataFrame()

    # --- 2. Fetch Forecast (Next 48 Hours) ---
    pred_response = supabase.table("predictions")\
        .select("soil_moisture, forecast_time")\
        .eq("device_id", device_id)\
        .order("forecast_time", asc=True)\
        .limit(48).execute()
    
    pred_data = pred_response.data
    pred_df = pd.DataFrame(pred_data) if pred_data else pd.DataFrame()

    daily_tasks = []

    # Safe retrieval of latest values
    latest_n = 0
    latest_m = 0
    
    if not hist_df.empty:
        latest_n = hist_df['cleaned_nitrogen'].iloc[0]
        latest_m = hist_df['cleaned_soil_moisture'].iloc[0]
    else:
        # Fallback if no history (e.g. new device)
        daily_tasks.append({
            "device_id": device_id,
            "category": "Info",
            "parameter": "System",
            "message": "Waiting for sufficient sensor data to generate specific insights.",
            "priority": 5
        })

    # ================= RULES ENGINE =================

    # --- RULE 1: WATERLOGGING CHECK (History Based) ---
    # Condition: Soil moisture > 25% for ALL of the last 24 records (assuming hourly)
    if not hist_df.empty and len(hist_df) >= 12: # Check at least 12 points to be safe
        sustained_moisture = (hist_df['cleaned_soil_moisture'] > 25).all()
        if sustained_moisture:
            daily_tasks.append({
                "device_id": device_id,
                "category": "Critical",
                "parameter": "Moisture",
                "message": "🚨 WATERLOGGING DETECTED: Soil saturated (>25%) for sustained period. Check drainage immediately to prevent root rot.",
                "priority": 1
            })

    # --- RULE 2: RAIN PREDICTION (Forecast Based) ---
    # Condition: AI predicts moisture > 25% at any point in next 48 hours
    if not pred_df.empty and 'soil_moisture' in pred_df.columns:
        rain_predicted = (pred_df['soil_moisture'] > 25).any()
        if rain_predicted:
            daily_tasks.append({
                "device_id": device_id,
                "category": "Warning",
                "parameter": "Weather",
                "message": "🌧️ RAIN FORECASTED: High soil moisture predicted. Halt fertilization and hormone induction tasks for 48h.",
                "priority": 1
            })

    # --- RULE 3: NITROGEN / FERTILIZER MANAGEMENT (Current State) ---
    if not hist_df.empty:
        if latest_n < 35:
            daily_tasks.append({
                "device_id": device_id,
                "category": "Action",
                "parameter": "Nitrogen",
                "message": "🌱 LOW NITROGEN: Current levels (<35 mg/kg) hamper growth. Apply Urea or Nitrogen-rich fertilizer.",
                "priority": 2
            })
        elif latest_n > 75:
             daily_tasks.append({
                "device_id": device_id,
                "category": "Info",
                "parameter": "Nitrogen",
                "message": "✅ OPTIMAL NITROGEN: Levels are sufficient (>75 mg/kg). No fertilizer required at this stage.",
                "priority": 3
            })
        else:
             daily_tasks.append({
                "device_id": device_id,
                "category": "Info",
                "parameter": "Nitrogen",
                "message": "✅ NITROGEN STABLE: Levels are within acceptable range (35-75 mg/kg). Monitor weekly.",
                "priority": 4
            })

    # --- 3. SAVE RECOMMENDATIONS ---
    # clear old recs for this device
    try:
        supabase.table("recommendations").delete().eq("device_id", device_id).execute()
        
        if daily_tasks:
            supabase.table("recommendations").insert(daily_tasks).execute()
            print(f"✅ Saved {len(daily_tasks)} recommendations for Device {device_id}.")
        
        return daily_tasks
    except Exception as e:
        print(f"⚠️ Failed to update recommendations: {e}")
        return []
