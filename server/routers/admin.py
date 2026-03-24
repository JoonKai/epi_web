import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from auth import hash_password, require_admin
from audit_log import write_audit_log
from database import get_db
from models import (
    AuditLog,
    KoreanHoliday,
    MachineGroup,
    MachineGroupMember,
    MocvdMachine,
    PersonnelMember,
    PersonnelVendor,
    PmPersonnelAssign,
    SourceType,
    SystemSetting,
    User,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

PROTECTED_ADMIN_USERNAME = "admin"


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    role: str
    is_active: bool
    session_expire_minutes: int | None = None


class MachineCreate(BaseModel):
    machine_no: int
    description: str = ""


class SourceCreate(BaseModel):
    name: str
    order_idx: int = 0


class VendorCreate(BaseModel):
    name: str
    contact_name: str = ""
    contact_phone: str = ""
    note: str = ""
    is_active: bool = True


class VendorUpdate(VendorCreate):
    pass


class PersonnelCreate(BaseModel):
    vendor_id: int
    employee_no: str = ""
    name: str
    department: str = ""
    position: str = ""
    phone: str = ""
    shift: str = ""
    training_due_date: str = ""
    note: str = ""
    is_active: bool = True


class PersonnelUpdate(PersonnelCreate):
    pass


@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "is_active": user.is_active,
            "session_expire_minutes": user.session_expire_minutes,
            "created_at": user.created_at.strftime("%Y-%m-%d") if user.created_at else None,
        }
        for user in users
    ]


@router.post("/users")
def create_user(body: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    db.add(User(username=body.username, hashed_password=hash_password(body.password), role=body.role))
    db.commit()
    return {"result": "ok"}


@router.put("/users/{user_id}")
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.username == PROTECTED_ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="admin 계정은 수정할 수 없습니다.")
    user.role = body.role
    user.is_active = body.is_active
    user.session_expire_minutes = body.session_expire_minutes
    db.commit()
    write_audit_log(
        db,
        log_type="system",
        actor="admin",
        category="계정",
        action="사용자 수정",
        target=user.username,
        detail=f"관리자 권한으로 {user.username} 계정을 수정했습니다.",
    )
    return {"result": "ok"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.username == PROTECTED_ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="admin 계정은 삭제할 수 없습니다.")
    db.delete(user)
    db.commit()
    return {"result": "ok"}


@router.put("/users/{user_id}/password")
def reset_password(user_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.username == PROTECTED_ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="admin 계정은 비밀번호를 변경할 수 없습니다.")
    user.hashed_password = hash_password(body["password"])
    db.commit()
    return {"result": "ok"}


@router.get("/machines")
def list_machines(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(MocvdMachine).order_by(MocvdMachine.machine_no).all()
    return [
        {
            "id": row.id,
            "machine_no": row.machine_no,
            "description": row.description,
            "is_active": row.is_active,
        }
        for row in rows
    ]


@router.post("/machines")
def create_machine(body: MachineCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(MocvdMachine).filter(MocvdMachine.machine_no == body.machine_no).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 호기 번호입니다.")
    db.add(MocvdMachine(machine_no=body.machine_no, description=body.description))
    db.commit()
    return {"result": "ok"}


@router.put("/machines/{machine_id}")
def update_machine(machine_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    machine = db.query(MocvdMachine).filter(MocvdMachine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="호기를 찾을 수 없습니다.")

    next_machine_no = body.get("machine_no", machine.machine_no)
    duplicate = db.query(MocvdMachine).filter(
        MocvdMachine.machine_no == next_machine_no,
        MocvdMachine.id != machine_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 존재하는 호기 번호입니다.")

    machine.machine_no = next_machine_no
    machine.description = body.get("description", machine.description)
    machine.is_active = body.get("is_active", machine.is_active)
    db.commit()
    return {"result": "ok"}


@router.delete("/machines/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    machine = db.query(MocvdMachine).filter(MocvdMachine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="호기를 찾을 수 없습니다.")
    db.delete(machine)
    db.commit()
    return {"result": "ok"}


@router.get("/sources")
def list_sources(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(SourceType).order_by(SourceType.order_idx).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "order_idx": row.order_idx,
            "is_active": row.is_active,
        }
        for row in rows
    ]


@router.post("/sources")
def create_source(body: SourceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(SourceType).filter(SourceType.name == body.name).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 소스명입니다.")
    db.add(SourceType(name=body.name, order_idx=body.order_idx))
    db.commit()
    return {"result": "ok"}


@router.put("/sources/{source_id}")
def update_source(source_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    source = db.query(SourceType).filter(SourceType.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다.")

    next_name = body.get("name", source.name)
    duplicate = db.query(SourceType).filter(
        SourceType.name == next_name,
        SourceType.id != source_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 존재하는 소스명입니다.")

    source.name = next_name
    source.order_idx = body.get("order_idx", source.order_idx)
    source.is_active = body.get("is_active", source.is_active)
    db.commit()
    return {"result": "ok"}


@router.delete("/sources/{source_id}")
def delete_source(source_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    source = db.query(SourceType).filter(SourceType.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다.")
    db.delete(source)
    db.commit()
    return {"result": "ok"}


@router.get("/personnel/vendors")
def list_personnel_vendors(db: Session = Depends(get_db), _=Depends(require_admin)):
    vendors = db.query(PersonnelVendor).order_by(PersonnelVendor.name).all()
    members = db.query(PersonnelMember).all()

    counts: dict[int, int] = {}
    active_counts: dict[int, int] = {}
    for member in members:
        counts[member.vendor_id] = counts.get(member.vendor_id, 0) + 1
        if member.is_active:
            active_counts[member.vendor_id] = active_counts.get(member.vendor_id, 0) + 1

    return [
        {
            "id": vendor.id,
            "name": vendor.name,
            "contact_name": vendor.contact_name,
            "contact_phone": vendor.contact_phone,
            "note": vendor.note,
            "is_active": vendor.is_active,
            "member_count": counts.get(vendor.id, 0),
            "active_member_count": active_counts.get(vendor.id, 0),
            "created_at": vendor.created_at.strftime("%Y-%m-%d") if vendor.created_at else None,
        }
        for vendor in vendors
    ]


@router.post("/personnel/vendors")
def create_personnel_vendor(body: VendorCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(PersonnelVendor).filter(PersonnelVendor.name == body.name).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 업체명입니다.")

    db.add(
        PersonnelVendor(
            name=body.name,
            contact_name=body.contact_name,
            contact_phone=body.contact_phone,
            note=body.note,
            is_active=body.is_active,
        )
    )
    db.commit()
    return {"result": "ok"}


@router.put("/personnel/vendors/{vendor_id}")
def update_personnel_vendor(vendor_id: int, body: VendorUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    vendor = db.query(PersonnelVendor).filter(PersonnelVendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="업체를 찾을 수 없습니다.")

    duplicate = db.query(PersonnelVendor).filter(
        PersonnelVendor.name == body.name,
        PersonnelVendor.id != vendor_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 존재하는 업체명입니다.")

    vendor.name = body.name
    vendor.contact_name = body.contact_name
    vendor.contact_phone = body.contact_phone
    vendor.note = body.note
    vendor.is_active = body.is_active
    db.commit()
    return {"result": "ok"}


@router.delete("/personnel/vendors/{vendor_id}")
def delete_personnel_vendor(vendor_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    vendor = db.query(PersonnelVendor).filter(PersonnelVendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="업체를 찾을 수 없습니다.")

    db.query(PersonnelMember).filter(PersonnelMember.vendor_id == vendor_id).delete()
    db.delete(vendor)
    db.commit()
    return {"result": "ok"}


@router.get("/personnel/members")
def list_personnel_members(vendor_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_admin)):
    vendors = db.query(PersonnelVendor).all()
    vendor_map = {vendor.id: vendor for vendor in vendors}

    query = db.query(PersonnelMember).order_by(PersonnelMember.name)
    if vendor_id is not None:
        query = query.filter(PersonnelMember.vendor_id == vendor_id)
    rows = query.all()

    return [
        {
            "id": row.id,
            "vendor_id": row.vendor_id,
            "vendor_name": vendor_map.get(row.vendor_id).name if vendor_map.get(row.vendor_id) else "",
            "employee_no": row.employee_no,
            "name": row.name,
            "department": row.department,
            "position": row.position,
            "phone": row.phone,
            "shift": row.shift,
            "training_due_date": row.training_due_date,
            "note": row.note,
            "is_active": row.is_active,
            "created_at": row.created_at.strftime("%Y-%m-%d") if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/personnel/members")
def create_personnel_member(body: PersonnelCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not db.query(PersonnelVendor).filter(PersonnelVendor.id == body.vendor_id).first():
        raise HTTPException(status_code=404, detail="소속 업체를 찾을 수 없습니다.")

    db.add(
        PersonnelMember(
            vendor_id=body.vendor_id,
            employee_no=body.employee_no,
            name=body.name,
            department=body.department,
            position=body.position,
            phone=body.phone,
            shift=body.shift,
            training_due_date=body.training_due_date,
            note=body.note,
            is_active=body.is_active,
        )
    )
    db.commit()
    return {"result": "ok"}


@router.put("/personnel/members/{member_id}")
def update_personnel_member(member_id: int, body: PersonnelUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    member = db.query(PersonnelMember).filter(PersonnelMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="인원 정보를 찾을 수 없습니다.")

    if not db.query(PersonnelVendor).filter(PersonnelVendor.id == body.vendor_id).first():
        raise HTTPException(status_code=404, detail="소속 업체를 찾을 수 없습니다.")

    member.vendor_id = body.vendor_id
    member.employee_no = body.employee_no
    member.name = body.name
    member.department = body.department
    member.position = body.position
    member.phone = body.phone
    member.shift = body.shift
    member.training_due_date = body.training_due_date
    member.note = body.note
    member.is_active = body.is_active
    db.commit()
    return {"result": "ok"}


@router.delete("/personnel/members/{member_id}")
def delete_personnel_member(member_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    member = db.query(PersonnelMember).filter(PersonnelMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="인원 정보를 찾을 수 없습니다.")
    db.delete(member)
    db.commit()
    return {"result": "ok"}


@router.get("/personnel/pm-assign")
def get_pm_assign(db: Session = Depends(get_db)):
    rows = db.query(PmPersonnelAssign).all()
    return [{"member_id": r.member_id, "role": r.role} for r in rows]


class PmAssignItem(BaseModel):
    member_id: int
    role: str = ""

@router.post("/personnel/pm-assign")
def save_pm_assign(body: List[PmAssignItem], db: Session = Depends(get_db), _=Depends(require_admin)):
    db.query(PmPersonnelAssign).delete()
    for item in body:
        db.add(PmPersonnelAssign(member_id=item.member_id, role=item.role))
    db.commit()
    return {"result": "ok", "count": len(body)}


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(SystemSetting).all()
    return {row.key: row.value for row in rows}


@router.put("/settings")
def update_settings(body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    for key, value in body.items():
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(SystemSetting(key=key, value=str(value)))
    db.commit()
    return {"result": "ok"}


@router.get("/logs")
def list_logs(log_type: str = "system", db: Session = Depends(get_db), _=Depends(require_admin)):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    if log_type in {"system", "activity"}:
        query = query.filter(AuditLog.log_type == log_type)
    rows = query.limit(200).all()
    return [
        {
            "id": row.id,
            "log_type": row.log_type,
            "occurred_at": row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else None,
            "actor": row.actor,
            "category": row.category,
            "action": row.action,
            "target": row.target,
            "detail": row.detail,
        }
        for row in rows
    ]


# ─── IP 필터 설정 ──────────────────────────────────────────────────────────────

IP_FILTER_KEY = "ip_filter"

class IpFilterBody(BaseModel):
    mode: str  # "off" | "allow" | "block"
    ips: List[str] = []


@router.get("/settings/ip-filter")
def get_ip_filter(db: Session = Depends(get_db), _=Depends(require_admin)):
    row = db.query(SystemSetting).filter(SystemSetting.key == IP_FILTER_KEY).first()
    if row:
        return json.loads(row.value)
    return {"mode": "off", "ips": []}


@router.put("/settings/ip-filter")
def save_ip_filter(body: IpFilterBody, db: Session = Depends(get_db), _=Depends(require_admin)):
    value = json.dumps({"mode": body.mode, "ips": body.ips})
    row = db.query(SystemSetting).filter(SystemSetting.key == IP_FILTER_KEY).first()
    if row:
        row.value = value
    else:
        db.add(SystemSetting(key=IP_FILTER_KEY, value=value))
    db.commit()
    return {"ok": True}


# ── 한국 공휴일 ─────────────────────────────────────────────────────────

class HolidayItem(BaseModel):
    date: str          # YYYY-MM-DD
    name: str
    is_substitute: bool = False


@router.get("/holidays")
def get_holidays(year: int | None = None, db: Session = Depends(get_db), _=Depends(require_admin)):
    q = db.query(KoreanHoliday)
    if year:
        q = q.filter(KoreanHoliday.date.like(f"{year}-%"))
    rows = q.order_by(KoreanHoliday.date).all()
    return [{"date": r.date, "name": r.name, "is_substitute": r.is_substitute} for r in rows]


@router.post("/holidays/bulk")
def upsert_holidays(items: List[HolidayItem], db: Session = Depends(get_db), _=Depends(require_admin)):
    count = 0
    for h in items:
        existing = db.query(KoreanHoliday).filter(KoreanHoliday.date == h.date).first()
        if existing:
            existing.name = h.name
            existing.is_substitute = h.is_substitute
        else:
            db.add(KoreanHoliday(date=h.date, name=h.name, is_substitute=h.is_substitute))
            count += 1
    db.commit()
    return {"upserted": len(items), "new": count}


@router.delete("/holidays/year/{year}")
def delete_holidays_by_year(year: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    deleted = db.query(KoreanHoliday).filter(KoreanHoliday.date.like(f"{year}-%")).delete(synchronize_session=False)
    db.commit()
    return {"deleted": deleted}


# ── PM 카운터 동기화 ────────────────────────────────────────────────────────────

import threading

_sync_state: dict = {"running": False, "result": None}


SYNC_TIMEOUT = 180  # 최대 3분


def _run_sync_thread():
    from database import SessionLocal
    from excel_sync import sync_pm_counter as do_sync, save_sync_log
    db = SessionLocal()
    try:
        result = do_sync(db)
        _sync_state["result"] = result
        save_sync_log(db, result, triggered_by="manual")
    except Exception as e:
        print(f"[sync thread] 예외: {e}")
        result = {
            "synced_at": None,
            "updated_count": 0,
            "updated": [],
            "error_count": 1,
            "errors": [str(e)],
        }
        _sync_state["result"] = result
        save_sync_log(db, result, triggered_by="manual")
    finally:
        _sync_state["running"] = False
        db.close()


def _watchdog_thread():
    import time
    time.sleep(SYNC_TIMEOUT)
    if _sync_state["running"]:
        print(f"[sync watchdog] {SYNC_TIMEOUT}초 초과 — 강제 종료")
        _sync_state["running"] = False
        _sync_state["result"] = {
            "synced_at": None,
            "updated_count": 0,
            "updated": [],
            "error_count": 1,
            "errors": [f"타임아웃: {SYNC_TIMEOUT}초 내에 완료되지 않았습니다."],
        }


SYNC_PATH_KEYS = ["excel_sync_path_1", "excel_sync_path_2", "excel_sync_path_3"]


@router.get("/sync-pm-counter/paths")
def get_sync_paths(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = {r.key: r.value for r in db.query(SystemSetting).filter(SystemSetting.key.in_(SYNC_PATH_KEYS)).all()}
    return [rows.get(k, "") for k in SYNC_PATH_KEYS]


def _clean_path(val: str) -> str:
    import unicodedata
    return "".join(c for c in val if not unicodedata.category(c).startswith("C")).strip()


@router.put("/sync-pm-counter/paths")
def save_sync_paths(paths: list[str], db: Session = Depends(get_db), _=Depends(require_admin)):
    for key, val in zip(SYNC_PATH_KEYS, paths):
        val = _clean_path(val)
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row:
            row.value = val
        else:
            db.add(SystemSetting(key=key, value=val))
    db.commit()
    return {"ok": True}


SYNC_SCHEDULE_KEY = "sync_schedule_times"
DEFAULT_SCHEDULE   = ["07:00", "19:00"]


@router.get("/sync-pm-counter/schedule")
def get_sync_schedule(db: Session = Depends(get_db), _=Depends(require_admin)):
    import json
    row = db.query(SystemSetting).filter(SystemSetting.key == SYNC_SCHEDULE_KEY).first()
    if row:
        try:
            return json.loads(row.value)
        except Exception:
            pass
    return DEFAULT_SCHEDULE


@router.put("/sync-pm-counter/schedule")
def save_sync_schedule(times: list[str], db: Session = Depends(get_db), _=Depends(require_admin)):
    import json, re
    from scheduler import reschedule
    # HH:MM 형식 검증
    for t in times:
        if not re.match(r"^\d{2}:\d{2}$", t):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"잘못된 시간 형식: {t}")
    row = db.query(SystemSetting).filter(SystemSetting.key == SYNC_SCHEDULE_KEY).first()
    if row:
        row.value = json.dumps(times)
    else:
        db.add(SystemSetting(key=SYNC_SCHEDULE_KEY, value=json.dumps(times)))
    db.commit()
    reschedule(times)
    return {"ok": True}


@router.post("/sync-pm-counter")
def start_sync(_=Depends(require_admin)):
    if _sync_state["running"]:
        return {"status": "running"}
    _sync_state["running"] = True
    _sync_state["result"] = None
    threading.Thread(target=_run_sync_thread, daemon=True).start()
    threading.Thread(target=_watchdog_thread, daemon=True).start()
    return {"status": "started"}


@router.get("/sync-pm-counter/status")
def get_sync_status(_=Depends(require_admin)):
    return {
        "running": _sync_state["running"],
        "result": _sync_state["result"],
    }


class MachineGroupCreate(BaseModel):
    name: str
    description: str = ""
    machine_nos: List[int] = []
    parent_id: Optional[int] = None
    level: int = 1
    order_idx: int = 0


class MachineGroupReorderItem(BaseModel):
    id: int
    order_idx: int


@router.get("/machine-groups")
def list_machine_groups(db: Session = Depends(get_db), _=Depends(require_admin)):
    groups = db.query(MachineGroup).order_by(MachineGroup.order_idx, MachineGroup.id).all()
    members = db.query(MachineGroupMember).all()
    member_map = {}
    for m in members:
        member_map.setdefault(m.group_id, []).append(m.machine_no)
    return [
        {"id": g.id, "name": g.name, "description": g.description,
         "parent_id": g.parent_id, "level": g.level if g.level else 1,
         "order_idx": g.order_idx if g.order_idx is not None else 0,
         "machine_nos": sorted(member_map.get(g.id, []))}
        for g in groups
    ]


@router.put("/machine-groups/reorder")
def reorder_machine_groups(items: List[MachineGroupReorderItem], db: Session = Depends(get_db), _=Depends(require_admin)):
    for item in items:
        db.query(MachineGroup).filter(MachineGroup.id == item.id).update({"order_idx": item.order_idx})
    db.commit()
    return {"result": "ok"}


@router.post("/machine-groups")
def create_machine_group(body: MachineGroupCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    group = MachineGroup(name=body.name, description=body.description, parent_id=body.parent_id, level=body.level)
    db.add(group)
    db.flush()
    for no in body.machine_nos:
        db.add(MachineGroupMember(group_id=group.id, machine_no=no))
    db.commit()
    return {"id": group.id}


@router.put("/machine-groups/{group_id}")
def update_machine_group(group_id: int, body: MachineGroupCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    group = db.query(MachineGroup).filter(MachineGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")
    group.name = body.name
    group.description = body.description
    group.parent_id = body.parent_id
    group.level = body.level
    db.query(MachineGroupMember).filter(MachineGroupMember.group_id == group_id).delete()
    for no in body.machine_nos:
        db.add(MachineGroupMember(group_id=group_id, machine_no=no))
    db.commit()
    return {"result": "ok"}


@router.delete("/machine-groups/{group_id}")
def delete_machine_group(group_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    group = db.query(MachineGroup).filter(MachineGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다.")
    def delete_recursive(gid):
        children = db.query(MachineGroup).filter(MachineGroup.parent_id == gid).all()
        for child in children:
            delete_recursive(child.id)
            db.query(MachineGroupMember).filter(MachineGroupMember.group_id == child.id).delete()
            db.delete(child)
    delete_recursive(group_id)
    db.query(MachineGroupMember).filter(MachineGroupMember.group_id == group_id).delete()
    db.delete(group)
    db.commit()
    return {"result": "ok"}


@router.get("/sync-pm-counter/logs")
def get_sync_logs(limit: int = 30, db: Session = Depends(get_db), _=Depends(require_admin)):
    import json
    from models import PmSyncLog
    rows = (
        db.query(PmSyncLog)
        .order_by(PmSyncLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "synced_at": r.synced_at.strftime("%Y-%m-%d %H:%M:%S") if r.synced_at else "",
            "triggered_by": r.triggered_by,
            "updated_count": r.updated_count,
            "error_count": r.error_count,
            "errors": json.loads(r.errors_json or "[]"),
        }
        for r in rows
    ]
