from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import MocvdMachine, MocvdSource, SourceChangeLog, SourceType, SystemSetting
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
    unit: str = "kg"


class BulkSourceUpdate(BaseModel):
    machine_no: int
    source_name: str
    initial_amount: float = 0.0
    threshold_ratio: float = DEFAULT_THRESHOLD_RATIO
    remaining: float = 0.0
    daily_usage: float = 0.0
    unit: str = "kg"


class SourceChangeLogCreate(BaseModel):
    install_date: str
    removal_date: str = ""
    machine_no: int
    source_name: str
    work_type: str = "교체"
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


class SourceStatusSettingsUpdate(BaseModel):
    overdue_days: int = DEFAULT_OVERDUE_DAYS
    urgent_days: int = DEFAULT_URGENT_DAYS


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
            row.unit = item.unit
        else:
            db.add(
                MocvdSource(
                    machine_no=item.machine_no,
                    source_name=item.source_name,
                    initial_amount=item.initial_amount,
                    threshold_ratio=item.threshold_ratio,
                    remaining=item.remaining,
                    daily_usage=item.daily_usage,
                    unit=item.unit,
                )
            )
    db.commit()
    return {"result": "ok", "updated": len(items)}


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
            "unit": row.unit,
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
        raise HTTPException(status_code=404, detail="작업 일지를 찾을 수 없습니다.")
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


@router.delete("/source-change-logs/{log_id}")
def delete_source_change_log(log_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = db.query(SourceChangeLog).filter(SourceChangeLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="작업 일지를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
    return {"result": "ok"}
