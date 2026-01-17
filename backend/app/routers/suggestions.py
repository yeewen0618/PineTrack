from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime

router = APIRouter(
    prefix="/suggestions",
    tags=["suggestions"]
)

class SensorSummary(BaseModel):
    avg_n: Optional[float] = 0.0
    avg_moisture: Optional[float] = 0.0
    avg_temp: Optional[float] = 0.0

class RescheduleRequest(BaseModel):
    tasks: List[Dict[str, Any]]
    weather_forecast: List[Dict[str, Any]]
    sensor_summary: Optional[SensorSummary] = None

@router.post("/weather-reschedule")
def get_weather_reschedule_suggestions(payload: RescheduleRequest):
    """
    Analyzes tasks against weather forecast and sensor data to suggest rescheduling or actions.
    """
    try:
        tasks = payload.tasks
        weather_data = payload.weather_forecast
        sensor_data = payload.sensor_summary
        
        if not tasks:
            return {"suggestions": []}

        # Convert weather data to DataFrame
        weather_df = pd.DataFrame(weather_data) if weather_data else pd.DataFrame()
        
        # Ensure 'rain' column exists
        if not weather_df.empty:
            if 'rain' not in weather_df.columns and 'precipitation' in weather_df.columns:
                 weather_df['rain'] = weather_df['precipitation']
            
            # Ensure datetime
            if 'time' in weather_df.columns:
                weather_df['datetime'] = pd.to_datetime(weather_df['time'])
            elif 'date' in weather_df.columns:
                 weather_df['datetime'] = pd.to_datetime(weather_df['date'])
        
        suggestions = generate_insight_recommendations(tasks, weather_df, sensor_data)
        return {"suggestions": suggestions}

    except Exception as e:
        print(f"Error generating suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_insight_recommendations(scheduled_tasks, weather_forecast_df, sensor_summary):
    recommendations = []
    
    # --- RULE 1: RAIN PREVENTION (Rain > 2.0mm) ---
    # Condition: Forecast Rain > 2.0mm
    # Affected: fertilization, hormone, weeding, land-prep
    RAIN_THRESHOLD = 2.0
    RAIN_SENSITIVE_TYPES = ['fertilization', 'hormone', 'weeding', 'land-prep']

    # Pre-calculate daily weather inputs
    calendar = {} # date_str -> rain_sum
    if not weather_forecast_df.empty:
        if 'date_str' not in weather_forecast_df.columns:
             weather_forecast_df['date_str'] = weather_forecast_df['datetime'].dt.strftime('%Y-%m-%d')
        # Sum rain by day
        daily_sums = weather_forecast_df.groupby('date_str')['rain'].sum()
        calendar = daily_sums.to_dict()

    for task in scheduled_tasks:
        task_date = task.get('task_date') or task.get('due_date')
        task_type = task.get('type', '').lower()
        task_tpl = task.get('tpl_code', '') # Assuming tpl_code might be passed
        
        # Check Rule 1 (Rain)
        if any(t in task_type for t in RAIN_SENSITIVE_TYPES):
            rain_val = calendar.get(task_date, 0.0)
            if rain_val > RAIN_THRESHOLD:
                recommendations.append({
                    "task_id": task.get('id'),
                    "task_name": task.get('title'),
                    "original_date": task_date,
                    "suggested_date": "Next clear day", # Simplified for now
                    "type": "RESCHEDULE",
                    "reason": f"Forecast rain ({rain_val:.1f}mm) > 2mm. Avoid washout/muddy conditions."
                })

        # Check Rule 2 (Waterlogging) - Soil Moisture > 80%
        # Affected: weeding, hormone
        if sensor_summary and sensor_summary.avg_moisture > 80:
             if any(t in task_type for t in ['weeding', 'hormone']):
                 recommendations.append({
                    "task_id": task.get('id'),
                    "task_name": task.get('title'),
                    "original_date": task_date,
                    "suggested_date": "Postpone", 
                    "type": "RESCHEDULE",
                    "reason": f"Soil Moisture ({sensor_summary.avg_moisture:.1f}%) > 80%. Field too muddy."
                })

        # Check Rule 3 (Nitrogen Surplus) - Nitrogen > 100 (Threshold)
        # Affected: fertilization
        if sensor_summary and sensor_summary.avg_n > 100:
            if 'fertilization' in task_type:
                recommendations.append({
                    "task_id": task.get('id'),
                    "task_name": task.get('title'),
                    "original_date": task_date,
                    "suggested_date": "Delay advising",
                    "type": "DELAY",
                    "reason": f"Nitrogen ({sensor_summary.avg_n:.0f}) is sufficient. Delay to prevent toxicity."
                })

        # Check Rule 4 (Heat Stress) - Temp > 35
        # Affected: hormone, TPL_FLOWER_INDUCTION
        if sensor_summary and sensor_summary.avg_temp > 35:
            is_hormone = 'hormone' in task_type
            is_flower = 'TPL_FLOWER_INDUCTION' in task_tpl # Need to ensure tpl_code is passed from frontend if available
            # Fallback if tpl_code not available, check title or type
            if is_flower or 'flower' in task.get('title', '').lower(): 
                is_flower = True

            if is_hormone or is_flower:
                recommendations.append({
                    "task_id": task.get('id'),
                    "task_name": task.get('title'),
                    "original_date": task_date,
                    "suggested_date": "Early Morning/Evening",
                    "type": "TIME_SHIFT",
                    "reason": f"High Temp ({sensor_summary.avg_temp:.1f}°C). Apply during cooler hours."
                })

    # --- Global Triggers (Independent of specific tasks) ---
    
    # Rule 2 Extension: Waterlogging Trigger
    if sensor_summary and sensor_summary.avg_moisture > 80:
        recommendations.append({
            "task_id": "trigger_drainage",
            "task_name": "Drainage Inspection",
            "original_date": "Immediate",
            "suggested_date": "Today",
            "type": "TRIGGER", 
            "reason": f"Waterlogging detected (Moisture {sensor_summary.avg_moisture:.1f}% > 80%). Inspect drainage."
        })

    return recommendations
