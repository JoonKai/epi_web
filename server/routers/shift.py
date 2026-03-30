from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
import json
from auth import get_current_user
from models import KoreanHoliday, PersonnelMember, PersonnelVendor, ShiftMember, ShiftScheduleEntry, ShiftType, SystemSetting

router = APIRouter(prefix="/api/shift", tags=["shift"])


# ─── Shift Types ──────────────────────────────────────────────────────────────

class ShiftTypeCreate(BaseModel):
    name: str
    label: str
    color: str = "#f59e0b"
    bg_color: str = "rgba(245,158,11,0.18)"
    border_color: str = "rgba(245,158,11,0.4)"
    order_idx: int = 0


class ShiftTypeUpdate(BaseModel):
    name: Optional[str] = None
    label: Optional[str] = None
    color: Optional[str] = None
    bg_color: Optional[str] = None
    border_color: Optional[str] = None
    order_idx: Optional[int] = None
    is_active: Optional[bool] = None


def shift_type_to_dict(t: ShiftType):
    return {
        "id": t.id,
        "name": t.name,
        "label": t.label,
        "color": t.color,
        "bg_color": t.bg_color,
        "border_color": t.border_color,
        "order_idx": t.order_idx,
        "is_active": t.is_active,
    }


@router.get("/shift-types")
def list_shift_types(db: Session = Depends(get_db)):
    rows = db.query(ShiftType).order_by(ShiftType.order_idx, ShiftType.id).all()
    return [shift_type_to_dict(r) for r in rows]


@router.post("/shift-types")
def create_shift_type(body: ShiftTypeCreate, db: Session = Depends(get_db)):
    if db.query(ShiftType).filter(ShiftType.name == body.name).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 코드입니다.")
    t = ShiftType(**body.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return shift_type_to_dict(t)


@router.put("/shift-types/{type_id}")
def update_shift_type(type_id: int, body: ShiftTypeUpdate, db: Session = Depends(get_db)):
    t = db.query(ShiftType).filter(ShiftType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(t, field, val)
    db.commit()
    return shift_type_to_dict(t)


@router.delete("/shift-types/{type_id}")
def delete_shift_type(type_id: int, db: Session = Depends(get_db)):
    t = db.query(ShiftType).filter(ShiftType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


# ─── Members ──────────────────────────────────────────────────────────────────

class MemberCreate(BaseModel):
    name: str
    team: str = ""
    vendor_name: str = ""
    personnel_member_id: Optional[int] = None
    order_idx: int = 0
    schedule_type: str = "general"


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    team: Optional[str] = None
    vendor_name: Optional[str] = None
    order_idx: Optional[int] = None
    is_active: Optional[bool] = None


def member_to_dict(m: ShiftMember):
    return {
        "id": m.id,
        "name": m.name,
        "team": m.team,
        "vendor_name": m.vendor_name or "",
        "personnel_member_id": m.personnel_member_id,
        "order_idx": m.order_idx,
        "is_active": m.is_active,
        "schedule_type": m.schedule_type or "general",
    }


@router.get("/members")
def list_members(schedule_type: str = "general", db: Session = Depends(get_db)):
    rows = db.query(ShiftMember).filter(
        ShiftMember.is_active == True,
        ShiftMember.schedule_type == schedule_type,
    ).order_by(ShiftMember.order_idx, ShiftMember.id).all()
    return [member_to_dict(r) for r in rows]


@router.post("/members")
def create_member(body: MemberCreate, db: Session = Depends(get_db)):
    m = ShiftMember(
        name=body.name, team=body.team,
        vendor_name=body.vendor_name,
        personnel_member_id=body.personnel_member_id,
        order_idx=body.order_idx,
        schedule_type=body.schedule_type,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return member_to_dict(m)


@router.put("/members/{member_id}")
def update_member(member_id: int, body: MemberUpdate, db: Session = Depends(get_db)):
    m = db.query(ShiftMember).filter(ShiftMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    if body.name is not None:
        m.name = body.name
    if body.team is not None:
        m.team = body.team
    if body.vendor_name is not None:
        m.vendor_name = body.vendor_name
    if body.order_idx is not None:
        m.order_idx = body.order_idx
    if body.is_active is not None:
        m.is_active = body.is_active
    db.commit()
    return member_to_dict(m)


@router.delete("/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    m = db.query(ShiftMember).filter(ShiftMember.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    m.is_active = False
    db.commit()
    return {"ok": True}


# ─── Schedules ────────────────────────────────────────────────────────────────

class ScheduleUpsert(BaseModel):
    member_id: int
    work_date: str  # YYYY-MM-DD
    shift_type: str  # 1 / 2 / 휴가 / 연차 / 반차 / 반반차A / 반반차B / 오후 / 교육


class BulkUpsert(BaseModel):
    entries: list[ScheduleUpsert]


@router.get("/schedules")
def list_schedules(year: int, month: int, db: Session = Depends(get_db)):
    prefix = f"{year:04d}-{month:02d}-"
    rows = db.query(ShiftScheduleEntry).filter(
        ShiftScheduleEntry.work_date.like(f"{prefix}%")
    ).all()
    return [{"member_id": r.member_id, "work_date": r.work_date, "shift_type": r.shift_type} for r in rows]


@router.put("/schedules")
def upsert_schedule(body: ScheduleUpsert, db: Session = Depends(get_db)):
    row = db.query(ShiftScheduleEntry).filter(
        ShiftScheduleEntry.member_id == body.member_id,
        ShiftScheduleEntry.work_date == body.work_date,
    ).first()
    if row:
        row.shift_type = body.shift_type
    else:
        row = ShiftScheduleEntry(
            member_id=body.member_id,
            work_date=body.work_date,
            shift_type=body.shift_type,
        )
        db.add(row)
    db.commit()
    return {"member_id": body.member_id, "work_date": body.work_date, "shift_type": body.shift_type}


@router.post("/schedules/bulk")
def bulk_upsert(body: BulkUpsert, db: Session = Depends(get_db)):
    for entry in body.entries:
        row = db.query(ShiftScheduleEntry).filter(
            ShiftScheduleEntry.member_id == entry.member_id,
            ShiftScheduleEntry.work_date == entry.work_date,
        ).first()
        if row:
            row.shift_type = entry.shift_type
        else:
            row = ShiftScheduleEntry(
                member_id=entry.member_id,
                work_date=entry.work_date,
                shift_type=entry.shift_type,
            )
            db.add(row)
    db.commit()
    return {"ok": True, "count": len(body.entries)}


# ─── UI 설정 ──────────────────────────────────────────────────────────────────

SUMMARY_ROWS_KEY = "shift_summary_rows"


@router.get("/settings/summary-rows")
def get_summary_rows(db: Session = Depends(get_db)):
    row = db.query(SystemSetting).filter(SystemSetting.key == SUMMARY_ROWS_KEY).first()
    if row:
        return {"value": json.loads(row.value)}
    return {"value": None}


@router.put("/settings/summary-rows")
def save_summary_rows(body: dict, db: Session = Depends(get_db)):
    value = json.dumps(body.get("value", []))
    row = db.query(SystemSetting).filter(SystemSetting.key == SUMMARY_ROWS_KEY).first()
    if row:
        row.value = value
    else:
        db.add(SystemSetting(key=SUMMARY_ROWS_KEY, value=value))
    db.commit()
    return {"ok": True}


# ─── 인원관리 연동 ─────────────────────────────────────────────────────────────

@router.get("/personnel-groups")
def get_personnel_groups(schedule_type: str = "general", db: Session = Depends(get_db)):
    """인원관리의 업체+직원 목록을 읽기 전용으로 반환 (근무표 연동용)"""
    vendors = db.query(PersonnelVendor).filter(PersonnelVendor.is_active == True).order_by(PersonnelVendor.name).all()
    members = db.query(PersonnelMember).filter(PersonnelMember.is_active == True).order_by(PersonnelMember.name).all()
    vendor_map = {v.id: v.name for v in vendors}

    existing_pids = {
        m.personnel_member_id
        for m in db.query(ShiftMember).filter(
            ShiftMember.is_active == True,
            ShiftMember.personnel_member_id != None,
            ShiftMember.schedule_type == schedule_type,
        ).all()
    }

    return {
        "vendors": [{"id": v.id, "name": v.name} for v in vendors],
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "position": m.position,
                "shift": m.shift,
                "vendor_id": m.vendor_id,
                "vendor_name": vendor_map.get(m.vendor_id, ""),
                "already_added": m.id in existing_pids,
            }
            for m in members
        ],
    }


class ImportMembersBody(BaseModel):
    personnel_member_ids: list[int]
    schedule_type: str = "general"


@router.post("/import-from-personnel")
def import_from_personnel(body: ImportMembersBody, db: Session = Depends(get_db)):
    """인원관리에서 선택한 직원을 근무표 멤버로 추가"""
    vendors = db.query(PersonnelVendor).all()
    vendor_map = {v.id: v.name for v in vendors}

    added = 0
    max_order = db.query(ShiftMember).filter(ShiftMember.schedule_type == body.schedule_type).count()

    for pid in body.personnel_member_ids:
        pm = db.query(PersonnelMember).filter(PersonnelMember.id == pid, PersonnelMember.is_active == True).first()
        if not pm:
            continue
        # 해당 schedule_type에 이미 등록된 경우 스킵
        existing = db.query(ShiftMember).filter(
            ShiftMember.personnel_member_id == pid,
            ShiftMember.is_active == True,
            ShiftMember.schedule_type == body.schedule_type,
        ).first()
        if existing:
            continue
        m = ShiftMember(
            name=pm.name,
            team=pm.shift or "",
            vendor_name=vendor_map.get(pm.vendor_id, ""),
            personnel_member_id=pid,
            order_idx=max_order + added,
            schedule_type=body.schedule_type,
        )
        db.add(m)
        added += 1

    db.commit()
    return {"ok": True, "added": added}


# ── 공휴일 조회 (읽기 전용, 일반 사용자도 가능) ──────────────────────────

@router.get("/holidays")
def get_holidays_for_shift(year: int | None = None, month: int | None = None,
                            db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(KoreanHoliday)
    if year:
        q = q.filter(KoreanHoliday.date.like(f"{year}-%"))
    if month:
        q = q.filter(KoreanHoliday.date.like(f"%-{str(month).zfill(2)}-%"))
    rows = q.order_by(KoreanHoliday.date).all()
    return [{"date": r.date, "name": r.name, "is_substitute": r.is_substitute} for r in rows]
