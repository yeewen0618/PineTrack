from __future__ import annotations

import os
import sys
from typing import List

from postgrest.exceptions import APIError


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from app.core.supabase_client import supabase  # noqa: E402
from app.services.reschedule_service import (  # noqa: E402
    RESCHEDULE_TYPE_CONFLICT,
    supports_reschedule_metadata,
)


CONFLICT_REASON_MARKER = "Avoid fertiliser application near hormone application"


def _load_conflict_tasks() -> List[dict]:
    try:
        res = (
            supabase.table("tasks")
            .select("id, task_date, proposed_date, status, reason")
            .ilike("reason", f"%{CONFLICT_REASON_MARKER}%")
            .execute()
        )
    except APIError as exc:
        raise RuntimeError(f"Failed to query tasks: {exc}") from exc
    return res.data or []


def main() -> None:
    rows = _load_conflict_tasks()
    if not rows:
        print("No conflict-buffered reschedule proposals found.")
        return

    metadata_supported = supports_reschedule_metadata()
    updated = 0
    skipped = 0

    for task in rows:
        task_id = task.get("id")
        proposed_date = task.get("proposed_date")
        if not task_id or not proposed_date:
            skipped += 1
            continue

        update_payload = {
            "task_date": proposed_date,
            "proposed_date": None,
            "original_date": None,
            "reason": None,
            "status": "Proceed",
        }

        if metadata_supported:
            update_payload["reschedule_type"] = RESCHEDULE_TYPE_CONFLICT
            update_payload["reschedule_visible"] = False

        try:
            supabase.table("tasks").update(update_payload).eq("id", task_id).execute()
        except APIError as exc:
            if metadata_supported and "reschedule_type" in str(exc):
                update_payload.pop("reschedule_type", None)
                update_payload.pop("reschedule_visible", None)
                supabase.table("tasks").update(update_payload).eq("id", task_id).execute()
            else:
                raise RuntimeError(f"Failed to update task {task_id}: {exc}") from exc

        updated += 1

    print(f"Updated {updated} tasks. Skipped {skipped} tasks without proposed_date.")


if __name__ == "__main__":
    main()
