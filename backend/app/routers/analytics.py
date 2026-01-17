from fastapi import APIRouter, HTTPException, Query
from app.core.supabase_client import supabase
from app.forecasting import generate_forecasts
from app.weather_service import fetch_weather_data, fetch_dashboard_weather
from typing import List, Optional
import time

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

# --- SIMPLE IN-MEMORY CACHE ---
# Stores the result of generate_forecasts() to avoid re-training models on every refresh.
# Structure: { "data": [...], "timestamp": 1234567890 }
FORECAST_CACHE = {
    "data": None,
    "timestamp": 0,
    "days_param": 0
}
CACHE_DURATION_SECONDS = 3600  # 1 hour

@router.get("/weather")
def get_weather_analytics():
    """
    Fetch historical and forecast weather data from Open-Meteo.
    """
    try:
        return fetch_weather_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weather/dashboard")
def get_dashboard_weather_data():
    """
    Fetch current weather and 10-day forecast for the dashboard.
    """
    try:
        return fetch_dashboard_weather()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast")
def get_forecast_data(days: int = 7):
    """
    Generate future forecasts using the AI model.
    Cached for 1 hour to improve performance.
    """
    try:
        # Cap days to prevent timeout
        if days > 90:
            days = 90
        
        # Check Cache
        current_time = time.time()
        if (FORECAST_CACHE["data"] is not None and 
            FORECAST_CACHE["days_param"] == days and
            (current_time - FORECAST_CACHE["timestamp"]) < CACHE_DURATION_SECONDS):
            print("🚀 Returning Cached Forecast Data")
            return FORECAST_CACHE["data"]

        print("⚡ Generating New Forecast (This might take a moment)...")
        data = generate_forecasts(days)
        
        # Update Cache
        FORECAST_CACHE["data"] = data
        FORECAST_CACHE["timestamp"] = current_time
        FORECAST_CACHE["days_param"] = days
        
        return data
    except Exception as e:
        print(f"Forecast Error: {e}")
        # If generation fails but we have old cache, maybe return that?
        # For now, just error out.
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_historical_data(days: int = 30):
    """
    Fetch historical data (raw and cleaned) for charts.
    """
    try:
        # Calculate limit based on days (assuming ~24 records per day per device)
        # We'll just fetch the latest N records for simplicity or modify query to filter by date if needed.
        # Ideally, we filter by 'data_added' > (now - days)
        
        # For now, let's just fetch the last 1000 records to ensure we have enough points
        response = supabase.table("cleaned_data").select("*").order("data_added", desc=True).limit(1000).execute()
        
        # Reverse to have chronological order for the chart
        data = response.data[::-1] 
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
