"""
Agricultural Task Recommendation System
========================================
This module provides intelligent rescheduling suggestions for agricultural tasks
based on weather forecasts and sensor data to optimize crop management and prevent losses.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime, timedelta
from app.core.supabase_client import supabase
from app.data_processing import get_thresholds
from app.services.task_eval_threshold_service import get_task_eval_thresholds_payload, TASK_EVAL_DEFAULTS

# ============================================================================
# API Router Configuration
# ============================================================================
router = APIRouter(
    prefix="/suggestions",
    tags=["suggestions"]
)

# ============================================================================
# Data Models
# ============================================================================

class SensorSummary(BaseModel):
    """
    Summary of sensor readings from the field
    - avg_moisture: Average soil moisture percentage (%)
    - avg_temp: Average temperature (°C)
    """
    avg_moisture: Optional[float] = 0.0
    avg_temp: Optional[float] = 0.0

class RescheduleRequest(BaseModel):
    """
    Request payload for rescheduling suggestions
    - tasks: List of scheduled tasks with their details
    - weather_forecast: Weather predictions for upcoming days
    - sensor_summary: Current field sensor readings
    """
    tasks: List[Dict[str, Any]]
    weather_forecast: List[Dict[str, Any]]
    sensor_summary: Optional[SensorSummary] = None

# ============================================================================
# Helper Functions
# ============================================================================

def check_sensor_health():
    """
    Check if sensor readings have been out of threshold for more than 24 hours.
    Returns dict with alerts for moisture and temperature if they're out of range.
    """
    alerts = []
    
    # 🔴 MOCK MODE: Uncomment below to show example sensor alerts in UI
    # return [
    #     {
    #         "sensor": "moisture",
    #         "duration_hours": 28.5,
    #         "current_value": 5.2,
    #         "threshold_min": 15.0,
    #         "threshold_max": 25.0
    #     },
    #     {
    #         "sensor": "temperature",
    #         "duration_hours": 30.2,
    #         "current_value": 12.8,
    #         "threshold_min": 22.0,
    #         "threshold_max": 32.0
    #     }
    # ]
    
    try:
        # Get current thresholds
        thresholds = get_thresholds()
        
        # Query cleaned_data for the last 24+ hours
        # Get data from last 30 hours to be safe
        time_threshold = (datetime.now() - timedelta(hours=30)).isoformat()
        
        response = supabase.table("cleaned_data")\
            .select("timestamp, temperature, soil_moisture")\
            .gte("timestamp", time_threshold)\
            .order("timestamp")\
            .execute()
        
        if not response.data or len(response.data) < 2:
            # Not enough data to make determination
            return alerts
        
        df = pd.DataFrame(response.data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Check moisture readings
        if 'soil_moisture' in df.columns:
            # Find readings outside threshold
            moisture_out = df[
                (df['soil_moisture'] < thresholds['soil_moisture_min']) | 
                (df['soil_moisture'] > thresholds['soil_moisture_max'])
            ]
            
            if len(moisture_out) > 0:
                # Check if first and last out-of-range readings span > 24 hours
                time_span = (moisture_out['timestamp'].max() - moisture_out['timestamp'].min()).total_seconds() / 3600
                
                # Also check if most recent reading is out of range
                latest_moisture = df.iloc[-1]['soil_moisture']
                is_currently_out = (latest_moisture < thresholds['soil_moisture_min']) or \
                                  (latest_moisture > thresholds['soil_moisture_max'])
                
                if time_span >= 24 and is_currently_out:
                    alerts.append({
                        "sensor": "moisture",
                        "duration_hours": round(time_span, 1),
                        "current_value": round(latest_moisture, 2),
                        "threshold_min": thresholds['soil_moisture_min'],
                        "threshold_max": thresholds['soil_moisture_max']
                    })
        
        # Check temperature readings
        if 'temperature' in df.columns:
            # Find readings outside threshold
            temp_out = df[
                (df['temperature'] < thresholds['temperature_min']) | 
                (df['temperature'] > thresholds['temperature_max'])
            ]
            
            if len(temp_out) > 0:
                # Check if first and last out-of-range readings span > 24 hours
                time_span = (temp_out['timestamp'].max() - temp_out['timestamp'].min()).total_seconds() / 3600
                
                # Also check if most recent reading is out of range
                latest_temp = df.iloc[-1]['temperature']
                is_currently_out = (latest_temp < thresholds['temperature_min']) or \
                                  (latest_temp > thresholds['temperature_max'])
                
                if time_span >= 24 and is_currently_out:
                    alerts.append({
                        "sensor": "temperature",
                        "duration_hours": round(time_span, 1),
                        "current_value": round(latest_temp, 2),
                        "threshold_min": thresholds['temperature_min'],
                        "threshold_max": thresholds['temperature_max']
                    })
        
        return alerts
        
    except Exception as e:
        print(f"Error checking sensor health: {e}")
        return []

# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/weather-reschedule")
def get_weather_reschedule_suggestions(payload: RescheduleRequest):
    """
    Main Endpoint: Analyzes scheduled tasks and provides intelligent recommendations
    
    This endpoint evaluates each task against:
    1. Weather forecasts (rain, temperature, humidity)
    2. Real-time sensor data (soil moisture, temperature)
    3. Crop-specific requirements and constraints
    
    Returns:
        Dictionary containing a list of actionable suggestions with reasoning
    """
    try:
        # Extract payload data
        tasks = payload.tasks
        weather_data = payload.weather_forecast
        sensor_data = payload.sensor_summary
        
        # Early return if no tasks to analyze
        if not tasks:
            return {"suggestions": []}

        # ============================================================
        # STEP 1: Prepare Weather Data
        # ============================================================
        # Convert weather data to pandas DataFrame for easier manipulation
        weather_df = pd.DataFrame(weather_data) if weather_data else pd.DataFrame()
        
        if not weather_df.empty:
            # Standardize rain column name (different APIs may use different names)
            if 'rain' not in weather_df.columns and 'precipitation' in weather_df.columns:
                 weather_df['rain'] = weather_df['precipitation']
            
            # Standardize datetime column for temporal operations
            if 'time' in weather_df.columns:
                weather_df['datetime'] = pd.to_datetime(weather_df['time'])
            elif 'date' in weather_df.columns:
                 weather_df['datetime'] = pd.to_datetime(weather_df['date'])
        
        # ============================================================
        # STEP 2: Load Task Evaluation Thresholds from Database
        # ============================================================
        task_thresholds, _ = get_task_eval_thresholds_payload()
        # Fallback to defaults if DB returns empty
        if not task_thresholds:
            task_thresholds = TASK_EVAL_DEFAULTS
        
        # ============================================================
        # STEP 3: Generate Recommendations
        # ============================================================
        suggestions = generate_insight_recommendations(tasks, weather_df, sensor_data, task_thresholds)
        return {"suggestions": suggestions}

    except Exception as e:
        # Log error and return user-friendly message
        print(f"Error generating suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Rule-Based Recommendation Engine
# ============================================================================

# ----------------------------------------------------------------------------
# Configuration Constants: Task Categories
# NOTE: Threshold values now loaded from task_eval_thresholds table in DB
# ----------------------------------------------------------------------------

# RULE 1: Rain Prevention - Thresholds loaded from DB
# Default fallback values (used only if DB query fails):
# rain_mm_min = 2.0 mm (rainy weather threshold)
# rain_mm_heavy = 10.0 mm (heavy rain threshold)

# Tasks sensitive to rain (can be washed away or become ineffective)
RAIN_SENSITIVE_TYPES = [
    'fertilization',  # Fertilizer can be washed away before absorption
    'hormone',        # Hormones need dry conditions to be absorbed by plants
    'weeding',        # Wet conditions make weeding difficult and ineffective
    'land-prep'       # Land preparation requires dry soil for proper work
]

# RULE 2: Soil Moisture Management - Thresholds loaded from DB
# Default fallback values (used only if DB query fails):
# soil_moisture_min = 15.0% (dry soil threshold)
# soil_moisture_max = 25.0% (waterlogging threshold)

# Tasks affected by excessive soil moisture
MOISTURE_SENSITIVE_TYPES = [
    'weeding',    # Muddy conditions make weeding impossible
    'hormone',    # Poor root absorption in waterlogged soil
    'harvesting', # Difficult to harvest in muddy conditions
    'land-prep'   # Machinery can get stuck in wet soil
]

# RULE 3: Temperature Management - Thresholds loaded from DB
# Default fallback values (used only if DB query fails):
# temperature_min = 22.0°C (cold stress threshold)
# temperature_max = 32.0°C (heat stress threshold)

# Tasks sensitive to high temperature
HEAT_SENSITIVE_TYPES = [
    'hormone',                # Hormones degrade in high heat
    'flower_induction',       # Flowering hormones are temperature-sensitive
    'spraying',               # Evaporation reduces effectiveness
    'transplanting'           # High heat causes transplant shock
]

# Task template codes for specific operations
FLOWER_INDUCTION_CODES = ['TPL_FLOWER_INDUCTION', 'FLOWER_INDUCTION']


# ----------------------------------------------------------------------------
# Main Recommendation Generation Function
# ----------------------------------------------------------------------------

def generate_insight_recommendations(scheduled_tasks, weather_forecast_df, sensor_summary, thresholds=None):
    """
    Core Intelligence Engine: Generates recommendations based on multiple rules
    
    This function evaluates each scheduled task against environmental conditions
    and generates specific, actionable recommendations to optimize task timing
    and prevent crop damage or resource waste.
    
    Args:
        scheduled_tasks: List of tasks with scheduling information
        weather_forecast_df: DataFrame containing weather predictions
        sensor_summary: Current sensor readings from the field
        thresholds: Dict of threshold values from task_eval_thresholds table
    
    Returns:
        List of recommendation dictionaries with detailed reasoning
    """
    # Use provided thresholds or fallback to defaults
    if not thresholds:
        thresholds = TASK_EVAL_DEFAULTS
    
    # Extract threshold values
    RAIN_THRESHOLD = thresholds.get('rain_mm_min', 2.0)
    HEAVY_RAIN_THRESHOLD = thresholds.get('rain_mm_heavy', 10.0)
    DRY_SOIL_THRESHOLD = thresholds.get('soil_moisture_min', 15.0)
    WATERLOGGING_THRESHOLD = thresholds.get('soil_moisture_max', 25.0)
    COLD_STRESS_THRESHOLD = thresholds.get('temperature_min', 22.0)
    HEAT_STRESS_THRESHOLD = thresholds.get('temperature_max', 32.0)
    
    # Additional constants not in DB
    CLEAR_SKIES_THRESHOLD = 1.0  # mm - Less than 1mm = clear skies
    OPTIMAL_MOISTURE_MIN = DRY_SOIL_THRESHOLD  # Use same as dry threshold
    OPTIMAL_MOISTURE_MAX = WATERLOGGING_THRESHOLD  # Use same as waterlogging threshold
    OPTIMAL_TEMP_MIN = COLD_STRESS_THRESHOLD  # Use same as cold threshold
    OPTIMAL_TEMP_MAX = HEAT_STRESS_THRESHOLD  # Use same as heat threshold
    
    recommendations = []
    
    # ============================================================
    # STEP 1: Build Weather Calendar
    # ============================================================
    # Create a daily summary of weather conditions for quick lookup
    # This optimizes performance when checking multiple tasks
    
    calendar = {}  # Format: {date_str: {'rain': float, 'temp': float}}
    
    if not weather_forecast_df.empty:
        # Ensure we have a date string column for grouping
        if 'date_str' not in weather_forecast_df.columns:
             weather_forecast_df['date_str'] = weather_forecast_df['datetime'].dt.strftime('%Y-%m-%d')
        
        # Aggregate weather data by day (sum rain, average temperature)
        daily_weather = weather_forecast_df.groupby('date_str').agg({
            'rain': 'sum',  # Total daily rainfall
            'temperature': 'mean' if 'temperature' in weather_forecast_df.columns else 'first'
        })
        
        # Convert to dictionary for O(1) lookup
        calendar = daily_weather.to_dict('index')
    
    # ============================================================
    # STEP 2: Generate Global Status Messages (Field-Level Insights)
    # ============================================================
    # These are informational messages showing overall field conditions
    
    if sensor_summary:
        # --------------------------------------------------------
        # MOISTURE STATUS MESSAGES
        # --------------------------------------------------------
        if sensor_summary.avg_moisture > WATERLOGGING_THRESHOLD:
            # Sustained High Moisture: >25% for 24 hours
            recommendations.append({
                "task_id": "global_moisture_high",
                "task_name": "🔒 Waterlogging Risk",
                "original_date": "Immediate",
                "suggested_date": "Check drainage today",
                "type": "TRIGGER",
                "severity": "CRITICAL",
                "reason": "Waterlogging Risk: Soil saturated for >24h. Check drainage immediately to prevent heart rot and root loss.",
                "affected_by": "sensor_moisture"
            })
        elif sensor_summary.avg_moisture < DRY_SOIL_THRESHOLD:
            # Dry Soil: <15%
            recommendations.append({
                "task_id": "global_moisture_low",
                "task_name": "💧 Irrigation Needed",
                "original_date": "Immediate",
                "suggested_date": "Schedule irrigation soon",
                "type": "ALERT",
                "severity": "MODERATE",
                "reason": "Irrigation Needed: Soil moisture is dropping. Monitor closely to avoid plant stress.",
                "affected_by": "sensor_moisture"
            })
        elif OPTIMAL_MOISTURE_MIN <= sensor_summary.avg_moisture <= OPTIMAL_MOISTURE_MAX:
            # Optimal Moisture: 15% - 25%
            recommendations.append({
                "task_id": "global_moisture_optimal",
                "task_name": "✅ Optimal Moisture",
                "original_date": "Current",
                "suggested_date": "N/A",
                "type": "INFO",
                "severity": "LOW",
                "reason": "Optimal: Soil moisture is within the ideal range for pineapple root health.",
                "affected_by": "sensor_moisture"
            })
        
        # --------------------------------------------------------
        # TEMPERATURE STATUS MESSAGES
        # --------------------------------------------------------
        if sensor_summary.avg_temp > HEAT_STRESS_THRESHOLD:
            # Heat Stress: >35C
            recommendations.append({
                "task_id": "global_temp_high",
                "task_name": "🌡️ Heat Stress Alert",
                "original_date": "Current",
                "suggested_date": "Adjust task timing",
                "type": "ALERT",
                "severity": "MODERATE",
                "reason": "Heat Stress Alert: High temps detected. Move hormone/induction tasks to morning or evening to prevent evaporation.",
                "affected_by": "sensor_temperature"
            })
        elif sensor_summary.avg_temp < COLD_STRESS_THRESHOLD:
            # Cold Stress: <20C
            recommendations.append({
                "task_id": "global_temp_low",
                "task_name": "❄️ Growth Retardation",
                "original_date": "Current",
                "suggested_date": "Delay fertilization",
                "type": "ALERT",
                "severity": "MODERATE",
                "reason": " Growth Retardation: Temperatures are too low. Postpone heavy fertilization as the plant cannot process nutrients efficiently.",
                "affected_by": "sensor_temperature"
            })
        elif OPTIMAL_TEMP_MIN <= sensor_summary.avg_temp <= OPTIMAL_TEMP_MAX:
            # Optimal Temp: 20C - 35C
            recommendations.append({
                "task_id": "global_temp_optimal",
                "task_name": "✅ Optimal Temperature",
                "original_date": "Current",
                "suggested_date": "N/A",
                "type": "INFO",
                "severity": "LOW",
                "reason": " Optimal Temp: Perfect conditions for growth and chemical absorption.",
                "affected_by": "sensor_temperature"
            })
    
    # --------------------------------------------------------
    # WEATHER STATUS MESSAGES (from calendar data)
    # --------------------------------------------------------
    # Check overall weather conditions for upcoming days
    if calendar:
        # Get average daily rain across all dates in calendar
        total_rain = sum(day.get('rain', 0) for day in calendar.values())
        avg_rain = total_rain / len(calendar) if calendar else 0
        
        if avg_rain > HEAVY_RAIN_THRESHOLD:
            # Heavy Rain: >10mm
            recommendations.append({
                "task_id": "global_weather_heavy_rain",
                "task_name": "☔ Heavy Rain Alert",
                "original_date": "Forecast Period",
                "suggested_date": "Inspect field",
                "type": "TRIGGER",
                "severity": "HIGH",
                "reason": " Heavy Rain Alert: Increased risk of field erosion. Inspect plot for standing water.",
                "affected_by": "weather_rain"
            })
        elif avg_rain > RAIN_THRESHOLD:
            # Rainy Weather: >2mm
            recommendations.append({
                "task_id": "global_weather_rain",
                "task_name": "☔ Rain Warning",
                "original_date": "Forecast Period",
                "suggested_date": "Halt spraying tasks",
                "type": "ALERT",
                "severity": "MODERATE",
                "reason": " Rain Warning: Rain detected. Halt all spraying tasks (Foliar/Hormone) to prevent nutrient washout.",
                "affected_by": "weather_rain"
            })
        elif avg_rain < CLEAR_SKIES_THRESHOLD:
            # Clear Skies: <1mm
            recommendations.append({
                "task_id": "global_weather_clear",
                "task_name": "☀️ Clear Skies",
                "original_date": "Forecast Period",
                "suggested_date": "N/A",
                "type": "INFO",
                "severity": "LOW",
                "reason": " Clear Skies: Weather is stable. Proceed with all scheduled field operations.",
                "affected_by": "weather_rain"
            })
    
    # --------------------------------------------------------
    # SENSOR HEALTH ALERTS
    # --------------------------------------------------------
    # Check if sensors have been reporting out-of-threshold values for >24 hours
    # This may indicate sensor malfunction or connectivity issues
    sensor_health_alerts = check_sensor_health()
    
    for alert in sensor_health_alerts:
        if alert['sensor'] == 'moisture':
            recommendations.append({
                "task_id": "sensor_alert_moisture",
                "task_name": "Moisture Sensor Alert",
                "original_date": "Immediate",
                "suggested_date": "Check sensor hardware",
                "type": "TRIGGER",
                "severity": "CRITICAL",
                "reason": f"Sensor Alert: Moisture readings out of normal range ({alert['threshold_min']}-{alert['threshold_max']}%) for {alert['duration_hours']}+ hours. Current: {alert['current_value']}%. Sensor may be broken or lost connectivity. Check hardware.",
                "affected_by": "sensor_health"
            })
        elif alert['sensor'] == 'temperature':
            recommendations.append({
                "task_id": "sensor_alert_temperature",
                "task_name": "Temperature Sensor Alert",
                "original_date": "Immediate",
                "suggested_date": "Check sensor hardware",
                "type": "TRIGGER",
                "severity": "CRITICAL",
                "reason": f"Sensor Alert: Temperature readings out of normal range ({alert['threshold_min']}-{alert['threshold_max']}°C) for {alert['duration_hours']}+ hours. Current: {alert['current_value']}°C. Sensor may be broken or lost connectivity. Check hardware.",
                "affected_by": "sensor_health"
            })

    return recommendations
