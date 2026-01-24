from __future__ import annotations

from typing import Optional


INTERNAL_REASON_MARKERS = (
    "auto-generated from task template",
    "avoid fertiliser application near hormone application",
)


def strip_internal_reason(reason: Optional[str]) -> Optional[str]:
    if not reason:
        return None
    parts = [part.strip() for part in str(reason).split("|")]
    cleaned = []
    for part in parts:
        lower = part.lower()
        if any(marker in lower for marker in INTERNAL_REASON_MARKERS):
            continue
        if part:
            cleaned.append(part)
    if not cleaned:
        return None
    return " | ".join(cleaned)


def merge_reasons(existing: Optional[str], addition: Optional[str]) -> Optional[str]:
    cleaned_existing = strip_internal_reason(existing)
    cleaned_addition = strip_internal_reason(addition)
    if cleaned_existing and cleaned_addition:
        return f"{cleaned_existing} | {cleaned_addition}"
    if cleaned_existing:
        return cleaned_existing
    if cleaned_addition:
        return cleaned_addition
    return None
