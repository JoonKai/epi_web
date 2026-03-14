from __future__ import annotations

import math
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import re


EXCEL_MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
EXCEL_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"main": EXCEL_MAIN_NS, "pkgrel": PACKAGE_REL_NS}
EXCEL_EPOCH = date(1899, 12, 30)


@dataclass(frozen=True)
class WorkbookSheet:
    name: str
    target: str


def _column_letters_to_index(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha())
    value = 0
    for ch in letters:
        value = value * 26 + (ord(ch.upper()) - 64)
    return value


def _coerce_number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except ValueError:
        return None


def _excel_date_to_iso(value: Any) -> str | None:
    number = _coerce_number(value)
    if number is None:
        return None
    serial = int(number)
    return (EXCEL_EPOCH + timedelta(days=serial)).isoformat()


def _find_workbook_path() -> Path | None:
    env_path = os.environ.get("SOURCE_STATUS_WORKBOOK")
    if env_path:
        path = Path(env_path).expanduser()
        if path.exists():
            return path

    home = Path.home()
    search_roots = [home / "OneDrive", home / "Desktop", home]
    for root in search_roots:
        if not root.exists():
            continue
        for path in root.rglob("*.xlsm"):
            name = path.name.lower()
            if "20180101_r00" in name:
                return path
    return None


def _read_shared_strings(zip_file: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zip_file.namelist():
        return []

    root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    values: list[str] = []
    for si in root.findall("main:si", NS):
        texts = [node.text or "" for node in si.iterfind(".//main:t", NS)]
        values.append("".join(texts))
    return values


def _read_sheets(zip_file: ZipFile) -> list[WorkbookSheet]:
    workbook = ET.fromstring(zip_file.read("xl/workbook.xml"))
    rels = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("pkgrel:Relationship", NS)
    }

    sheets: list[WorkbookSheet] = []
    for sheet in workbook.find("main:sheets", NS):
        rid = sheet.attrib[f"{{{EXCEL_REL_NS}}}id"]
        sheets.append(WorkbookSheet(name=sheet.attrib["name"], target=f"xl/{rel_map[rid]}"))
    return sheets


def _read_sheet_rows(zip_file: ZipFile, target: str, shared_strings: list[str]) -> list[dict[int, Any]]:
    root = ET.fromstring(zip_file.read(target))
    sheet_data = root.find("main:sheetData", NS)
    rows: list[dict[int, Any]] = []

    if sheet_data is None:
        return rows

    for row in sheet_data.findall("main:row", NS):
        values: dict[int, Any] = {}
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "")
            col_idx = _column_letters_to_index(ref)
            value: Any = None
            cell_type = cell.attrib.get("t")
            value_node = cell.find("main:v", NS)
            inline_node = cell.find("main:is", NS)

            if cell_type == "s" and value_node is not None:
                value = shared_strings[int(value_node.text)]
            elif cell_type == "inlineStr" and inline_node is not None:
                texts = [node.text or "" for node in inline_node.iterfind(".//main:t", NS)]
                value = "".join(texts)
            elif value_node is not None:
                value = value_node.text

            if value not in (None, ""):
                values[col_idx] = value
        rows.append(values)
    return rows


def _build_events(table_rows: list[dict[int, Any]]) -> list[dict[str, Any]]:
    if len(table_rows) < 4:
        return []

    header_row = table_rows[1]
    source_groups: list[tuple[int, str]] = []
    for col_idx in sorted(header_row):
        if col_idx >= 4:
            label = str(header_row[col_idx]).strip()
            if label:
                source_groups.append((col_idx, label))

    today = date.today()
    events: list[dict[str, Any]] = []

    for row in table_rows[3:]:
        machine_no_raw = row.get(2)
        if machine_no_raw is None:
            continue

        machine_no = int(float(machine_no_raw))
        area = str(row.get(1, "")).strip()
        category = str(row.get(3, "")).strip()

        for start_col, source_label in source_groups:
            initial_amount = _coerce_number(row.get(start_col))
            daily_usage = _coerce_number(row.get(start_col + 1))
            remaining_amount = _coerce_number(row.get(start_col + 2))
            threshold_ratio = _coerce_number(row.get(start_col + 3))
            raw_replacement = row.get(start_col + 4)

            if all(
                value is None
                for value in (initial_amount, daily_usage, remaining_amount, threshold_ratio, raw_replacement)
            ):
                continue

            threshold_amount = None
            if initial_amount is not None and threshold_ratio is not None:
                threshold_amount = round(initial_amount * threshold_ratio, 2)

            projected_date = _excel_date_to_iso(raw_replacement)
            replacement_note = None if projected_date else (str(raw_replacement).strip() if raw_replacement else None)

            days_left = None
            if (
                remaining_amount is not None
                and threshold_amount is not None
                and daily_usage is not None
                and daily_usage > 0
            ):
                days_left = math.ceil((remaining_amount - threshold_amount) / daily_usage)
                if projected_date is None:
                    safe_days = max(days_left, 0)
                    projected_date = (today + timedelta(days=safe_days)).isoformat()

            if replacement_note == "잔량부족":
                status = "overdue"
            elif days_left is not None and days_left <= 0:
                status = "overdue"
            elif days_left is not None and days_left <= 7:
                status = "urgent"
            elif days_left is not None and days_left <= 30:
                status = "upcoming"
            else:
                status = "normal"

            events.append(
                {
                    "id": f"{machine_no}-{source_label}",
                    "area": area,
                    "machine_no": machine_no,
                    "category": category,
                    "source_label": source_label,
                    "initial_amount": initial_amount,
                    "daily_usage": daily_usage,
                    "remaining_amount": remaining_amount,
                    "threshold_ratio": threshold_ratio,
                    "threshold_amount": threshold_amount,
                    "projected_replacement_date": projected_date,
                    "replacement_note": replacement_note,
                    "days_left": days_left,
                    "status": status,
                }
            )

    events.sort(
        key=lambda item: (
            item["projected_replacement_date"] or "9999-12-31",
            item["machine_no"],
            item["source_label"],
        )
    )
    return events


def _build_snapshot(path: Path) -> dict[str, Any]:
    with ZipFile(path) as zip_file:
        shared_strings = _read_shared_strings(zip_file)
        sheets = _read_sheets(zip_file)
        wanted = {sheet.name: sheet for sheet in sheets[:3]}

        if "TABLE" not in wanted:
            raise FileNotFoundError("TABLE sheet not found in workbook")

        table_rows = _read_sheet_rows(zip_file, wanted["TABLE"].target, shared_strings)

    events = _build_events(table_rows)
    today_iso = date.today().isoformat()
    current_month = today_iso[:7]

    overdue_count = sum(1 for event in events if event["status"] == "overdue")
    urgent_count = sum(1 for event in events if event["status"] == "urgent")
    month_count = sum(
        1
        for event in events
        if event["projected_replacement_date"] and event["projected_replacement_date"].startswith(current_month)
    )

    return {
        "workbook_path": str(path),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "summary": {
            "total": len(events),
            "overdue": overdue_count,
            "urgent": urgent_count,
            "this_month": month_count,
        },
        "events": events,
    }


@lru_cache(maxsize=4)
def _get_snapshot_cached(path_str: str, mtime: float) -> dict[str, Any]:
    return _build_snapshot(Path(path_str))


def get_source_status_snapshot() -> dict[str, Any]:
    path = _find_workbook_path()
    if path is None:
        raise FileNotFoundError("source status workbook not found")
    stat = path.stat()
    return _get_snapshot_cached(str(path), stat.st_mtime)


def _normalize_source_label(value: str | None) -> str:
    if not value:
        return ""
    normalized = str(value).strip().lower()
    normalized = re.sub(r"#\d+$", "", normalized)
    return normalized


def filter_source_status_snapshot(
    snapshot: dict[str, Any],
    active_machine_nos: set[int] | None = None,
    active_source_names: set[str] | None = None,
) -> dict[str, Any]:
    events = snapshot.get("events", [])
    normalized_active_source_names = (
        {_normalize_source_label(name) for name in active_source_names}
        if active_source_names is not None
        else None
    )

    filtered_events = [
        event
        for event in events
        if (active_machine_nos is None or event.get("machine_no") in active_machine_nos)
        and (
            normalized_active_source_names is None
            or _normalize_source_label(event.get("source_label")) in normalized_active_source_names
        )
    ]

    current_month = date.today().isoformat()[:7]
    overdue_count = sum(1 for event in filtered_events if event.get("status") == "overdue")
    urgent_count = sum(1 for event in filtered_events if event.get("status") == "urgent")
    month_count = sum(
        1
        for event in filtered_events
        if event.get("projected_replacement_date") and event["projected_replacement_date"].startswith(current_month)
    )

    return {
        **snapshot,
        "summary": {
            "total": len(filtered_events),
            "overdue": overdue_count,
            "urgent": urgent_count,
            "this_month": month_count,
        },
        "events": filtered_events,
    }
