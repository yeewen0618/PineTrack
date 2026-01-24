from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple

from app.services.reason_service import strip_internal_reason

DEFAULT_HORMONE_BUFFER_DAYS = 7
PROCESSING_CUTOFF_TITLE = "processing into pineapple juice"


def _normalize_text(value: Optional[str]) -> str:
    return str(value or "").strip().lower()


def _parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def is_processing_cutoff_task(task: Dict[str, Any]) -> bool:
    title = _normalize_text(task.get("title"))
    return PROCESSING_CUTOFF_TITLE in title


def is_hormone_task(task: Dict[str, Any]) -> bool:
    title = _normalize_text(task.get("title"))
    task_type = _normalize_text(task.get("type"))
    return "hormone" in title or "hormone" in task_type


def is_fertiliser_task(task: Dict[str, Any]) -> bool:
    title = _normalize_text(task.get("title"))
    task_type = _normalize_text(task.get("type"))
    keywords = ("fertil", "foliar", "granular")
    return any(keyword in title for keyword in keywords) or any(keyword in task_type for keyword in keywords)


def get_buffer_days(task: Dict[str, Any]) -> int:
    for key in ("buffer_days", "hormone_buffer_days"):
        raw = task.get(key)
        try:
            if raw is not None:
                return max(0, int(raw))
        except (TypeError, ValueError):
            continue
    return DEFAULT_HORMONE_BUFFER_DAYS


def get_processing_cutoff_date(tasks: Iterable[Dict[str, Any]]) -> Optional[date]:
    cutoff_dates = []
    for task in tasks:
        if not is_processing_cutoff_task(task):
            continue
        task_date = _parse_date(task.get("task_date"))
        if task_date:
            cutoff_dates.append(task_date)
    return min(cutoff_dates) if cutoff_dates else None


def build_hormone_windows(tasks: Iterable[Dict[str, Any]]) -> List[Tuple[date, int]]:
    windows: List[Tuple[date, int]] = []
    cutoff = get_processing_cutoff_date(tasks)
    for task in tasks:
        if not is_hormone_task(task):
            continue
        task_date = _parse_date(task.get("task_date"))
        if not task_date:
            continue
        if cutoff and task_date > cutoff:
            continue
        windows.append((task_date, get_buffer_days(task)))
    return windows


def _is_blocked(candidate: date, hormone_windows: Iterable[Tuple[date, int]]) -> bool:
    for hormone_date, buffer_days in hormone_windows:
        if hormone_date <= candidate <= hormone_date + timedelta(days=buffer_days):
            return True
    return False


def _latest_block_end(candidate: date, hormone_windows: Iterable[Tuple[date, int]]) -> Optional[date]:
    blocked_ends = [
        hormone_date + timedelta(days=buffer_days)
        for hormone_date, buffer_days in hormone_windows
        if hormone_date <= candidate <= hormone_date + timedelta(days=buffer_days)
    ]
    return max(blocked_ends) if blocked_ends else None


def find_next_available_date(
    start_date: date,
    hormone_windows: Iterable[Tuple[date, int]],
    cutoff_date: Optional[date] = None,
    max_lookahead_days: int = 120,
) -> date:
    candidate = start_date
    for _ in range(max_lookahead_days):
        if cutoff_date and candidate > cutoff_date:
            return candidate
        if not _is_blocked(candidate, hormone_windows):
            return candidate
        candidate += timedelta(days=1)
    return candidate


def apply_fertiliser_conflict_resolution(
    tasks_to_adjust: List[Dict[str, Any]],
    all_tasks: List[Dict[str, Any]],
    reason: str,
    shift_task_date: bool = True,
    create_proposal: bool = True,
    reschedule_type: Optional[str] = None,
    reschedule_visible: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    hormone_windows = build_hormone_windows(all_tasks)
    cutoff_date = get_processing_cutoff_date(all_tasks)
    updated: List[Dict[str, Any]] = []

    for task in tasks_to_adjust:
        if not is_fertiliser_task(task):
            continue
        task_date = _parse_date(task.get("task_date"))
        if not task_date:
            continue
        if cutoff_date and task_date > cutoff_date:
            continue
        if not _is_blocked(task_date, hormone_windows):
            continue

        latest_end = _latest_block_end(task_date, hormone_windows)
        if not latest_end:
            continue
        candidate = latest_end + timedelta(days=1)
        new_date = find_next_available_date(candidate, hormone_windows, cutoff_date=cutoff_date)
        original_task_date = task.get("task_date")

        if create_proposal:
            original_date = task.get("original_date") or original_task_date
            task["original_date"] = original_date
            task["proposed_date"] = new_date.isoformat()

            current_status = _normalize_text(task.get("status"))
            if current_status in ("", "proceed"):
                task["status"] = "Pending"

            existing_reason = strip_internal_reason(task.get("reason"))
            if existing_reason:
                task["reason"] = f"{existing_reason} | {reason}"
            else:
                task["reason"] = reason
        else:
            if reschedule_type is not None:
                task["reschedule_type"] = reschedule_type
            if reschedule_visible is not None:
                task["reschedule_visible"] = reschedule_visible
        if shift_task_date:
            task["task_date"] = new_date.isoformat()
        updated.append(task)

    return updated
