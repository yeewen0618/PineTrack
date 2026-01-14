from pydantic import BaseModel
from datetime import date
from typing import Optional

class CreatePlotWithPlanRequest(BaseModel):
    name: str
    area_ha: float
    crop_type: str
    planting_date: date
    growth_stage: str
    location_x: Optional[float] = None
    location_y: Optional[float] = None


class UpdatePlotRequest(BaseModel):
    name: Optional[str] = None
    area_ha: Optional[float] = None
    crop_type: Optional[str] = None
    planting_date: Optional[date] = None
