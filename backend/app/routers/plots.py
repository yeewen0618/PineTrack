import re
from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4
from datetime import timedelta
from typing import Optional, Tuple
from postgrest.exceptions import APIError

from app.core.security import get_current_user
from app.core.supabase_client import supabase
from app.schemas.plots import CreatePlotWithPlanRequest

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


@router.get("")
def list_plots(user=Depends(get_current_user)):
    """List all plots (for Dashboard / Plot Management pages)."""
    res = supabase.table("plots").select("*").order("created_at", desc=True).execute()
    return {"ok": True, "data": res.data or []}


@router.get("/{plot_id}")
def get_plot(plot_id: str, user=Depends(get_current_user)):
    res = supabase.table("plots").select("*").eq("id", plot_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Plot not found")
    return {"ok": True, "data": res.data[0]}


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
    # Rule: they are GRID positions, not GPS.
    loc_x = payload.location_x
    loc_y = payload.location_y

    if loc_x is None or loc_y is None:
        # Auto-assign next available grid slot
        # Get existing coords (ignore nulls)
        coords_res = (
            supabase.table("plots")
            .select("location_x,location_y")
            .execute()
        )

        used = set()
        for r in (coords_res.data or []):
            x = r.get("location_x")
            y = r.get("location_y")
            if x is not None and y is not None:
                used.add((int(x), int(y)))

        # Choose a simple grid policy (1..20 columns, 1..20 rows)
        # Fill row-wise: (1,1), (2,1), ..., (20,1), (1,2), ...
        found = None
        for y in range(1, 21):
            for x in range(1, 21):
                if (x, y) not in used:
                    found = (x, y)
                    break
            if found:
                break

        if not found:
            raise HTTPException(status_code=400, detail="Farm map grid is full. Please expand grid size.")

        loc_x, loc_y = found

    # 3️⃣ Prepare plot row for insertion
    plot_row = {
        "id": plot_id,
        "name": payload.name,
        "area_ha": payload.area_ha,
        "crop_type": payload.crop_type,
        "planting_date": payload.planting_date.isoformat(),
        "growth_stage": payload.growth_stage,
        "status": "Proceed",
        "health_score": 0,
        "location_x": int(loc_x),
        "location_y": int(loc_y),
    }

    # 2️⃣ Insert plot
    try:
        plot_res = supabase.table("plots").insert(plot_row).execute()
    except APIError as e:
        raise HTTPException(status_code=400, detail=e.args[0]["message"])

    if not plot_res.data:
        raise HTTPException(status_code=400, detail="Failed to create plot")

    # 3️⃣ Generate schedule (reuse logic)
    templates_res = (
        supabase.table("task_templates").select("*").eq("active", True).execute()
    )

    templates = templates_res.data or []
    if not templates:
        return {
            "plot_id": plot_id,
            "message": "Plot created, but no templates found",
            "tasks_created": 0,
        }

    tasks = []
    start_date = payload.planting_date
    horizon_days = 420  # ~14 months

    for tpl in templates:
        base_date = start_date + timedelta(days=tpl["start_offset_days"])

        freq = tpl["frequency"]
        interval = tpl["interval"]
        end_offset = tpl.get("end_offset_days")

        if end_offset:
            end_date = start_date + timedelta(days=end_offset)
        else:
            end_date = start_date + timedelta(days=horizon_days)

        dates = []

        if freq in ["once", "event"]:
            dates = [base_date]
        else:
            step = 1
            if freq == "daily":
                step = 1 * interval
            elif freq == "weekly":
                step = 7 * interval
            elif freq == "monthly":
                step = 30 * interval

            d = base_date
            while d <= end_date:
                dates.append(d)
                d += timedelta(days=step)

        for d in dates:
            tasks.append(
                {
                    "id": f"TASK_{uuid4().hex[:8].upper()}",
                    "plot_id": plot_id,
                    "title": tpl["title"],
                    "type": tpl["type"],
                    "task_date": d.isoformat(),
                    "status": "Proceed",
                    "description": tpl.get("description"),
                    "original_date": d.isoformat(),
                    "reason": "Auto-generated from task template",
                }
            )

    # 4️⃣ Insert tasks
    try:
        task_res = supabase.table("tasks").insert(tasks).execute()
    except APIError as e:
        raise HTTPException(status_code=400, detail=e.args[0]["message"])

    return {
        "message": "Plot created and operation plan generated",
        "plot_id": plot_id,
        "tasks_created": len(task_res.data or []),
    }

@router.delete("/{plot_id}")
def delete_plot(plot_id: str, user=Depends(get_current_user)):
    # 1) Delete tasks under this plot first (avoid FK issues)
    supabase.table("tasks").delete().eq("plot_id", plot_id).execute()

    # 2) Delete plot
    res = supabase.table("plots").delete().eq("id", plot_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Plot not found")

    return {"ok": True, "deleted_plot_id": plot_id}
