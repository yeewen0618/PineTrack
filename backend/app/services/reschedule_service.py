from __future__ import annotations

from typing import List, Optional

from postgrest.exceptions import APIError

from app.core.supabase_client import supabase

RESCHEDULE_TYPE_THRESHOLD = "THRESHOLD_RESCHEDULE"
RESCHEDULE_TYPE_CONFLICT = "CONFLICT_BUFFER_ADJUSTMENT"
_RESCHEDULE_METADATA_SUPPORTED: Optional[bool] = None
_APPROVAL_STATE_SUPPORTED: Optional[bool] = None


def _is_missing_column_error(error: APIError, column: str) -> bool:
    message = ""
    if error.args:
        arg0 = error.args[0]
        if isinstance(arg0, dict):
            message = str(arg0.get("message", ""))
        else:
            message = str(arg0)
    return column in message


def supports_reschedule_metadata() -> bool:
    global _RESCHEDULE_METADATA_SUPPORTED
    if _RESCHEDULE_METADATA_SUPPORTED is not None:
        return _RESCHEDULE_METADATA_SUPPORTED
    try:
        supabase.table("tasks").select("reschedule_type,reschedule_visible").limit(1).execute()
    except APIError as exc:
        if _is_missing_column_error(exc, "reschedule_type") or _is_missing_column_error(
            exc, "reschedule_visible"
        ):
            _RESCHEDULE_METADATA_SUPPORTED = False
            return _RESCHEDULE_METADATA_SUPPORTED
        raise
    _RESCHEDULE_METADATA_SUPPORTED = True
    return _RESCHEDULE_METADATA_SUPPORTED


def supports_approval_state() -> bool:
    global _APPROVAL_STATE_SUPPORTED
    if _APPROVAL_STATE_SUPPORTED is not None:
        return _APPROVAL_STATE_SUPPORTED
    try:
        supabase.table("tasks").select("approval_state").limit(1).execute()
    except APIError as exc:
        if _is_missing_column_error(exc, "approval_state"):
            _APPROVAL_STATE_SUPPORTED = False
            return _APPROVAL_STATE_SUPPORTED
        raise
    _APPROVAL_STATE_SUPPORTED = True
    return _APPROVAL_STATE_SUPPORTED


def fetch_pending_reschedule_tasks(
    select_fields: Optional[str] = "*",
    order_by: Optional[str] = "task_date",
) -> List[dict]:
    base_query = (
        supabase.table("tasks")
        .select(select_fields)
        .not_.is_("proposed_date", "null")
    )
    if order_by:
        base_query = base_query.order(order_by)
    if supports_reschedule_metadata():
        base_query = base_query.or_(
            f"reschedule_visible.is.null,reschedule_visible.eq.true,reschedule_type.eq.{RESCHEDULE_TYPE_THRESHOLD}"
        )

    try:
        res = base_query.or_("approval_state.is.null,approval_state.eq.pending").execute()
        return res.data or []
    except APIError as exc:
        if not _is_missing_column_error(exc, "approval_state"):
            raise
    fallback_query = supabase.table("tasks").select(select_fields).not_.is_("proposed_date", "null")
    if order_by:
        fallback_query = fallback_query.order(order_by)
    fallback = fallback_query.execute()
    return fallback.data or []
