"""Initial seed data for a fresh server install.

Safe to run multiple times:
- creates tables if missing
- backfills missing default rows
- does not duplicate existing data
"""

from __future__ import annotations

import os

from database import SessionLocal
from models import MocvdMachine, SourceType, SystemSetting, User
from auth import hash_password
from schema_sync import print_sync_summary, sync_schema
from source_status import DEFAULT_OVERDUE_DAYS, DEFAULT_URGENT_DAYS


DEFAULT_ADMIN_USERNAME = os.getenv("INIT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("INIT_ADMIN_PASSWORD", "admin1234")

DEFAULT_MACHINES = range(101, 237)
DEFAULT_SOURCE_TYPES = ["TMGa", "TMIn", "TMAl", "NH3", "CP2Mg", "SiH4"]
DEFAULT_SETTINGS = {
    "session_expire_minutes": "60",
    "source_status_overdue_days": str(DEFAULT_OVERDUE_DAYS),
    "source_status_urgent_days": str(DEFAULT_URGENT_DAYS),
}


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
    existing = {
        row.name: row
        for row in db.query(SourceType).all()
    }

    added = 0
    for order_idx, name in enumerate(DEFAULT_SOURCE_TYPES):
        row = existing.get(name)
        if row is None:
            db.add(SourceType(name=name, order_idx=order_idx, is_active=True))
            added += 1
        elif row.order_idx != order_idx:
            row.order_idx = order_idx

    print(f"[ok] source types ensured: +{added} / total target {len(DEFAULT_SOURCE_TYPES)}")


def ensure_system_settings(db) -> None:
    existing = {
        row.key: row
        for row in db.query(SystemSetting).all()
    }

    added = 0
    for key, value in DEFAULT_SETTINGS.items():
        row = existing.get(key)
        if row is None:
            db.add(SystemSetting(key=key, value=value))
            added += 1

    print(f"[ok] system settings ensured: +{added} / total target {len(DEFAULT_SETTINGS)}")


def main() -> None:
    schema_actions = sync_schema()
    print_sync_summary(schema_actions)

    db = SessionLocal()
    try:
        ensure_admin_user(db)
        ensure_machines(db)
        ensure_source_types(db)
        ensure_system_settings(db)
        db.commit()
        print("[done] initial data setup completed")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
