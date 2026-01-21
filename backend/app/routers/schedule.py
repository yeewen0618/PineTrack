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
from app.services.task_eval_threshold_service import TASK_EVAL_DEFAULTS, get_task_eval_thresholds_payload

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])
logger = logging.getLogger(__name__)
MAX_LOOKAHEAD_DAYS = 7


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
            "device_id, data_added, processed_at, temperature, soil_moisture, "
            "cleaned_temperature, cleaned_soil_moisture"
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
                "device_id, data_added, processed_at, temperature, soil_moisture, "
                "cleaned_temperature, cleaned_soil_moisture"
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

    if temp is None:
        temp = cleaned_row.get("temperature")
    if moisture is None:
        moisture = cleaned_row.get("soil_moisture")

    return {
        "avg_n": 0.0,
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


def _is_rain_sensitive(task_title: str) -> bool:
    title = (task_title or "").lower()
    keywords = [
        "fertil",
        "spray",
        "hormone",
        "foliar",
        "pesticide",
        "insecticide",
        "flower induction",
    ]
    return any(keyword in title for keyword in keywords)


def _find_next_safe_date(
    target_date: date,
    reschedule_days: int,
    max_lookahead_days: int,
    weather_calendar: Dict[str, float],
    rain_mm_min: float,
    rain_mm_heavy: float,
    task_title: str,
) -> tuple[date, str]:
    for offset in range(1, max_lookahead_days + 1):
        candidate = target_date + timedelta(days=offset)
        rain = float(weather_calendar.get(candidate.isoformat(), 0.0) or 0.0)
        if rain_mm_heavy is not None and rain >= rain_mm_heavy:
            continue
        if rain_mm_min is not None and rain >= rain_mm_min and _is_rain_sensitive(task_title):
            continue
        rationale = (
            f"Rescheduled to next safe day ({candidate.isoformat()}) based on rain forecast."
        )
        return candidate, rationale

    fallback = target_date + timedelta(days=reschedule_days)
    return fallback, "Fallback: no safe day found within window."


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

def evaluate_status_threshold_core(
    plot_id: str,
    target_date: date,
    device_id: int = 205,
    reschedule_days: int = 2,
    readings: Optional[Dict[str, float]] = None,
    thresholds: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    readings = readings or {}
    payload_thresholds = thresholds or {}
    reading_meta = None

    # Fetch latest cleaned_data for device_id (prefer data_added desc, fallback to processed_at desc)
    existing_nitrogen = readings.get("nitrogen")
    cleaned_res = (
        supabase.table("cleaned_data")
        .select(
            "device_id, data_added, processed_at, temperature, soil_moisture, "
            "cleaned_temperature, cleaned_soil_moisture"
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
                "device_id, data_added, processed_at, temperature, soil_moisture, "
                "cleaned_temperature, cleaned_soil_moisture"
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
            "nitrogen": existing_nitrogen,
        }
        reading_meta = {
            "device_id": cleaned_row.get("device_id", device_id),
            "timestamp": cleaned_row.get("data_added") or cleaned_row.get("processed_at"),
        }
    else:
        logger.warning("WARNING: No sensor data found for device_id = %s", device_id)
        logger.info("DEBUG: cleaned_data query device_id=%s", device_id)
        logger.info("DEBUG: cleaned_data row fetched: %s", cleaned_row)
        if readings:
            reading_meta = {
                "device_id": device_id,
                "timestamp": None,
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"No cleaned_data found for device_id={device_id} and no readings provided",
            )

    soil_moisture_val = readings.get("soil_moisture")
    temperature_val = readings.get("temperature")
    nitrogen_val = readings.get("nitrogen")

    soil_moisture_val = (
        float(soil_moisture_val) if soil_moisture_val is not None else None
    )
    temperature_val = (
        float(temperature_val) if temperature_val is not None else None
    )
    nitrogen_val = float(nitrogen_val) if nitrogen_val is not None else None

    thresholds_used: Dict[str, float] = {}
    thresholds_source = "default"
    threshold_profile_name = None
    relevant_threshold_keys = {
        "soil_moisture_min",
        "soil_moisture_max",
        "soil_moisture_field_max",
        "temperature_min",
        "temperature_max",
        "nitrogen_min",
        "nitrogen_max",
        "ph_min",
        "ph_max",
    }
    has_payload_thresholds = any(
        key in payload_thresholds and payload_thresholds[key] is not None
        for key in relevant_threshold_keys
    )

    if payload_thresholds and has_payload_thresholds:
        thresholds_used = {k: v for k, v in payload_thresholds.items() if v is not None}
        thresholds_source = "payload"
    else:
        db_thresholds, threshold_row = get_task_eval_thresholds_payload()
        if db_thresholds:
            thresholds_used = db_thresholds
            thresholds_source = "db"
            if threshold_row:
                threshold_profile_name = threshold_row.get("name")
        else:
            thresholds_used = TASK_EVAL_DEFAULTS.copy()
            thresholds_source = "default"

    if (
        "soil_moisture_field_max" not in thresholds_used
        and "soil_moisture_max" in thresholds_used
    ):
        thresholds_used["soil_moisture_field_max"] = thresholds_used["soil_moisture_max"]

    logger.info("Thresholds source=%s thresholds_used=%s", thresholds_source, thresholds_used)
    logger.info(
        "Sensor values: soil_moisture=%s temperature=%s nitrogen=%s",
        soil_moisture_val,
        temperature_val,
        nitrogen_val,
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
    moisture_max = thresholds_used.get("soil_moisture_max")
    moisture_field_max = thresholds_used.get("soil_moisture_field_max")
    temperature_min = thresholds_used.get("temperature_min")
    temperature_max = thresholds_used.get("temperature_max")
    rain_mm_min = thresholds_used.get("rain_mm_min", 2.0)
    rain_mm_heavy = thresholds_used.get("rain_mm_heavy", 10.0)

    stop_buffer = 10.0

    for t in tasks:
        pending_reasons: List[str] = []
        stop_reasons: List[str] = []
        new_status = "Proceed"
        new_reason = "Proceed (thresholds OK)"
        new_proposed_date = None

        if t["type"] in ["watering", "irrigation"]:
            if (
                soil_moisture_val is not None
                and moisture_max is not None
            ):
                if soil_moisture_val > moisture_max:
                    delta = soil_moisture_val - moisture_max
                    if delta > stop_buffer:
                        stop_reasons.append(
                            "Soil moisture "
                            f"{soil_moisture_val:.1f}% exceeded configured max "
                            f"{moisture_max:.1f}% by {delta:.1f} (> {stop_buffer:.1f})"
                        )
                    else:
                        pending_reasons.append(
                            f"Soil moisture {soil_moisture_val:.1f}% exceeded configured max "
                            f"{moisture_max:.1f}%"
                        )

        if t["type"] in ["weeding", "land-prep", "fertilization"]:
            if (
                soil_moisture_val is not None
                and moisture_field_max is not None
            ):
                if soil_moisture_val > moisture_field_max:
                    delta = soil_moisture_val - moisture_field_max
                    if delta > stop_buffer:
                        stop_reasons.append(
                            "Soil moisture "
                            f"{soil_moisture_val:.1f}% exceeded configured field max "
                            f"{moisture_field_max:.1f}% by {delta:.1f} (> {stop_buffer:.1f})"
                        )
                    else:
                        pending_reasons.append(
                            "Soil moisture "
                            f"{soil_moisture_val:.1f}% exceeded configured field max "
                            f"{moisture_field_max:.1f}%"
                        )

        if (
            temperature_val is not None
            and temperature_max is not None
        ):
            if temperature_val > temperature_max:
                delta = temperature_val - temperature_max
                if delta > stop_buffer:
                    stop_reasons.append(
                        "Temperature "
                        f"{temperature_val:.1f}C exceeded configured max "
                        f"{temperature_max:.1f}C by {delta:.1f} (> {stop_buffer:.1f})"
                    )
                else:
                    pending_reasons.append(
                        f"Temperature {temperature_val:.1f}C exceeded configured max "
                        f"{temperature_max:.1f}C"
                    )

        if (
            temperature_val is not None
            and temperature_min is not None
        ):
            if temperature_val < temperature_min:
                delta = temperature_min - temperature_val
                if delta > stop_buffer:
                    stop_reasons.append(
                        "Temperature "
                        f"{temperature_val:.1f}C below configured min "
                        f"{temperature_min:.1f}C by {delta:.1f} (> {stop_buffer:.1f})"
                    )
                else:
                    pending_reasons.append(
                        f"Temperature {temperature_val:.1f}C below configured min "
                        f"{temperature_min:.1f}C"
                    )

        if stop_reasons or pending_reasons:
            profile_suffix = (
                f" (threshold profile: {threshold_profile_name})"
                if threshold_profile_name
                else ""
            )
            if stop_reasons:
                new_status = "Stop"
                reason_detail = " | ".join(stop_reasons)
                new_reason = f"Stop: {reason_detail}{profile_suffix}."
            else:
                new_status = "Pending"
                reason_detail = " | ".join(pending_reasons)
                proposed_date, reschedule_reason = _find_next_safe_date(
                    target_date=target_date,
                    reschedule_days=reschedule_days,
                    max_lookahead_days=MAX_LOOKAHEAD_DAYS,
                    weather_calendar=weather_calendar,
                    rain_mm_min=float(rain_mm_min),
                    rain_mm_heavy=float(rain_mm_heavy),
                    task_title=t.get("title") or "",
                )
                new_reason = (
                    f"Pending: {reason_detail}{profile_suffix}. {reschedule_reason}"
                )
                new_proposed_date = proposed_date.isoformat()

        features = {
            "soil_moisture": float(soil_moisture_val if soil_moisture_val is not None else 0.0),
            "temperature": float(temperature_val if temperature_val is not None else 0.0),
            "nitrogen": float(nitrogen_val if nitrogen_val is not None else 0.0),
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

@router.post("/evaluate-status-threshold")
def evaluate_status_threshold(payload: EvaluateThresholdStatusRequest, user=Depends(get_current_user)):
    return evaluate_status_threshold_core(
        plot_id=payload.plot_id,
        target_date=payload.date,
        device_id=payload.device_id or 205,
        reschedule_days=payload.reschedule_days,
        readings=payload.readings,
        thresholds=payload.thresholds,
    )


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
