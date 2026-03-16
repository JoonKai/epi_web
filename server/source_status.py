from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any


DEFAULT_THRESHOLD_RATIO = 15.0
DEFAULT_OVERDUE_DAYS = 0
DEFAULT_URGENT_DAYS = 7


def _to_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_event(machine, source_type, source_row, overdue_days: int, urgent_days: int) -> dict[str, Any] | None:
    if source_row is None:
        return None

    initial_amount = _to_float(getattr(source_row, "initial_amount", 0.0))
    threshold_ratio = _to_float(getattr(source_row, "threshold_ratio", DEFAULT_THRESHOLD_RATIO), DEFAULT_THRESHOLD_RATIO)
    daily_usage = _to_float(getattr(source_row, "daily_usage", 0.0))
    remaining_amount = _to_float(getattr(source_row, "remaining", 0.0))

    if initial_amount <= 0 and daily_usage <= 0 and remaining_amount <= 0:
        return None

    threshold_amount = round(initial_amount * threshold_ratio / 100, 2) if initial_amount > 0 else 0.0
    days_left = None
    projected_replacement_date = None

    if daily_usage > 0:
        days_left = math.ceil((remaining_amount - threshold_amount) / daily_usage)
        safe_days = max(days_left, 0)
        projected_replacement_date = (date.today() + timedelta(days=safe_days)).isoformat()

    if initial_amount > 0 and remaining_amount <= threshold_amount:
        status = "overdue"
    elif days_left is not None and days_left <= overdue_days:
        status = "overdue"
    elif days_left is not None and days_left <= urgent_days:
        status = "urgent"
    elif days_left is not None and days_left <= 30:
        status = "upcoming"
    else:
        status = "normal"

    return {
        "id": f"{machine.machine_no}-{source_type.name}",
        "area": machine.description or "",
        "machine_no": machine.machine_no,
        "category": "",
        "source_label": source_type.name,
        "initial_amount": initial_amount,
        "daily_usage": daily_usage,
        "remaining_amount": remaining_amount,
        "threshold_ratio": threshold_ratio,
        "threshold_amount": threshold_amount,
        "projected_replacement_date": projected_replacement_date,
        "replacement_note": None,
        "days_left": days_left,
        "status": status,
    }


def build_source_status_snapshot(
    machines,
    source_types,
    source_rows,
    overdue_days: int = DEFAULT_OVERDUE_DAYS,
    urgent_days: int = DEFAULT_URGENT_DAYS,
) -> dict[str, Any]:
    source_map = {
        (row.machine_no, row.source_name): row
        for row in source_rows
    }

    events: list[dict[str, Any]] = []
    for machine in machines:
        for source_type in source_types:
            event = _build_event(
                machine,
                source_type,
                source_map.get((machine.machine_no, source_type.name)),
                overdue_days,
                urgent_days,
            )
            if event is not None:
                events.append(event)

    events.sort(
        key=lambda item: (
            item["projected_replacement_date"] or "9999-12-31",
            item["machine_no"],
            item["source_label"],
        )
    )

    current_month = date.today().strftime("%Y-%m")
    overdue_count = sum(1 for event in events if event["status"] == "overdue")
    urgent_count = sum(1 for event in events if event["status"] == "urgent")
    month_count = sum(
        1
        for event in events
        if event["projected_replacement_date"] and event["projected_replacement_date"].startswith(current_month)
    )

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "summary": {
            "total": len(events),
            "overdue": overdue_count,
            "urgent": urgent_count,
            "this_month": month_count,
        },
        "settings": {
            "overdue_days": overdue_days,
            "urgent_days": urgent_days,
        },
        "events": events,
    }
