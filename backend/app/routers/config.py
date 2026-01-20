from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.supabase_client import supabase
from typing import Optional

router = APIRouter(
    prefix="/config",
    tags=["configuration"]
)

# --- REQUEST/RESPONSE MODELS ---
class ThresholdUpdate(BaseModel):
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    soil_moisture_min: Optional[float] = None
    soil_moisture_max: Optional[float] = None

class ThresholdResponse(BaseModel):
    id: int
    temperature_min: float
    temperature_max: float
    soil_moisture_min: float
    soil_moisture_max: float
    updated_at: str


@router.get("/thresholds", response_model=ThresholdResponse)
def get_thresholds():
    """
    Get current threshold configuration.
    Returns default values if no config exists.
    """
    try:
        response = supabase.table("thresholds").select("*").limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            # Return defaults if table is empty
            return {
                "id": 0,
                "temperature_min": 0,
                "temperature_max": 60,
                "soil_moisture_min": 1,
                "soil_moisture_max": 100,
                "updated_at": ""
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch thresholds: {str(e)}")


@router.put("/thresholds")
def update_thresholds(thresholds: ThresholdUpdate):
    """
    Update threshold configuration.
    Creates new record if none exists, otherwise updates the first record.
    """
    try:
        # Check if thresholds exist
        response = supabase.table("thresholds").select("id").limit(1).execute()
        
        update_data = {}
        if thresholds.temperature_min is not None:
            update_data["temperature_min"] = thresholds.temperature_min
        if thresholds.temperature_max is not None:
            update_data["temperature_max"] = thresholds.temperature_max
        if thresholds.soil_moisture_min is not None:
            update_data["soil_moisture_min"] = thresholds.soil_moisture_min
        if thresholds.soil_moisture_max is not None:
            update_data["soil_moisture_max"] = thresholds.soil_moisture_max
        
        if response.data and len(response.data) > 0:
            # Update existing record
            threshold_id = response.data[0]["id"]
            result = supabase.table("thresholds").update(update_data).eq("id", threshold_id).execute()
            return {"message": "Thresholds updated successfully", "data": result.data[0]}
        else:
            # Insert new record with defaults
            insert_data = {
                "temperature_min": thresholds.temperature_min or 0,
                "temperature_max": thresholds.temperature_max or 60,
                "soil_moisture_min": thresholds.soil_moisture_min or 1,
                "soil_moisture_max": thresholds.soil_moisture_max or 100,
            }
            result = supabase.table("thresholds").insert(insert_data).execute()
            return {"message": "Thresholds created successfully", "data": result.data[0]}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update thresholds: {str(e)}")


@router.post("/thresholds/reset")
def reset_thresholds():
    """
    Reset thresholds to default values.
    """
    try:
        response = supabase.table("thresholds").select("id").limit(1).execute()
        
        default_data = {
            "temperature_min": 0,
            "temperature_max": 60,
            "soil_moisture_min": 1,
            "soil_moisture_max": 100,
        }
        
        if response.data and len(response.data) > 0:
            threshold_id = response.data[0]["id"]
            result = supabase.table("thresholds").update(default_data).eq("id", threshold_id).execute()
            return {"message": "Thresholds reset to defaults", "data": result.data[0]}
        else:
            result = supabase.table("thresholds").insert(default_data).execute()
            return {"message": "Default thresholds created", "data": result.data[0]}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset thresholds: {str(e)}")
