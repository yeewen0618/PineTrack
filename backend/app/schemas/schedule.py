from pydantic import BaseModel
from datetime import date
from typing import Literal
from typing import Dict

class GenerateScheduleRequest(BaseModel):
    start_date: date
    plot_id: str
    mode: Literal["overwrite", "append"] = "overwrite"
    horizon_days: int = 120

class EvaluateThresholdStatusRequest(BaseModel):
    plot_id: str
    date: date
    readings: Dict[str, float]        # e.g. {"soil_moisture": 78}
    thresholds: Dict[str, float]      # e.g. {"soil_moisture_max": 70}
    reschedule_days: int = 2