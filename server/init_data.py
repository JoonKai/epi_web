"""Initial seed data for a fresh server install.

Safe to run multiple times:
- creates tables if missing
- backfills missing default rows
- does not duplicate existing data
"""

from __future__ import annotations

import os

from database import SessionLocal
from models import MocvdMachine, MocvdPmCounter, PersonnelMember, PersonnelVendor, ShiftType, SourceType, SystemSetting, User
from auth import hash_password
from schema_sync import print_sync_summary, sync_schema
from source_status import DEFAULT_OVERDUE_DAYS, DEFAULT_URGENT_DAYS


DEFAULT_ADMIN_USERNAME = os.getenv("INIT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("INIT_ADMIN_PASSWORD", "admin1234")

DEFAULT_MACHINES = [
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    111, 112, 113, 114, 115, 116, 117, 118, 121, 122,
    123, 124, 125, 126, 127, 128,
    201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
    211, 212, 213, 214, 215, 216, 217, 218, 219, 220,
    221, 222, 223, 224, 225, 226, 227, 228, 229, 230,
    231, 232, 233, 234, 235, 236,
]
DEFAULT_SOURCE_TYPES = [
    {"name": "TMIn#1", "order_idx": 0, "is_active": True},
    {"name": "TMin#2", "order_idx": 1, "is_active": True},
    {"name": "CP2Mg",  "order_idx": 2, "is_active": True},
    {"name": "TMGa#1", "order_idx": 3, "is_active": True},
    {"name": "TMGa#2", "order_idx": 4, "is_active": True},
    {"name": "TEGa",   "order_idx": 5, "is_active": True},
    {"name": "TMAl#1", "order_idx": 6, "is_active": True},
    {"name": "TMAI#2", "order_idx": 7, "is_active": True},
]
DEFAULT_SETTINGS = {
    "session_expire_minutes": "60",
    "source_status_overdue_days": str(DEFAULT_OVERDUE_DAYS),
    "source_status_urgent_days": str(DEFAULT_URGENT_DAYS),
}
DEFAULT_PERSONNEL_VENDORS = [
    {"name": "미래엔지니어링", "contact_name": "목흥수", "contact_phone": "", "note": "", "is_active": True},
    {"name": "서울바이오시스", "contact_name": "이광수", "contact_phone": "", "note": "", "is_active": True},
]
# vendor_name 기준으로 매핑 (init 시 vendor id를 동적으로 조회)
DEFAULT_PERSONNEL_MEMBERS = [
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래1", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래2", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래3", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래4", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래5", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래6", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래7", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
    {"vendor_name": "미래엔지니어링", "employee_no": "", "name": "미래8", "department": "", "position": "", "phone": "", "shift": "", "training_due_date": "", "note": "", "is_active": True},
]
DEFAULT_SHIFT_TYPES = [
    {"name": "1",     "label": "주간",   "color": "#fbbf24", "bg_color": "rgba(245,158,11,0.18)",  "border_color": "rgba(245,158,11,0.4)",   "order_idx": 0},
    {"name": "2",     "label": "야간",   "color": "#4ade80", "bg_color": "rgba(34,197,94,0.22)",   "border_color": "rgba(34,197,94,0.4)",    "order_idx": 1},
    {"name": "휴무",  "label": "휴무",   "color": "#fca5a5", "bg_color": "rgba(248,113,113,0.26)", "border_color": "rgba(248,113,113,0.4)",  "order_idx": 2},
    {"name": "연차",  "label": "연차",   "color": "#fde68a", "bg_color": "rgba(251,191,36,0.28)",  "border_color": "rgba(251,191,36,0.5)",   "order_idx": 3},
    {"name": "반차",  "label": "반차",   "color": "#93c5fd", "bg_color": "rgba(56,189,248,0.26)",  "border_color": "rgba(56,189,248,0.4)",   "order_idx": 4},
    {"name": "반반차A","label": "반반차A","color": "#67e8f9", "bg_color": "rgba(6,182,212,0.26)",   "border_color": "rgba(6,182,212,0.4)",    "order_idx": 5},
    {"name": "반반차B","label": "반반차B","color": "#c4b5fd", "bg_color": "rgba(99,102,241,0.26)",  "border_color": "rgba(99,102,241,0.4)",   "order_idx": 6},
    {"name": "오후",  "label": "오후",   "color": "#e9d5ff", "bg_color": "rgba(168,85,247,0.26)",  "border_color": "rgba(168,85,247,0.4)",   "order_idx": 7},
    {"name": "교육",  "label": "교육",   "color": "#6ee7b7", "bg_color": "rgba(20,184,166,0.26)",  "border_color": "rgba(20,184,166,0.4)",   "order_idx": 8},
]


def ensure_admin_user(db) -> None:
    row = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
    if row:
        print(f"[skip] admin user exists: {DEFAULT_ADMIN_USERNAME}")
        return

    db.add(
        User(
            username=DEFAULT_ADMIN_USERNAME,
            hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            role="admin",
            is_active=True,
        )
    )
    print(f"[ok] created admin user: {DEFAULT_ADMIN_USERNAME}")


def ensure_machines(db) -> None:
    existing = {
        row.machine_no
        for row in db.query(MocvdMachine.machine_no).all()
    }
    missing = [machine_no for machine_no in DEFAULT_MACHINES if machine_no not in existing]
    for machine_no in missing:
        db.add(MocvdMachine(machine_no=machine_no))

    print(f"[ok] machines ensured: +{len(missing)} / total target {len(list(DEFAULT_MACHINES))}")


def ensure_source_types(db) -> None:
    existing_rows = db.query(SourceType).order_by(SourceType.id.asc()).all()
    if existing_rows:
        print(f"[skip] source types preserved: {len(existing_rows)} existing rows")
        return

    for item in DEFAULT_SOURCE_TYPES:
        db.add(SourceType(**item))

    print(f"[ok] source types ensured: +{len(DEFAULT_SOURCE_TYPES)} / total target {len(DEFAULT_SOURCE_TYPES)}")


def ensure_system_settings(db) -> None:
    existing = {
        row.key: row
        for row in db.query(SystemSetting).all()
    }

    # 더 이상 사용하지 않는 설정 키 제거
    obsolete_keys = ["shift_summary_rows"]
    removed = 0
    for key in obsolete_keys:
        row = existing.get(key)
        if row is not None:
            db.delete(row)
            removed += 1

    added = 0
    for key, value in DEFAULT_SETTINGS.items():
        row = existing.get(key)
        if row is None:
            db.add(SystemSetting(key=key, value=value))
            added += 1

    print(f"[ok] system settings ensured: +{added} added / -{removed} obsolete removed / total target {len(DEFAULT_SETTINGS)}")


def ensure_pm_counters(db) -> None:
    active_machine_nos = [
        machine_no
        for (machine_no,) in db.query(MocvdMachine.machine_no).filter(MocvdMachine.is_active == True).all()
    ]
    existing = {
        row.machine_no
        for row in db.query(MocvdPmCounter.machine_no).all()
    }

    added = 0
    for machine_no in active_machine_nos:
        if machine_no in existing:
            continue
        db.add(
            MocvdPmCounter(
                machine_no=machine_no,
                chamber_count=0.0,
                pm_base_count=0.0,
                filter_count=0.0,
                filter_base_count=0.0,
                run_per_day=0.0,
            )
        )
        added += 1

    print(f"[ok] pm counters ensured: +{added} / total active machines {len(active_machine_nos)}")



def ensure_personnel(db) -> None:
    existing_vendors = {row.name: row for row in db.query(PersonnelVendor).all()}
    for item in DEFAULT_PERSONNEL_VENDORS:
        if item["name"] not in existing_vendors:
            vendor = PersonnelVendor(**item)
            db.add(vendor)
            db.flush()
            existing_vendors[item["name"]] = vendor
    print(f"[ok] personnel vendors ensured / total target {len(DEFAULT_PERSONNEL_VENDORS)}")

    existing_members = {(row.vendor_id, row.name) for row in db.query(PersonnelMember).all()}
    added = 0
    for item in DEFAULT_PERSONNEL_MEMBERS:
        vendor = existing_vendors.get(item["vendor_name"])
        if not vendor:
            continue
        if (vendor.id, item["name"]) not in existing_members:
            data = {k: v for k, v in item.items() if k != "vendor_name"}
            db.add(PersonnelMember(vendor_id=vendor.id, **data))
            added += 1
    print(f"[ok] personnel members ensured: +{added} / total target {len(DEFAULT_PERSONNEL_MEMBERS)}")


def ensure_shift_types(db) -> None:
    existing = {row.name for row in db.query(ShiftType.name).all()}
    added = 0
    for item in DEFAULT_SHIFT_TYPES:
        if item["name"] not in existing:
            db.add(ShiftType(**item))
            added += 1
    print(f"[ok] shift types ensured: +{added} / total target {len(DEFAULT_SHIFT_TYPES)}")



def main() -> None:
    schema_actions = sync_schema()
    print_sync_summary(schema_actions)

    db = SessionLocal()
    try:
        ensure_admin_user(db)
        ensure_machines(db)
        ensure_source_types(db)
        ensure_system_settings(db)
        ensure_pm_counters(db)
        ensure_personnel(db)
        ensure_shift_types(db)
        db.commit()
        print("[done] initial data setup completed")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
