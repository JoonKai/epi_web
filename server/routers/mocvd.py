import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from datetime import datetime, date, timedelta
from models import EquipmentHistory, MocvdHandoverNote, MocvdMachine, MocvdNotice, MocvdPmCounter, MocvdSource, SourceChangeLog, SourceRemainingHistory, SourceType, SystemSetting
from source_status import (
    DEFAULT_OVERDUE_DAYS,
    DEFAULT_THRESHOLD_RATIO,
    DEFAULT_URGENT_DAYS,
    build_source_status_snapshot,
)

router = APIRouter(prefix="/api/mocvd", tags=["mocvd"])


class SourceUpdate(BaseModel):
    source_name: str
    initial_amount: float = 0.0
    threshold_ratio: float = DEFAULT_THRESHOLD_RATIO
    remaining: float = 0.0
    daily_usage: float = 0.0
    is_disabled: bool = False
    unit: str = "kg"


class BulkSourceUpdate(BaseModel):
    machine_no: int
    source_name: str
    initial_amount: float = 0.0
    threshold_ratio: float = DEFAULT_THRESHOLD_RATIO
    remaining: float = 0.0
    daily_usage: float = 0.0
    is_disabled: bool = False
    unit: str = "kg"
    memo: dict = {}


class SourceChangeLogCreate(BaseModel):
    install_date: str
    removal_date: str = ""
    machine_no: int
    source_name: str
    work_type: str = "援먯껜"
    zone: str = ""
    line_name: str = ""
    production_group: str = ""
    source_slot: str = ""
    source_number: str = ""
    vendor_name: str = ""
    cylinder_no: str = ""
    lot_no: str = ""
    net_weight: float = 0.0
    reset_weight: float = 0.0
    before_value: float = 0.0
    after_value: float = 0.0
    used_amount: float = 0.0
    used_percent: float = 0.0
    runtime_hours: float = 0.0
    sql_value: float = 0.0
    ctc_value: float = 0.0
    worker_name: str = ""
    note: str = ""


class SourceChangeLogUpdate(SourceChangeLogCreate):
    pass


class SiH4ChangeLogCreate(BaseModel):
    install_date: str = ""
    removal_date: str = ""
    cabinet_no: str = ""
    gas_name: str = ""
    slot: str = ""
    cylinder_no: str = ""
    worker_name: str = ""
    note: str = ""


class SiH4ChangeLogUpdate(SiH4ChangeLogCreate):
    pass


class SourceStatusSettingsUpdate(BaseModel):
    overdue_days: int = DEFAULT_OVERDUE_DAYS
    urgent_days: int = DEFAULT_URGENT_DAYS


class HandoverNoteCreate(BaseModel):
    handover_date: str
    shift_type: str
    title: str = ""
    content: str


class HandoverNoteUpdate(HandoverNoteCreate):
    pass


class NoticeCreate(BaseModel):
    title: str = ""
    content: str
    color: str = "#c4cdd8"
    is_active: bool = True


class NoticeUpdate(NoticeCreate):
    pass


class PmCounterUpdateItem(BaseModel):
    machine_no: int
    chamber_count: float = 0.0
    pm_base_count: float = 0.0
    filter_count: float = 0.0
    filter_base_count: float = 0.0


def _can_manage_handover_note(current_user, row: MocvdHandoverNote) -> bool:
    return getattr(current_user, "role", "") == "admin" or row.author == getattr(current_user, "username", "")


def _require_admin(current_user):
    if getattr(current_user, "role", "") != "admin":
        raise HTTPException(status_code=403, detail="愿由ъ옄留?泥섎━?????덉뒿?덈떎.")


def _active_source_types(db: Session):
    return db.query(SourceType).filter(SourceType.is_active == True).order_by(SourceType.order_idx).all()


def _read_int_setting(db: Session, key: str, default: int) -> int:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not row or row.value in (None, ""):
        return default
    try:
        return int(row.value)
    except ValueError:
        return default


def _get_source_status_settings(db: Session) -> dict[str, int]:
    overdue_days = _read_int_setting(db, "source_status_overdue_days", DEFAULT_OVERDUE_DAYS)
    urgent_days = _read_int_setting(db, "source_status_urgent_days", DEFAULT_URGENT_DAYS)
    if urgent_days < overdue_days:
        urgent_days = overdue_days
    return {"overdue_days": overdue_days, "urgent_days": urgent_days}


@router.get("/machines")
def get_machines(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    return [{"machine_no": row.machine_no, "description": row.description, "is_active": row.is_active} for row in rows]


@router.get("/pm-counters")
def get_pm_counters(db: Session = Depends(get_db), _=Depends(get_current_user)):
    machines = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    counter_map = {
        row.machine_no: row
        for row in db.query(MocvdPmCounter).all()
    }

    result = []
    for machine in machines:
        row = counter_map.get(machine.machine_no)
        result.append(
            {
                "machine_no": machine.machine_no,
                "description": machine.description or "",
                "chamber_count": row.chamber_count if row and row.chamber_count is not None else 0.0,
                "pm_base_count": row.pm_base_count if row and row.pm_base_count is not None else 0.0,
                "filter_count": row.filter_count if row and row.filter_count is not None else 0.0,
                "filter_base_count": row.filter_base_count if row and row.filter_base_count is not None else 0.0,
                "updated_at": row.updated_at.strftime("%Y-%m-%d %H:%M") if row and row.updated_at else None,
            }
        )
    return result


@router.put("/pm-counters")
def update_pm_counters(items: list[PmCounterUpdateItem], db: Session = Depends(get_db), _=Depends(get_current_user)):
    machine_nos = {
        row.machine_no
        for row in db.query(MocvdMachine.machine_no).filter(MocvdMachine.is_active == True).all()
    }
    existing = {
        row.machine_no: row
        for row in db.query(MocvdPmCounter).all()
    }

    updated = 0
    for item in items:
        if item.machine_no not in machine_nos:
            continue

        row = existing.get(item.machine_no)
        if row:
            row.chamber_count = item.chamber_count
            row.pm_base_count = item.pm_base_count
            row.filter_count = item.filter_count
            row.filter_base_count = item.filter_base_count
        else:
            db.add(
                MocvdPmCounter(
                    machine_no=item.machine_no,
                    chamber_count=item.chamber_count,
                    pm_base_count=item.pm_base_count,
                    filter_count=item.filter_count,
                    filter_base_count=item.filter_base_count,
                )
            )
        updated += 1

    db.commit()
    return {"result": "ok", "updated": updated}


@router.get("/source-types")
def get_source_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = _active_source_types(db)
    return [{"id": row.id, "name": row.name, "order_idx": row.order_idx} for row in rows]


@router.get("/source-status-settings")
def get_source_status_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _get_source_status_settings(db)


@router.put("/source-status-settings")
def update_source_status_settings(body: SourceStatusSettingsUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    overdue_days = max(0, body.overdue_days)
    urgent_days = max(overdue_days, body.urgent_days)

    for key, value in {
        "source_status_overdue_days": overdue_days,
        "source_status_urgent_days": urgent_days,
    }.items():
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(SystemSetting(key=key, value=str(value)))
    db.commit()
    return {"overdue_days": overdue_days, "urgent_days": urgent_days}


@router.get("/source/{machine_no}")
def get_sources(machine_no: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    source_types = _active_source_types(db)
    rows = db.query(MocvdSource).filter(MocvdSource.machine_no == machine_no).all()
    existing = {row.source_name: row for row in rows}

    result = []
    for source_type in source_types:
        row = existing.get(source_type.name)
        result.append(
            {
                "id": row.id if row else None,
                "source_name": source_type.name,
                "initial_amount": row.initial_amount if row and row.initial_amount is not None else 0.0,
                "threshold_ratio": row.threshold_ratio if row and row.threshold_ratio is not None else DEFAULT_THRESHOLD_RATIO,
                "remaining": row.remaining if row else 0.0,
                "daily_usage": row.daily_usage if row and row.daily_usage is not None else 0.0,
                "is_disabled": row.is_disabled if row else False,
                "unit": row.unit if row and row.unit else "kg",
                "updated_at": row.updated_at.strftime("%Y-%m-%d %H:%M") if row and row.updated_at else None,
            }
        )
    return result


@router.put("/source/{machine_no}")
def update_sources(machine_no: int, items: list[SourceUpdate], db: Session = Depends(get_db), _=Depends(get_current_user)):
    for item in items:
        row = db.query(MocvdSource).filter(
            MocvdSource.machine_no == machine_no,
            MocvdSource.source_name == item.source_name,
        ).first()
        if row:
            row.initial_amount = item.initial_amount
            row.threshold_ratio = item.threshold_ratio
            row.remaining = item.remaining
            row.daily_usage = item.daily_usage
            row.is_disabled = item.is_disabled
            row.unit = item.unit
        else:
            db.add(
                MocvdSource(
                    machine_no=machine_no,
                    source_name=item.source_name,
                    initial_amount=item.initial_amount,
                    threshold_ratio=item.threshold_ratio,
                    remaining=item.remaining,
                    daily_usage=item.daily_usage,
                    is_disabled=item.is_disabled,
                    unit=item.unit,
                )
            )
    db.commit()
    return {"result": "ok"}
@router.put("/sources/all")
def update_all_sources(items: list[BulkSourceUpdate], db: Session = Depends(get_db), _=Depends(get_current_user)):
    for item in items:
        row = db.query(MocvdSource).filter(
            MocvdSource.machine_no == item.machine_no,
            MocvdSource.source_name == item.source_name,
        ).first()
        if row:
            row.initial_amount = item.initial_amount
            row.threshold_ratio = item.threshold_ratio
            row.remaining = item.remaining
            row.daily_usage = item.daily_usage
            row.is_disabled = item.is_disabled
            row.unit = item.unit
            row.memo = json.dumps(item.memo, ensure_ascii=False)
        else:
            db.add(
                MocvdSource(
                    machine_no=item.machine_no,
                    source_name=item.source_name,
                    initial_amount=item.initial_amount,
                    threshold_ratio=item.threshold_ratio,
                    remaining=item.remaining,
                    daily_usage=item.daily_usage,
                    is_disabled=item.is_disabled,
                    unit=item.unit,
                    memo=json.dumps(item.memo, ensure_ascii=False),
                )
            )
    db.commit()
    _snapshot_today([
        {"machine_no": item.machine_no, "source_name": item.source_name,
         "remaining": item.remaining, "daily_usage": item.daily_usage}
        for item in items
    ], db)
    db.commit()
    return {"result": "ok", "updated": len(items)}


def _snapshot_today(items_iter, db: Session):
    """??????ㅻ뒛 ?좎쭨 ?붾웾 ?ㅻ깄?룹쓣 upsert."""
    today = date.today()
    cutoff = today - timedelta(days=180)
    db.query(SourceRemainingHistory).filter(
        SourceRemainingHistory.recorded_date < cutoff
    ).delete(synchronize_session=False)
    for item in items_iter:
        existing = db.query(SourceRemainingHistory).filter(
            SourceRemainingHistory.machine_no == item["machine_no"],
            SourceRemainingHistory.source_name == item["source_name"],
            SourceRemainingHistory.recorded_date == today,
        ).first()
        if existing:
            existing.remaining = item["remaining"]
            existing.daily_usage = item["daily_usage"]
        else:
            db.add(SourceRemainingHistory(
                machine_no=item["machine_no"],
                source_name=item["source_name"],
                remaining=item["remaining"],
                daily_usage=item["daily_usage"],
                recorded_date=today,
            ))


@router.get("/sources/history")
def get_source_history(days: int = 180, db: Session = Depends(get_db), _=Depends(get_current_user)):
    since = date.today() - timedelta(days=days)
    rows = db.query(SourceRemainingHistory).filter(
        SourceRemainingHistory.recorded_date >= since
    ).order_by(SourceRemainingHistory.recorded_date).all()
    return [
        {
            "machine_no": r.machine_no,
            "source_name": r.source_name,
            "remaining": r.remaining,
            "daily_usage": r.daily_usage,
            "recorded_date": r.recorded_date.strftime("%Y-%m-%d"),
        }
        for r in rows
    ]


@router.get("/sources/all")
def get_all_sources(db: Session = Depends(get_db), _=Depends(get_current_user)):
    machines = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    source_types = _active_source_types(db)
    source_names = [source_type.name for source_type in source_types]

    all_rows = db.query(MocvdSource).all()
    data_map = {}
    for row in all_rows:
        data_map[(row.machine_no, row.source_name)] = {
            "initial_amount": row.initial_amount if row.initial_amount is not None else 0.0,
            "threshold_ratio": row.threshold_ratio if row.threshold_ratio is not None else DEFAULT_THRESHOLD_RATIO,
            "remaining": row.remaining,
            "daily_usage": row.daily_usage if row.daily_usage is not None else 0.0,
            "is_disabled": bool(row.is_disabled),
            "unit": row.unit,
            "memo": json.loads(row.memo or '{}'),
            "updated_at": row.updated_at,
        }

    result = []
    for machine in machines:
        row = {"machine_no": machine.machine_no, "description": machine.description or ""}
        latest_at = None
        for source_name in source_names:
            entry = data_map.get((machine.machine_no, source_name))
            row[source_name] = entry["remaining"] if entry else 0.0
            row[f"{source_name}_initial_amount"] = entry["initial_amount"] if entry else 0.0
            row[f"{source_name}_threshold_ratio"] = entry["threshold_ratio"] if entry else DEFAULT_THRESHOLD_RATIO
            row[f"{source_name}_daily_usage"] = entry["daily_usage"] if entry else 0.0
            row[f"{source_name}_is_disabled"] = entry["is_disabled"] if entry else False
            row[f"{source_name}_memo"] = entry["memo"] if entry else {}
            row[f"{source_name}_unit"] = entry["unit"] if entry and entry["unit"] else "kg"
            if entry and entry["updated_at"] and (latest_at is None or entry["updated_at"] > latest_at):
                latest_at = entry["updated_at"]
        row["updated_at"] = latest_at.strftime("%Y-%m-%d %H:%M") if latest_at else None
        result.append(row)

    return {
        "source_names": source_names,
        "rows": result,
        "status_settings": _get_source_status_settings(db),
    }


@router.get("/source-status")
def get_source_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    machines = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    source_types = _active_source_types(db)
    source_rows = db.query(MocvdSource).all()
    settings = _get_source_status_settings(db)
    return build_source_status_snapshot(
        machines,
        source_types,
        source_rows,
        overdue_days=settings["overdue_days"],
        urgent_days=settings["urgent_days"],
    )


@router.get("/notices")
def list_notices(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(MocvdNotice)
        .filter(MocvdNotice.is_active == True)
        .order_by(MocvdNotice.updated_at.desc(), MocvdNotice.id.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": row.id,
            "title": row.title,
            "content": row.content,
            "color": row.color or "#c4cdd8",
            "is_active": row.is_active,
            "author": row.author,
            "created_at": row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else None,
            "updated_at": row.updated_at.strftime("%Y-%m-%d %H:%M") if row.updated_at else None,
        }
        for row in rows
    ]


@router.post("/notices")
def create_notice(
    body: NoticeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_admin(current_user)
    db.add(
        MocvdNotice(
            title=body.title.strip(),
            content=body.content.strip(),
            color=body.color or "#c4cdd8",
            is_active=body.is_active,
            author=getattr(current_user, "username", ""),
        )
    )
    db.commit()
    return {"result": "ok"}


@router.put("/notices/{notice_id}")
def update_notice(
    notice_id: int,
    body: NoticeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_admin(current_user)
    row = db.query(MocvdNotice).filter(MocvdNotice.id == notice_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="怨듭??ы빆??李얠쓣 ???놁뒿?덈떎.")
    row.title = body.title.strip()
    row.content = body.content.strip()
    row.color = body.color or "#c4cdd8"
    row.is_active = body.is_active
    db.commit()
    return {"result": "ok"}


@router.delete("/notices/{notice_id}")
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_admin(current_user)
    row = db.query(MocvdNotice).filter(MocvdNotice.id == notice_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="怨듭??ы빆??李얠쓣 ???놁뒿?덈떎.")
    db.delete(row)
    db.commit()
    return {"result": "ok"}


@router.get("/handover-notes")
def list_handover_notes(
    shift_type: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(MocvdHandoverNote).order_by(MocvdHandoverNote.handover_date.desc(), MocvdHandoverNote.updated_at.desc())
    if shift_type in {"day", "night"}:
        query = query.filter(MocvdHandoverNote.shift_type == shift_type)
    rows = query.limit(50).all()
    return [
        {
          "id": row.id,
          "handover_date": row.handover_date,
          "shift_type": row.shift_type,
          "title": row.title,
          "content": row.content,
          "author": row.author,
          "created_at": row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else None,
          "updated_at": row.updated_at.strftime("%Y-%m-%d %H:%M") if row.updated_at else None,
        }
        for row in rows
    ]


@router.post("/handover-notes")
def create_handover_note(
    body: HandoverNoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shift_type = body.shift_type if body.shift_type in {"day", "night"} else "day"
    db.add(
        MocvdHandoverNote(
            handover_date=body.handover_date,
            shift_type=shift_type,
            title=body.title,
            content=body.content,
            author=getattr(current_user, "username", ""),
        )
    )
    db.commit()
    return {"result": "ok"}


@router.put("/handover-notes/{note_id}")
def update_handover_note(
    note_id: int,
    body: HandoverNoteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = db.query(MocvdHandoverNote).filter(MocvdHandoverNote.id == note_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="?몄닔?멸퀎 寃뚯떆湲??李얠쓣 ???놁뒿?덈떎.")
    if not _can_manage_handover_note(current_user, row):
        raise HTTPException(status_code=403, detail="愿由ъ옄瑜??쒖쇅?섍퀬 蹂몄씤???묒꽦???몄닔?멸퀎?쇱?留??섏젙?????덉뒿?덈떎.")
    row.handover_date = body.handover_date
    row.shift_type = body.shift_type if body.shift_type in {"day", "night"} else row.shift_type
    row.title = body.title
    row.content = body.content
    db.commit()
    return {"result": "ok"}


@router.delete("/handover-notes/{note_id}")
def delete_handover_note(note_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = db.query(MocvdHandoverNote).filter(MocvdHandoverNote.id == note_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="?몄닔?멸퀎 寃뚯떆湲??李얠쓣 ???놁뒿?덈떎.")
    if not _can_manage_handover_note(current_user, row):
        raise HTTPException(status_code=403, detail="愿由ъ옄瑜??쒖쇅?섍퀬 蹂몄씤???묒꽦???몄닔?멸퀎?쇱?留???젣?????덉뒿?덈떎.")
    db.delete(row)
    db.commit()
    return {"result": "ok"}


@router.get("/source-change-logs")
def list_source_change_logs(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(SourceChangeLog).order_by(SourceChangeLog.install_date.desc(), SourceChangeLog.id.desc()).all()
    return [
        {
            "id": row.id,
            "install_date": row.install_date,
            "removal_date": row.removal_date,
            "machine_no": row.machine_no,
            "source_name": row.source_name,
            "work_type": row.work_type,
            "zone": row.zone,
            "line_name": row.line_name,
            "production_group": row.production_group,
            "source_slot": row.source_slot,
            "source_number": row.source_number,
            "vendor_name": row.vendor_name,
            "cylinder_no": row.cylinder_no,
            "lot_no": row.lot_no,
            "net_weight": row.net_weight,
            "reset_weight": row.reset_weight,
            "before_value": row.before_value,
            "after_value": row.after_value,
            "used_amount": row.used_amount,
            "used_percent": row.used_percent,
            "runtime_hours": row.runtime_hours,
            "sql_value": row.sql_value,
            "ctc_value": row.ctc_value,
            "worker_name": row.worker_name,
            "note": row.note,
            "created_at": row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/source-change-logs")
def create_source_change_log(body: SourceChangeLogCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    db.add(
        SourceChangeLog(
            install_date=body.install_date,
            removal_date=body.removal_date,
            machine_no=body.machine_no,
            source_name=body.source_name,
            work_type=body.work_type,
            zone=body.zone,
            line_name=body.line_name,
            production_group=body.production_group,
            source_slot=body.source_slot,
            source_number=body.source_number,
            vendor_name=body.vendor_name,
            cylinder_no=body.cylinder_no,
            lot_no=body.lot_no,
            net_weight=body.net_weight,
            reset_weight=body.reset_weight,
            before_value=body.before_value,
            after_value=body.after_value,
            used_amount=body.used_amount,
            used_percent=body.used_percent,
            runtime_hours=body.runtime_hours,
            sql_value=body.sql_value,
            ctc_value=body.ctc_value,
            worker_name=body.worker_name,
            note=body.note,
        )
    )
    db.commit()
    return {"result": "ok"}


@router.put("/source-change-logs/{log_id}")
def update_source_change_log(log_id: int, body: SourceChangeLogUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = db.query(SourceChangeLog).filter(SourceChangeLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="?묒뾽 ?쇱?瑜?李얠쓣 ???놁뒿?덈떎.")
    row.install_date = body.install_date
    row.removal_date = body.removal_date
    row.machine_no = body.machine_no
    row.source_name = body.source_name
    row.work_type = body.work_type
    row.zone = body.zone
    row.line_name = body.line_name
    row.production_group = body.production_group
    row.source_slot = body.source_slot
    row.source_number = body.source_number
    row.vendor_name = body.vendor_name
    row.cylinder_no = body.cylinder_no
    row.lot_no = body.lot_no
    row.net_weight = body.net_weight
    row.reset_weight = body.reset_weight
    row.before_value = body.before_value
    row.after_value = body.after_value
    row.used_amount = body.used_amount
    row.used_percent = body.used_percent
    row.runtime_hours = body.runtime_hours
    row.sql_value = body.sql_value
    row.ctc_value = body.ctc_value
    row.worker_name = body.worker_name
    row.note = body.note
    db.commit()
    return {"result": "ok"}


def _serialize_sih4_change_log(row: SourceChangeLog):
    return {
        "id": row.id,
        "install_date": row.install_date or "",
        "removal_date": row.removal_date or "",
        "cabinet_no": "" if row.machine_no in (None, 0) else str(row.machine_no),
        "gas_name": row.source_name or "",
        "slot": row.source_slot or "",
        "cylinder_no": row.cylinder_no or "",
        "worker_name": row.worker_name or "",
        "note": row.note or "",
    }


def _parse_sih4_machine_no(value: str | None) -> int:
    text = (value or "").strip()
    if text == "":
        return 0
    return int(text)


@router.get("/sih4-change-logs")
def list_sih4_change_logs(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = (
        db.query(SourceChangeLog)
        .filter(SourceChangeLog.work_type == "SiH4 Grid")
        .order_by(SourceChangeLog.install_date.desc(), SourceChangeLog.id.desc())
        .all()
    )
    return [_serialize_sih4_change_log(row) for row in rows]


@router.post("/sih4-change-logs")
def create_sih4_change_log(body: SiH4ChangeLogCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = SourceChangeLog(
        install_date=body.install_date or "",
        removal_date=body.removal_date or "",
        machine_no=_parse_sih4_machine_no(body.cabinet_no),
        source_name=body.gas_name or "",
        work_type="SiH4 Grid",
        source_slot=body.slot or "",
        cylinder_no=body.cylinder_no or "",
        worker_name=body.worker_name or "",
        note=body.note or "",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_sih4_change_log(row)


@router.put("/sih4-change-logs/{log_id}")
def update_sih4_change_log(log_id: int, body: SiH4ChangeLogUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = (
        db.query(SourceChangeLog)
        .filter(SourceChangeLog.id == log_id, SourceChangeLog.work_type == "SiH4 Grid")
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="SiH4 작업 일지를 찾을 수 없습니다.")
    row.install_date = body.install_date or ""
    row.removal_date = body.removal_date or ""
    row.machine_no = _parse_sih4_machine_no(body.cabinet_no)
    row.source_name = body.gas_name or ""
    row.source_slot = body.slot or ""
    row.cylinder_no = body.cylinder_no or ""
    row.worker_name = body.worker_name or ""
    row.note = body.note or ""
    db.commit()
    db.refresh(row)
    return _serialize_sih4_change_log(row)


@router.delete("/sih4-change-logs/{log_id}")
def delete_sih4_change_log(log_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = (
        db.query(SourceChangeLog)
        .filter(SourceChangeLog.id == log_id, SourceChangeLog.work_type == "SiH4 Grid")
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="SiH4 작업 일지를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
    return {"result": "ok"}


@router.delete("/source-change-logs/{log_id}")
def delete_source_change_log(log_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = db.query(SourceChangeLog).filter(SourceChangeLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="?묒뾽 ?쇱?瑜?李얠쓣 ???놁뒿?덈떎.")
    db.delete(row)
    db.commit()
    return {"result": "ok"}


# ?? ?λ퉬 ?대젰 ??????????????????????????????????????????????????????????

class EquipmentHistoryCreate(BaseModel):
    machine_no: int
    event_type: str = "other"
    severity: str = "medium"
    title: str
    detail: str = ""
    occurred_at: str        # ISO date string
    resolved_at: str | None = None
    actor: str = ""

class EquipmentHistoryUpdate(BaseModel):
    event_type: str | None = None
    severity: str | None = None
    title: str | None = None
    detail: str | None = None
    occurred_at: str | None = None
    resolved_at: str | None = None
    actor: str | None = None


def _parse_dt(s: str | None):
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _row_to_dict(row: EquipmentHistory):
    return {
        "id": row.id,
        "machine_no": row.machine_no,
        "event_type": row.event_type,
        "severity": row.severity,
        "title": row.title,
        "detail": row.detail,
        "occurred_at": row.occurred_at.isoformat() if row.occurred_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        "actor": row.actor,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/equipment-history")
def list_equipment_history(machine_no: int | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(EquipmentHistory)
    if machine_no is not None:
        q = q.filter(EquipmentHistory.machine_no == machine_no)
    rows = q.order_by(EquipmentHistory.occurred_at.desc()).all()
    return [_row_to_dict(r) for r in rows]


@router.post("/equipment-history")
def create_equipment_history(body: EquipmentHistoryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = EquipmentHistory(
        machine_no=body.machine_no,
        event_type=body.event_type,
        severity=body.severity,
        title=body.title,
        detail=body.detail,
        occurred_at=_parse_dt(body.occurred_at),
        resolved_at=_parse_dt(body.resolved_at),
        actor=body.actor or user.username,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_dict(row)


@router.put("/equipment-history/{history_id}")
def update_equipment_history(history_id: int, body: EquipmentHistoryUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = db.query(EquipmentHistory).filter(EquipmentHistory.id == history_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="?대젰??李얠쓣 ???놁뒿?덈떎.")
    if body.event_type is not None:
        row.event_type = body.event_type
    if body.severity is not None:
        row.severity = body.severity
    if body.title is not None:
        row.title = body.title
    if body.detail is not None:
        row.detail = body.detail
    if body.occurred_at is not None:
        row.occurred_at = _parse_dt(body.occurred_at)
    # resolved_at? null ?ы븿 ??긽 ??뼱? (?댁젣 吏??
    row.resolved_at = _parse_dt(body.resolved_at)
    if body.actor is not None:
        row.actor = body.actor
    db.commit()
    return _row_to_dict(row)


@router.delete("/equipment-history/{history_id}")
def delete_equipment_history(history_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = db.query(EquipmentHistory).filter(EquipmentHistory.id == history_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="?대젰??李얠쓣 ???놁뒿?덈떎.")
    db.delete(row)
    db.commit()
    return {"result": "ok"}
