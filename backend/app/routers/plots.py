import re
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Tuple
from postgrest.exceptions import APIError

from app.core.security import get_current_user
from app.core.supabase_client import supabase
from app.schemas.plots import CreatePlotWithPlanRequest, UpdatePlotRequest
from app.routers.schedule import generate_schedule_for_plot
from app.services.reschedule_service import fetch_pending_reschedule_tasks
from app.services.reason_service import strip_internal_reason

router = APIRouter(prefix="/api/plots", tags=["Plots"])


def _to_float(v):
    try:
        return float(v)
    except Exception:
        return None


def pick_next_grid_slot(max_x: int = 20, max_y: int = 20) -> Tuple[float, float]:
    """
    Pick the first free (x,y) grid slot scanning row-wise.
    location_x/location_y are grid positions (NOT GPS).
    """
    res = (
        supabase.table("plots")
        .select("location_x, location_y")
        .not_.is_("location_x", None)
        .not_.is_("location_y", None)
        .limit(2000)
        .execute()
    )

    occupied = set()
    for row in res.data or []:
        x = _to_float(row.get("location_x"))
        y = _to_float(row.get("location_y"))
        if x is not None and y is not None:
            occupied.add((x, y))

    # scan grid: y=1..max_y, x=1..max_x
    for y in range(1, max_y + 1):
        for x in range(1, max_x + 1):
            if (float(x), float(y)) not in occupied:
                return float(x), float(y)

    # fallback (grid full): append new row
    return 1.0, float(max_y + 1)


def _normalize_task_status(value: Optional[str]) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in ("stop", "stopped"):
        return "Stop"
    if normalized == "pending":
        return "Pending"
    return "Proceed"


def _status_from_tasks(tasks: list[dict]) -> Optional[str]:
    if not tasks:
        return None
    has_stop = any(_normalize_task_status(t.get("status")) == "Stop" for t in tasks)
    if has_stop:
        return "Stop"
    has_pending = any(_normalize_task_status(t.get("status")) == "Pending" for t in tasks)
    if has_pending:
        return "Pending"
    return "Proceed"


def _fetch_plot_tasks_on_date(plot_id: str, target_date: date) -> list[dict]:
    res = (
        supabase.table("tasks")
        .select("id, status, task_date")
        .eq("plot_id", plot_id)
        .eq("task_date", target_date.isoformat())
        .execute()
    )
    return res.data or []


def _find_next_task_date(plot_id: str, after_date: date) -> Optional[str]:
    res = (
        supabase.table("tasks")
        .select("task_date")
        .eq("plot_id", plot_id)
        .gt("task_date", after_date.isoformat())
        .order("task_date")
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    return res.data[0].get("task_date")


def _compute_plot_status(plot_id: str, today: date) -> tuple[str, Optional[str]]:
    today_tasks = _fetch_plot_tasks_on_date(plot_id, today)
    today_status = _status_from_tasks(today_tasks)
    if today_status:
        return today_status, today.isoformat()

    next_date = _find_next_task_date(plot_id, today)
    if next_date:
        try:
            next_dt = datetime.strptime(next_date[:10], "%Y-%m-%d").date()
        except ValueError:
            next_dt = None
        next_tasks = (
            _fetch_plot_tasks_on_date(plot_id, next_dt)
            if next_dt is not None
            else []
        )
        next_status = _status_from_tasks(next_tasks)
        return (next_status or "Proceed"), next_date

    return "Proceed", None

def _is_missing_column_error(error: APIError, column: str) -> bool:
    message = ""
    if error.args:
        arg0 = error.args[0]
        if isinstance(arg0, dict):
            message = str(arg0.get("message", ""))
        else:
            message = str(arg0)
    return column in message


def _parse_date_value(value: Optional[object]) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def _estimate_harvest_date(start_date: date, crop_type: Optional[str]) -> Optional[date]:
    if not start_date:
        return None
    crop = str(crop_type or "").lower()
    months = None
    if "pineapple" in crop or "md2" in crop:
        months = 15
    if months is None:
        return None
    return start_date + timedelta(days=months * 30)


def _with_plot_dates(row: dict) -> dict:
    start_raw = row.get("start_planting_date") or row.get("planting_date")
    expected_raw = row.get("expected_harvest_date")
    start_date = _parse_date_value(start_raw)
    expected_date = _parse_date_value(expected_raw)
    if expected_date is None and start_date:
        expected_date = _estimate_harvest_date(start_date, row.get("crop_type"))
    row["start_planting_date"] = start_date.isoformat() if start_date else None
    row["expected_harvest_date"] = expected_date.isoformat() if expected_date else None
    return row


@router.get("")
def list_plots(user=Depends(get_current_user)):
    """List all plots (for Dashboard / Plot Management pages)."""
    try:
        res = supabase.table("plots").select("*").order("created_at", desc=True).execute()
    except APIError as e:
        message = e.args[0].get("message", str(e))
        raise HTTPException(status_code=500, detail=message)
    rows = res.data or []
    enriched = [_with_plot_dates(row) for row in rows]
    return {"ok": True, "data": enriched}


@router.get("/summary")
def list_plot_summaries(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    window_days: int = 7,
    user=Depends(get_current_user),
):
    base_date = date_from or date.today()
    end_date = date_to or (base_date + timedelta(days=window_days))

    try:
        plots_res = (
            supabase.table("plots")
            .select("id, name")
            .order("created_at", desc=True)
            .execute()
        )
        tasks_res = (
            supabase.table("tasks")
            .select("plot_id, status, task_date")
            .gte("task_date", base_date.isoformat())
            .lte("task_date", end_date.isoformat())
            .execute()
        )
        pending_reschedules = fetch_pending_reschedule_tasks("plot_id")
    except APIError as e:
        message = e.args[0].get("message", str(e))
        raise HTTPException(status_code=500, detail=message)

    plots = plots_res.data or []
    tasks = tasks_res.data or []

    counts_by_plot: dict[str, dict[str, int]] = {
        str(plot.get("id")): {"proceed": 0, "pending": 0, "stopped": 0, "total": 0}
        for plot in plots
        if plot.get("id") is not None
    }

    for task in tasks:
        plot_id = str(task.get("plot_id") or "").strip()
        if not plot_id:
            continue
        bucket = counts_by_plot.setdefault(
            plot_id, {"proceed": 0, "pending": 0, "stopped": 0, "total": 0}
        )
        status = _normalize_task_status(task.get("status"))
        if status == "Stop":
            bucket["stopped"] += 1
        elif status == "Pending":
            bucket["pending"] += 1
        else:
            bucket["proceed"] += 1
        bucket["total"] += 1

    pending_by_plot: dict[str, int] = {}
    for task in pending_reschedules or []:
        plot_id = str(task.get("plot_id") or "").strip()
        if not plot_id:
            continue
        pending_by_plot[plot_id] = pending_by_plot.get(plot_id, 0) + 1

    summaries = []
    for plot in plots:
        plot_id = str(plot.get("id"))
        counts = counts_by_plot.get(plot_id, {"proceed": 0, "pending": 0, "stopped": 0, "total": 0})
        if counts["stopped"] > 0:
            plot_status = "Stop"
        elif counts["pending"] > 0:
            plot_status = "Pending"
        else:
            plot_status = "Proceed"

        summaries.append(
            {
                "plot_id": plot_id,
                "plot_name": plot.get("name"),
                "plot_status": plot_status,
                "task_counts": counts,
                "pending_approvals_count": pending_by_plot.get(plot_id, 0),
            }
        )

    return {
        "ok": True,
        "date_from": base_date.isoformat(),
        "date_to": end_date.isoformat(),
        "data": summaries,
    }


@router.get("/{plot_id}")
def get_plot(plot_id: str, user=Depends(get_current_user)):
    res = supabase.table("plots").select("*").eq("id", plot_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Plot not found")
    return {"ok": True, "data": _with_plot_dates(res.data[0])}


@router.get("/{plot_id}/details")
def get_plot_details(plot_id: str, user=Depends(get_current_user)):
    res = supabase.table("plots").select("*").eq("id", plot_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Plot not found")
    plot_row = _with_plot_dates(res.data[0])

    today = date.today()
    plot_status, status_date = _compute_plot_status(plot_id, today)

    return {
        "ok": True,
        "data": plot_row,
        "plot_status": plot_status,
        "status_date": status_date,
        "today": today.isoformat(),
    }


@router.get("/{plot_id}/tasks")
def get_plot_tasks(
    plot_id: str,
    scope: Optional[str] = None,
    limit: int = 5,
    user=Depends(get_current_user),
):
    if scope not in (None, "summary"):
        raise HTTPException(status_code=400, detail="Unsupported scope")

    plot_res = supabase.table("plots").select("id").eq("id", plot_id).limit(1).execute()
    if not plot_res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    safe_limit = max(1, min(int(limit), 50))
    today = date.today()

    try:
        upcoming_res = (
            supabase.table("tasks")
            .select("*")
            .eq("plot_id", plot_id)
            .gte("task_date", today.isoformat())
            .order("task_date")
            .limit(safe_limit)
            .execute()
        )
        recent_res = (
            supabase.table("tasks")
            .select("*")
            .eq("plot_id", plot_id)
            .lt("task_date", today.isoformat())
            .order("task_date", desc=True)
            .limit(safe_limit)
            .execute()
        )
    except APIError as e:
        message = e.args[0].get("message", str(e))
        raise HTTPException(status_code=500, detail=message)

    upcoming = upcoming_res.data or []
    recent = recent_res.data or []

    for row in upcoming:
        row["reason"] = strip_internal_reason(row.get("reason"))
    for row in recent:
        row["reason"] = strip_internal_reason(row.get("reason"))

    tasks = upcoming if upcoming else recent

    return {
        "ok": True,
        "plot_id": plot_id,
        "today": today.isoformat(),
        "upcoming_tasks": upcoming,
        "recent_tasks": recent,
        "tasks": tasks,
        "limit": safe_limit,
    }


@router.post("/create-with-plan")
def create_plot_with_plan(
    payload: CreatePlotWithPlanRequest,
    user=Depends(get_current_user),
):
    # 1️⃣ Generate plot ID (Pxxx format)
    plots_res = (
        supabase.table("plots")
        .select("id")
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )

    max_num = 0
    for row in (plots_res.data or []):
        pid = row.get("id")
        if isinstance(pid, str) and re.fullmatch(r"P\d{3}", pid):
            max_num = max(max_num, int(pid[1:]))

    plot_id = f"P{max_num + 1:03d}"  # e.g., P007

    # 2️⃣ Determine grid position (location_x/location_y)
    # Rule: always use the default farm GPS coordinates for new plots.
    loc_x = 102.284250
    loc_y = 2.813306
    # 3: Prepare plot row for insertion
    plot_row = {
        "id": plot_id,
        "name": payload.name,
        "area_ha": payload.area_ha,
        "crop_type": payload.crop_type,
        "planting_date": payload.planting_date.isoformat(),
        "start_planting_date": payload.planting_date.isoformat(),
        "growth_stage": payload.growth_stage,
        "status": "Proceed",
        "health_score": 0,
        "location_x": loc_x,
        "location_y": loc_y,
    }
    expected = _estimate_harvest_date(payload.planting_date, payload.crop_type)
    if expected:
        plot_row["expected_harvest_date"] = expected.isoformat()

    # 4: Insert plot
    try:
        plot_res = supabase.table("plots").insert(plot_row).execute()
    except APIError as e:
        if _is_missing_column_error(e, "start_planting_date") or _is_missing_column_error(
            e, "expected_harvest_date"
        ):
            plot_row.pop("start_planting_date", None)
            plot_row.pop("expected_harvest_date", None)
            plot_res = supabase.table("plots").insert(plot_row).execute()
        else:
            raise HTTPException(status_code=400, detail=e.args[0]["message"])

    if not plot_res.data:
        raise HTTPException(status_code=400, detail="Failed to create plot")

    # 5: Generate schedule using shared logic (auto-assigns workers)
    schedule_res = generate_schedule_for_plot(
        start_date=payload.planting_date,
        plot_id=plot_id,
        mode="overwrite",
        horizon_days=420,
        allow_no_templates=True,
    )

    return {
        "message": "Plot created and operation plan generated",
        "plot_id": plot_id,
        "tasks_created": schedule_res.get("tasks_created", 0),
    }

@router.delete("/{plot_id}")
def delete_plot(plot_id: str, user=Depends(get_current_user)):
    # 1) Delete dependent rows under this plot first (avoid FK issues)
    try:
        supabase.table("cleaned_data").delete().eq("plot_id", plot_id).execute()
    except APIError:
        # Ignore if cleaned_data is missing or already empty for this plot.
        pass

    try:
        supabase.table("tasks").delete().eq("plot_id", plot_id).execute()
    except APIError as e:
        message = e.args[0].get("message", str(e))
        raise HTTPException(status_code=500, detail=message)

    # 2) Delete plot
    try:
        res = supabase.table("plots").delete().eq("id", plot_id).execute()
    except APIError as e:
        message = e.args[0].get("message", str(e))
        raise HTTPException(status_code=500, detail=message)

    if not res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    return {"ok": True, "deleted_plot_id": plot_id}


@router.put("/{plot_id}")
def update_plot(
    plot_id: str,
    payload: UpdatePlotRequest,
    user=Depends(get_current_user),
):
    update_fields = payload.dict(exclude_unset=True)
    if "planting_date" in update_fields and update_fields["planting_date"] is not None:
        update_fields["planting_date"] = update_fields["planting_date"].isoformat()
        update_fields["start_planting_date"] = update_fields["planting_date"]

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    try:
        res = supabase.table("plots").update(update_fields).eq("id", plot_id).execute()
    except APIError as e:
        if _is_missing_column_error(e, "start_planting_date") or _is_missing_column_error(
            e, "expected_harvest_date"
        ):
            update_fields.pop("start_planting_date", None)
            update_fields.pop("expected_harvest_date", None)
            res = supabase.table("plots").update(update_fields).eq("id", plot_id).execute()
        else:
            raise HTTPException(status_code=400, detail=e.args[0]["message"])

    if not res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    return {"ok": True, "data": _with_plot_dates(res.data[0])}
