from fastapi import APIRouter, Depends, HTTPException
from datetime import date, timedelta
from uuid import uuid4

from postgrest.exceptions import APIError

from app.core.security import get_current_user
from app.core.supabase_client import supabase
from app.schemas.schedule import GenerateScheduleRequest, EvaluateThresholdStatusRequest

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])


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


@router.post("/generate")
def generate_schedule(payload: GenerateScheduleRequest, user=Depends(get_current_user)):
    start_date = payload.start_date
    plot_id = payload.plot_id

    # Optional: if you added these fields in schema (recommended)
    mode = getattr(payload, "mode", "overwrite")          # overwrite | append
    horizon_days = getattr(payload, "horizon_days", 120) # safety limit for recurrence

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

    # 4) Insert
    try:
        insert_res = supabase.table("tasks").insert(tasks_to_insert).execute()
    except APIError as e:
        # This captures FK/RLS/etc nicely
        raise HTTPException(status_code=400, detail=e.args[0].get("message", str(e)))

    inserted_count = len(insert_res.data or [])

    return {
        "message": "Schedule generated successfully",
        "plot_id": plot_id,
        "start_date": start_date.isoformat(),
        "templates_used": len(templates),
        "tasks_created": inserted_count,
        "mode": mode,
        "horizon_days": horizon_days
    }

@router.post("/evaluate-status-threshold")
def evaluate_status_threshold(payload: EvaluateThresholdStatusRequest, user=Depends(get_current_user)):
    plot_id = payload.plot_id
    target_date = payload.date
    readings = payload.readings
    thresholds = payload.thresholds
    reschedule_days = payload.reschedule_days

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

    # 2) Example threshold-based rules (expand later)
    soil_moisture = readings.get("soil_moisture")
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
        "updated": updated
    }
