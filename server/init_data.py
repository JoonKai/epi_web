"""Initial seed data for a fresh server install.

Safe to run multiple times:
- creates tables if missing
- backfills missing default rows
- does not duplicate existing data
"""

from __future__ import annotations

import os

from database import SessionLocal
from models import CostItem, CostVendor, MocvdMachine, PurchaseRequest, RepairStatus, SourceType, SystemSetting, User
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
DEFAULT_COST_ITEMS = [
    {"category": "소모품", "code": "MAT-001", "name": "MOCVD 필라멘트", "unit": "EA", "is_active": True},
    {"category": "부품", "code": "PART-014", "name": "측정 장비 부품", "unit": "SET", "is_active": True},
    {"category": "PM 자재", "code": "PM-003", "name": "정기 교체 자재", "unit": "BOX", "is_active": False},
]
DEFAULT_COST_VENDORS = [
    {"vendor_code": "V-001", "vendor_name": "에코텍", "business_type": "MOCVD 부품", "manager": "김대리", "contact": "010-1111-2222", "is_active": True},
    {"vendor_code": "V-002", "vendor_name": "한국씰", "business_type": "오링/씰", "manager": "박과장", "contact": "010-3333-4444", "is_active": True},
    {"vendor_code": "V-003", "vendor_name": "진공소재", "business_type": "진공자재", "manager": "이차장", "contact": "010-5555-6666", "is_active": False},
]
DEFAULT_PURCHASE_REQUESTS = [
    {"request_date": "2026-01-05", "material_code": "9520909", "item_name": "PAR ECO INNER FILAMENT", "quantity": 2, "vendor_name": "에코텍", "requester": "이정욱", "actual_draft_count": 0, "purchase_reason": "재고 부족으로 인한 구매", "approval_status": "기안 전", "draft_date": "", "receipt_date": "", "note": ""},
    {"request_date": "2026-01-16", "material_code": "9520139", "item_name": "PAR ECO WIRE FILAMENT SUPPORT MIDDLE E46", "quantity": 100, "vendor_name": "에코텍", "requester": "이정욱", "actual_draft_count": 1, "purchase_reason": "재고 부족으로 인한 구매", "approval_status": "기안 완료", "draft_date": "2026-01-16", "receipt_date": "", "note": "발주진행중"},
    {"request_date": "2026-01-16", "material_code": "9520166", "item_name": "PAR ECO O-RING AFLAS #2-217", "quantity": 100, "vendor_name": "에코텍", "requester": "이정욱", "actual_draft_count": 1, "purchase_reason": "재고 부족으로 인한 구매", "approval_status": "기안 완료", "draft_date": "2026-01-16", "receipt_date": "", "note": "발주진행중"},
    {"request_date": "2026-02-10", "material_code": "9520689", "item_name": "PAR ECO O-RING NW80 (#340)", "quantity": 30, "vendor_name": "한국씰", "requester": "이정욱", "actual_draft_count": 1, "purchase_reason": "정전대비 PUMP 오링 구매", "approval_status": "기안 완료", "draft_date": "2026-02-19", "receipt_date": "", "note": ""},
    {"request_date": "2026-03-05", "material_code": "9520327", "item_name": "PAR ECO GASKET VCR NI 3/4 IN", "quantity": 50, "vendor_name": "에코텍", "requester": "이정욱", "actual_draft_count": 0, "purchase_reason": "재고 부족으로 인한 구매", "approval_status": "기안 전", "draft_date": "", "receipt_date": "", "note": "발주 문의 필요"},
]
DEFAULT_REPAIR_STATUS = [
    {"receipt_type": "수리중", "repair_status": "진행", "outbound_date": "2024-05-29", "inbound_date": "", "equipment_name": "재수리", "location": "ETCH", "chamber": "37", "material_code": "DHL00280", "material_name": "REP_EBARA PUMP_ESA25XW 기본O/H", "spec": "DHL00280", "vendor_name": "한국에바라", "vendor_code": "V-EBR-01", "repair_reason": "motor temp high alarm 발생"},
    {"receipt_type": "수리중", "repair_status": "진행", "outbound_date": "2024-06-03", "inbound_date": "", "equipment_name": "재수리", "location": "ETCH", "chamber": "40", "material_code": "DHB00267", "material_name": "REP_EBARA PUMP_ESA25D_기본O/H", "spec": "DHB00267", "vendor_name": "한국에바라", "vendor_code": "V-EBR-01", "repair_reason": "motor temp high alarm 발생"},
    {"receipt_type": "완료", "repair_status": "완료", "outbound_date": "2024-06-12", "inbound_date": "2024-08-19", "equipment_name": "POWER SUPPLY", "location": "MOCVD", "chamber": "128", "material_code": "", "material_name": "POWER SUPPLY", "spec": "S/N: 1017A08677", "vendor_name": "와이텍", "vendor_code": "V-WIT-02", "repair_reason": "온도컨트롤 불량"},
    {"receipt_type": "완료", "repair_status": "완료", "outbound_date": "2024-06-18", "inbound_date": "2024-07-12", "equipment_name": "PRESSURE CONTROLLER (PC)", "location": "MOCVD", "chamber": "78", "material_code": "", "material_name": "PRESSURE CONTROLLER (PC)", "spec": "S/N 016669024", "vendor_name": "써미그린", "vendor_code": "V-SMG-04", "repair_reason": "통신불량"},
    {"receipt_type": "수리중", "repair_status": "무상수리", "outbound_date": "2024-06-18", "inbound_date": "", "equipment_name": "수리_ASM 192 T2D Detector", "location": "검사실", "chamber": "", "material_code": "", "material_name": "수리_ASM 192 T2D Detector", "spec": "HLD1403709", "vendor_name": "(주)투엔에스테크놀러지", "vendor_code": "V-TNS-07", "repair_reason": "진공 못잡음"},
    {"receipt_type": "입고예정", "repair_status": "개발 박치훈", "outbound_date": "2024-06-28", "inbound_date": "2025-03-17", "equipment_name": "ACP15PUMP", "location": "개발", "chamber": "117", "material_code": "AC700314", "material_name": "ACP15PUMP", "spec": "AC700314", "vendor_name": "파이퍼베큠 코리아(유)", "vendor_code": "V-PFE-09", "repair_reason": "개발용 예비품 수리"},
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

    for order_idx, name in enumerate(DEFAULT_SOURCE_TYPES):
        db.add(SourceType(name=name, order_idx=order_idx, is_active=True))

    print(f"[ok] source types ensured: +{len(DEFAULT_SOURCE_TYPES)} / total target {len(DEFAULT_SOURCE_TYPES)}")


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


def ensure_cost_items(db) -> None:
    existing = {row.code: row for row in db.query(CostItem).all()}
    added = 0
    for item in DEFAULT_COST_ITEMS:
        row = existing.get(item["code"])
        if row is None:
            db.add(CostItem(**item))
            added += 1
    print(f"[ok] cost items ensured: +{added} / total target {len(DEFAULT_COST_ITEMS)}")


def ensure_cost_vendors(db) -> None:
    existing = {row.vendor_code: row for row in db.query(CostVendor).all()}
    added = 0
    for item in DEFAULT_COST_VENDORS:
        row = existing.get(item["vendor_code"])
        if row is None:
            db.add(CostVendor(**item))
            added += 1
    print(f"[ok] cost vendors ensured: +{added} / total target {len(DEFAULT_COST_VENDORS)}")


def ensure_purchase_requests(db) -> None:
    existing = {
        (row.request_date, row.material_code, row.item_name): row
        for row in db.query(PurchaseRequest).all()
    }
    added = 0
    for item in DEFAULT_PURCHASE_REQUESTS:
        key = (item["request_date"], item["material_code"], item["item_name"])
        if key in existing:
            continue
        db.add(PurchaseRequest(**item))
        added += 1
    print(f"[ok] purchase requests ensured: +{added} / total target {len(DEFAULT_PURCHASE_REQUESTS)}")


def ensure_repair_status(db) -> None:
    existing = {
        (row.outbound_date, row.material_code, row.material_name, row.chamber): row
        for row in db.query(RepairStatus).all()
    }
    added = 0
    for item in DEFAULT_REPAIR_STATUS:
        key = (item["outbound_date"], item["material_code"], item["material_name"], item["chamber"])
        if key in existing:
            continue
        db.add(RepairStatus(**item))
        added += 1
    print(f"[ok] repair status ensured: +{added} / total target {len(DEFAULT_REPAIR_STATUS)}")


def main() -> None:
    schema_actions = sync_schema()
    print_sync_summary(schema_actions)

    db = SessionLocal()
    try:
        ensure_admin_user(db)
        ensure_machines(db)
        ensure_source_types(db)
        ensure_system_settings(db)
        ensure_cost_items(db)
        ensure_cost_vendors(db)
        ensure_purchase_requests(db)
        ensure_repair_status(db)
        db.commit()
        print("[done] initial data setup completed")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
