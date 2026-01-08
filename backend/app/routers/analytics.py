from fastapi import APIRouter, HTTPException, Query
from app.core.supabase_client import supabase
from app.forecasting import generate_forecasts
from app.recommendations import run_decision_support
from typing import List, Optional

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

@router.get("/recommendations")
def get_recommendations(device_id: int = 205):
    """
    Run the decision engine and return recommendations for the device.
    """
    try:
        # Run logic on demand (or rely on background job, but on-demand is fine for MVP)
        data = run_decision_support(device_id)
        return data
    except Exception as e:
        print(f"Recommendation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast")
def get_forecast_data(days: int = 7):
    """
    Generate future forecasts using the AI model.
    """
    try:
        # Cap days to prevent timeout
        if days > 90:
            days = 90
            
        data = generate_forecasts(days)
        return data
    except Exception as e:
        print(f"Forecast Error: {e}")
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
