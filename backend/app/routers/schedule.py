from fastapi import APIRouter, Depends, HTTPException
from datetime import date, timedelta, datetime
from uuid import uuid4
import hashlib
import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from postgrest.exceptions import APIError

from app.ai_inference import predict_ai_status
from app.core.security import get_current_user
from app.core.supabase_client import supabase
from app.reschedule_engine import (
    build_daily_rain_calendar,
    get_insights_with_real_dates,
    is_iso_date,
    normalize_weather_df,
)
from app.weather_service import fetch_weather_data
from app.schemas.schedule import GenerateScheduleRequest, EvaluateThresholdStatusRequest

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])
logger = logging.getLogger(__name__)


class InsightsRequest(BaseModel):
    plot_id: str
    date: str
    weather_forecast: Optional[List[Dict[str, Any]]] = None


def _dates_for_template(start_date: date, tpl: dict, horizon_days: int = 120):
    """
    Generate one or multiple task dates for a template.

    Uses:
      - start_offset_days (base offset from planting start)
      - frequency: once | daily | weekly | monthly
      - interval: every n units
      - end_offset_days: optional end window relative to planting start (if you want recurrence until a point)

    If end_offset_days is NULL:
      - once -> 1 date
      - recurring -> generate up to horizon_days (to keep runtime safe)
    """
    base = start_date + timedelta(days=int(tpl.get("start_offset_days", 0)))
    freq = (tpl.get("frequency") or "once").lower()
    interval = int(tpl.get("interval") or 1)

    # If end_offset_days exists, generate until that end date
    end_offset = tpl.get("end_offset_days")
    if end_offset is not None:
        end_date = start_date + timedelta(days=int(end_offset))
    else:
        end_date = start_date + timedelta(days=horizon_days)

    if freq == "once" or freq == "event":
        return [base] if base <= end_date else []

    step_days = 1
    if freq == "daily":
        step_days = 1 * interval
    elif freq == "weekly":
        step_days = 7 * interval
    elif freq == "monthly":
        step_days = 30 * interval  # simple approx for MVP

    dates = []
    cur = base
    while cur <= end_date:
        dates.append(cur)
        cur = cur + timedelta(days=step_days)

    return dates


def _fetch_active_workers():
    res = (
        supabase.table("workers")
        .select("id, name")
        # Only active field workers should receive auto-assigned tasks.
        .eq("role", "Field Worker")
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    return res.data or []


def _stable_start_index(plot_id: str, worker_count: int) -> int:
    if worker_count <= 0:
        return 0
    digest = hashlib.sha256(plot_id.encode("utf-8")).hexdigest()
    return int(digest, 16) % worker_count


def _load_sensor_summary(device_id: int) -> Dict[str, float]:
    defaults = {"avg_n": 0.0, "avg_moisture": 0.0, "avg_temp": 0.0}

    cleaned_res = (
        supabase.table("cleaned_data")
        .select(
            "device_id, data_added, processed_at, temperature, soil_moisture, nitrogen, "
            "cleaned_temperature, cleaned_soil_moisture, cleaned_nitrogen"
        )
        .eq("device_id", device_id)
        .order("data_added", desc=True)
        .limit(1)
        .execute()
    )
    cleaned_row = (cleaned_res.data or [None])[0]

    if cleaned_row and cleaned_row.get("data_added") is None:
        fallback_res = (
            supabase.table("cleaned_data")
            .select(
                "device_id, data_added, processed_at, temperature, soil_moisture, nitrogen, "
                "cleaned_temperature, cleaned_soil_moisture, cleaned_nitrogen"
            )
            .eq("device_id", device_id)
            .order("processed_at", desc=True)
            .limit(1)
            .execute()
        )
        cleaned_row = (fallback_res.data or [None])[0] or cleaned_row

    if not cleaned_row:
        return defaults

    temp = cleaned_row.get("cleaned_temperature")
    moisture = cleaned_row.get("cleaned_soil_moisture")
    nitrogen = cleaned_row.get("cleaned_nitrogen")

    if temp is None:
        temp = cleaned_row.get("temperature")
    if moisture is None:
        moisture = cleaned_row.get("soil_moisture")
    if nitrogen is None:
        nitrogen = cleaned_row.get("nitrogen")

    return {
        "avg_n": float(nitrogen or 0.0),
        "avg_moisture": float(moisture or 0.0),
        "avg_temp": float(temp or 0.0),
    }


def _parse_date_value(value: str) -> date:
    if not value:
        raise HTTPException(status_code=400, detail="Missing date value")
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD") from exc


def _get_rain_metrics(calendar: Dict[str, float], base_date: date) -> tuple[float, float]:
    base_str = base_date.isoformat()
    rain_today = float(calendar.get(base_str, 0.0) or 0.0)
    rain_next_3d = 0.0
    for offset in range(1, 4):
        next_date = base_date + timedelta(days=offset)
        rain_next_3d += float(calendar.get(next_date.isoformat(), 0.0) or 0.0)
    return rain_today, rain_next_3d


def _looks_like_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return is_iso_date(value)


def _merge_reason(existing: Optional[str], addition: Optional[str]) -> Optional[str]:
    existing = (existing or "").strip()
    addition = (addition or "").strip()
    if existing and addition:
        return f"{existing} | {addition}"
    if existing:
        return existing
    if addition:
        return addition
    return None


def _apply_insight_reschedules(tasks: List[Dict[str, Any]], suggestions: List[Dict[str, Any]]) -> int:
    task_by_id = {t.get("id"): t for t in tasks if t.get("id")}
    updated = 0

    for rec in suggestions or []:
        if not isinstance(rec, dict):
            continue
        if rec.get("type") != "RESCHEDULE":
            continue

        task_id = rec.get("task_id")
        if not task_id or str(task_id).startswith("trigger_"):
            continue

        task = task_by_id.get(task_id)
        if not task:
            continue

        suggested_date = rec.get("suggested_date")
        if not _looks_like_date(suggested_date):
            continue

        status = (task.get("status") or "").strip()
        if status not in ("Pending", "Stop"):
            continue

        if task.get("proposed_date") == suggested_date:
            continue

        update_payload: Dict[str, Any] = {
            "proposed_date": suggested_date,
            "reason": _merge_reason(task.get("reason"), rec.get("reason")),
        }
        if not task.get("original_date"):
            update_payload["original_date"] = task.get("task_date")

        supabase.table("tasks").update(update_payload).eq("id", task_id).execute()
        updated += 1

    return updated


def generate_schedule_for_plot(
    start_date: date,
    plot_id: str,
    mode: str = "overwrite",
    horizon_days: int = 120,
    allow_no_templates: bool = False,
):
    logger.info("Generating schedule for plot_id=%s", plot_id)

    # 0) Validate plot exists (FK safety)
    plot_check = (
        supabase.table("plots")
        .select("id")
        .eq("id", plot_id)
        .limit(1)
        .execute()
    )
    if not plot_check.data:
        raise HTTPException(
            status_code=400,
            detail=f"plot_id '{plot_id}' not found in plots table. Please use an existing plot id."
        )

    # 1) Load active templates
    templates_res = (
        supabase.table("task_templates")
        .select("id, title, type, description, start_offset_days, end_offset_days, frequency, interval, active")
        .eq("active", True)
        .execute()
    )

    templates = templates_res.data or []
    if not templates:
        if allow_no_templates:
            return {
                "message": "No active task templates found",
                "plot_id": plot_id,
                "start_date": start_date.isoformat(),
                "tasks_created": 0,
                "mode": mode,
                "horizon_days": horizon_days,
            }
        raise HTTPException(status_code=400, detail="No active task templates found")

    # 2) If overwrite, delete generated tasks in the horizon window to avoid duplicates
    #    (delete only tasks that are auto-generated, so manual tasks stay)
    if mode == "overwrite":
        end_date = start_date + timedelta(days=horizon_days)
        try:
            supabase.table("tasks") \
                .delete() \
                .eq("plot_id", plot_id) \
                .gte("task_date", start_date.isoformat()) \
                .lte("task_date", end_date.isoformat()) \
                .eq("reason", "Auto-generated from task template") \
                .execute()
        except APIError as e:
            raise HTTPException(status_code=400, detail=f"Delete failed: {e}")

    # 3) Build tasks list
    tasks_to_insert = []

    for tpl in templates:
        tpl_dates = _dates_for_template(start_date, tpl, horizon_days=horizon_days)

        for d in tpl_dates:
            tasks_to_insert.append({
                "id": f"TASK_{uuid4().hex[:8].upper()}",
                "plot_id": plot_id,
                "title": tpl["title"],
                "type": tpl["type"],
                "task_date": d.isoformat(),

                # default values for MVP
                "status": "Proceed",
                "description": tpl.get("description"),
                "original_date": d.isoformat(),
                "proposed_date": None,
                "reason": "Auto-generated from task template",
            })

    if not tasks_to_insert:
        return {
            "message": "No tasks generated (templates produced no dates within horizon)",
            "plot_id": plot_id,
            "start_date": start_date.isoformat(),
            "tasks_created": 0
        }

    # 3.5) Auto-assign workers (round-robin across all active field workers)
    active_workers = _fetch_active_workers()
    logger.info("Active workers fetched: %s", len(active_workers))
    logger.info(
        "Active workers list: %s",
        [{"id": w.get("id"), "name": w.get("name")} for w in active_workers],
    )

    if not active_workers:
        logger.info("DEBUG: No active workers found; tasks will be unassigned")
    start_index = _stable_start_index(plot_id, len(active_workers))

    for idx, task in enumerate(tasks_to_insert):
        if not active_workers:
            task["assigned_worker_id"] = None
            task["assigned_worker_name"] = None
            continue
        selected = active_workers[(start_index + idx) % len(active_workers)]
        task["assigned_worker_id"] = selected["id"]
        task["assigned_worker_name"] = selected["name"]

        logger.info(
            "DEBUG: Assigned task %s (%s %s) -> %s (%s)",
            task["id"],
            task["title"],
            task["task_date"],
            selected["name"],
            selected["id"],
        )

    # 4) Insert
    try:
        insert_res = supabase.table("tasks").insert(tasks_to_insert).execute()
    except APIError as e:
        # This captures FK/RLS/etc nicely
        raise HTTPException(status_code=400, detail=e.args[0].get("message", str(e)))

    inserted_count = len(insert_res.data or [])
    logger.info("Inserted tasks: %s", inserted_count)

    return {
        "message": "Schedule generated successfully",
        "plot_id": plot_id,
        "start_date": start_date.isoformat(),
        "templates_used": len(templates),
        "tasks_created": inserted_count,
        "mode": mode,
        "horizon_days": horizon_days
    }


@router.post("/generate")
def generate_schedule(payload: GenerateScheduleRequest, user=Depends(get_current_user)):
    return generate_schedule_for_plot(
        start_date=payload.start_date,
        plot_id=payload.plot_id,
        mode=getattr(payload, "mode", "overwrite"),
        horizon_days=getattr(payload, "horizon_days", 120),
    )

@router.post("/evaluate-status-threshold")
def evaluate_status_threshold(payload: EvaluateThresholdStatusRequest, user=Depends(get_current_user)):
    plot_id = payload.plot_id
    target_date = payload.date
    device_id = payload.device_id or 205
    readings = payload.readings or {}
    thresholds = payload.thresholds
    reschedule_days = payload.reschedule_days

    reading_meta = None

    # Fetch latest cleaned_data for device_id (prefer data_added desc, fallback to processed_at desc)
    cleaned_res = (
        supabase.table("cleaned_data")
        .select(
            "device_id, data_added, processed_at, temperature, soil_moisture, nitrogen, "
            "cleaned_temperature, cleaned_soil_moisture, cleaned_nitrogen"
        )
        .eq("device_id", device_id)
        .order("data_added", desc=True)
        .limit(1)
        .execute()
    )
    cleaned_row = (cleaned_res.data or [None])[0]

    if cleaned_row and cleaned_row.get("data_added") is None:
        fallback_res = (
            supabase.table("cleaned_data")
            .select(
                "device_id, data_added, processed_at, temperature, soil_moisture, nitrogen, "
                "cleaned_temperature, cleaned_soil_moisture, cleaned_nitrogen"
            )
            .eq("device_id", device_id)
            .order("processed_at", desc=True)
            .limit(1)
            .execute()
        )
        cleaned_row = (fallback_res.data or [None])[0] or cleaned_row

    if cleaned_row:
        logger.info("DEBUG: cleaned_data query device_id=%s", device_id)
        logger.info("SUCCESS: Sensor data fetched: %s", cleaned_row)
        readings = {
            "temperature": cleaned_row.get("cleaned_temperature")
            if cleaned_row.get("cleaned_temperature") is not None
            else cleaned_row.get("temperature"),
            "soil_moisture": cleaned_row.get("cleaned_soil_moisture")
            if cleaned_row.get("cleaned_soil_moisture") is not None
            else cleaned_row.get("soil_moisture"),
            "nitrogen": cleaned_row.get("cleaned_nitrogen")
            if cleaned_row.get("cleaned_nitrogen") is not None
            else cleaned_row.get("nitrogen"),
        }
        reading_meta = {
            "device_id": cleaned_row.get("device_id", device_id),
            "timestamp": cleaned_row.get("data_added") or cleaned_row.get("processed_at"),
        }
    else:
        logger.warning("WARNING: No sensor data found for device_id = %s", device_id)
        logger.info("DEBUG: cleaned_data query device_id=%s", device_id)
        logger.info("DEBUG: cleaned_data row fetched: %s", cleaned_row)
        if payload.readings:
            reading_meta = {
                "device_id": device_id,
                "timestamp": None,
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"No cleaned_data found for device_id={device_id} and no readings provided",
            )

    # 1) Load tasks for that plot + date
    tasks_res = (
        supabase.table("tasks")
        .select("id, type, task_date, status, reason, original_date, proposed_date")
        .eq("plot_id", plot_id)
        .eq("task_date", target_date.isoformat())
        .execute()
    )
    tasks = tasks_res.data or []
    if not tasks:
        return {"message": "No tasks on that date", "updated": 0}

    updates = []

    weather_forecast = []
    try:
        weather_forecast = fetch_weather_data(past_days=0, forecast_days=4)
    except Exception:
        logger.exception("Weather fetch failed for AI status gating")
        weather_forecast = []

    weather_calendar = build_daily_rain_calendar(normalize_weather_df(weather_forecast))
    rain_today, rain_next_3d = _get_rain_metrics(weather_calendar, target_date)

    # 2) Example threshold-based rules (expand later)
    soil_moisture = readings.get("soil_moisture")
    temperature = readings.get("temperature")
    nitrogen = readings.get("nitrogen")
    moisture_max = thresholds.get("soil_moisture_max")

    for t in tasks:
        new_status = "Proceed"
        new_reason = "Proceed (thresholds OK)"
        new_proposed_date = None

        # Rule: if watering but soil moisture too high -> Pending + reschedule
        if t["type"] in ["watering", "irrigation"]:
            if soil_moisture is not None and moisture_max is not None and soil_moisture > moisture_max:
                new_status = "Pending"
                new_reason = f"Soil moisture too high ({soil_moisture} > {moisture_max}); reschedule watering."
                new_proposed_date = (target_date + timedelta(days=reschedule_days)).isoformat()

        # Rule: if any "field work" but soil too wet -> Pending
        if t["type"] in ["weeding", "land-prep", "fertilization"]:
            moisture_field_max = thresholds.get("soil_moisture_field_max")
            if soil_moisture is not None and moisture_field_max is not None and soil_moisture > moisture_field_max:
                new_status = "Pending"
                new_reason = f"Field too wet ({soil_moisture} > {moisture_field_max}); postpone task."
                new_proposed_date = (target_date + timedelta(days=reschedule_days)).isoformat()

        features = {
            "soil_moisture": float(soil_moisture or 0.0),
            "temperature": float(temperature or 0.0),
            "nitrogen": float(nitrogen or 0.0),
            "rain_today": rain_today,
            "rain_next_3d": rain_next_3d,
            "task_type": str(t.get("type") or "").lower(),
        }
        ai_label, ai_conf = predict_ai_status(features)

        if new_status == "Proceed":
            if ai_label == "Pending":
                new_status = "Pending"
                new_reason = _merge_reason(new_reason, f"AI predicted Pending (conf {ai_conf:.2f})")
            elif ai_label == "Stop" and ai_conf >= 0.70:
                new_status = "Stop"
                new_reason = _merge_reason(new_reason, f"AI predicted Stop (conf {ai_conf:.2f})")
        elif new_status == "Pending":
            if ai_label == "Stop" and ai_conf >= 0.70:
                new_status = "Stop"
                new_reason = _merge_reason(new_reason, f"AI predicted Stop (conf {ai_conf:.2f})")

        # Save update if changed
        updates.append((t["id"], new_status, new_reason, new_proposed_date))

    # 3) Apply updates to DB
    updated = 0
    for task_id, st, rs, pd in updates:
        supabase.table("tasks").update({
            "status": st,
            "reason": rs,
            "proposed_date": pd,
            "original_date": target_date.isoformat()
        }).eq("id", task_id).execute()
        updated += 1

    return {
        "message": "Status evaluated using thresholds",
        "plot_id": plot_id,
        "date": target_date.isoformat(),
        "updated": updated,
        "reading_device_id": reading_meta.get("device_id") if reading_meta else None,
        "reading_timestamp": reading_meta.get("timestamp") if reading_meta else None,
    }


# Usage: frontend posts /api/schedule/insights with plot_id/date to populate Insight Recommendation card.
# suggestions.py remains unchanged; reschedule_engine adds AI delay + weather-validated dates.
@router.post("/insights")
def get_insights(payload: InsightsRequest, user=Depends(get_current_user)):
    plot_id = payload.plot_id
    target_date = _parse_date_value(payload.date)

    tasks_res = (
        supabase.table("tasks")
        .select("id, title, type, task_date, status, reason, original_date, proposed_date")
        .eq("plot_id", plot_id)
        .eq("task_date", target_date.isoformat())
        .execute()
    )
    tasks = tasks_res.data or []
    if not tasks:
        return {"suggestions": []}

    device_id = 205
    sensor_summary = _load_sensor_summary(device_id)

    weather_forecast = payload.weather_forecast
    if weather_forecast is None:
        try:
            weather_forecast = fetch_weather_data(past_days=0, forecast_days=14)
        except Exception:
            logger.exception("Weather fetch failed for insights")
            weather_forecast = []

    suggestions = get_insights_with_real_dates(tasks, weather_forecast or [], sensor_summary)
    _apply_insight_reschedules(tasks, suggestions)

    return {"suggestions": suggestions}
