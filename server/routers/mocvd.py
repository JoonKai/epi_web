from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import MocvdSource, MocvdMachine, SourceType
from auth import get_current_user
from source_status import filter_source_status_snapshot, get_source_status_snapshot

router = APIRouter(prefix="/api/mocvd", tags=["mocvd"])


class SourceUpdate(BaseModel):
    source_name: str
    remaining: float
    unit: str


class BulkSourceUpdate(BaseModel):
    machine_no: int
    source_name: str
    remaining: float
    daily_usage: float = 0.0
    unit: str


@router.get("/machines")
def get_machines(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    return [{"machine_no": r.machine_no, "description": r.description, "is_active": r.is_active} for r in rows]


@router.get("/source/{machine_no}")
def get_sources(machine_no: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    source_types = db.query(SourceType).filter(SourceType.is_active == True).order_by(SourceType.order_idx).all()
    rows = db.query(MocvdSource).filter(MocvdSource.machine_no == machine_no).all()
    existing = {r.source_name: r for r in rows}

    result = []
    for st in source_types:
        if st.name in existing:
            r = existing[st.name]
            result.append({
                "id": r.id,
                "source_name": r.source_name,
                "remaining": r.remaining,
                "unit": r.unit,
                "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M") if r.updated_at else None,
            })
        else:
            result.append({
                "id": None,
                "source_name": st.name,
                "remaining": 0.0,
                "unit": "kg",
                "updated_at": None,
            })
    return result


@router.put("/source/{machine_no}")
def update_sources(machine_no: int, items: list[SourceUpdate], db: Session = Depends(get_db), _=Depends(get_current_user)):
    for item in items:
        row = db.query(MocvdSource).filter(
            MocvdSource.machine_no == machine_no,
            MocvdSource.source_name == item.source_name,
        ).first()
        if row:
            row.remaining = item.remaining
            row.unit = item.unit
        else:
            db.add(MocvdSource(machine_no=machine_no, source_name=item.source_name,
                               remaining=item.remaining, unit=item.unit))
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
            row.remaining = item.remaining
            row.daily_usage = item.daily_usage
            row.unit = item.unit
        else:
            db.add(
                MocvdSource(
                    machine_no=item.machine_no,
                    source_name=item.source_name,
                    remaining=item.remaining,
                    daily_usage=item.daily_usage,
                    unit=item.unit,
                )
            )
    db.commit()
    return {"result": "ok", "updated": len(items)}


@router.get("/sources/all")
def get_all_sources(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """전 호기 × 전 소스 현황 (DataGrid용)"""
    machines = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    source_types = db.query(SourceType).filter(SourceType.is_active == True).order_by(SourceType.order_idx).all()
    source_names = [s.name for s in source_types]

    # 모든 소스 데이터를 machine_no 기준으로 그룹화
    all_rows = db.query(MocvdSource).all()
    data_map = {}
    for r in all_rows:
        data_map[(r.machine_no, r.source_name)] = {
            "remaining": r.remaining,
            "daily_usage": r.daily_usage if r.daily_usage is not None else 0.0,
            "unit": r.unit,
            "updated_at": r.updated_at,
        }

    result = []
    for m in machines:
        row = {"machine_no": m.machine_no, "description": m.description or ""}
        latest_at = None
        for sname in source_names:
            key = (m.machine_no, sname)
            if key in data_map:
                row[sname] = data_map[key]["remaining"]
                row[f"{sname}_daily_usage"] = data_map[key]["daily_usage"]
                row[f"{sname}_unit"] = data_map[key]["unit"]
                if data_map[key]["updated_at"] and (latest_at is None or data_map[key]["updated_at"] > latest_at):
                    latest_at = data_map[key]["updated_at"]
            else:
                row[sname] = None
                row[f"{sname}_daily_usage"] = 0.0
                row[f"{sname}_unit"] = "kg"
        row["updated_at"] = latest_at.strftime("%Y-%m-%d %H:%M") if latest_at else None
        result.append(row)

    return {"source_names": source_names, "rows": result}


@router.get("/source-status")
def get_source_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    try:
        snapshot = get_source_status_snapshot()
        active_machine_nos = {
            row.machine_no
            for row in db.query(MocvdMachine).filter(MocvdMachine.is_active == True).all()
        }
        active_source_names = {
            row.name
            for row in db.query(SourceType).filter(SourceType.is_active == True).all()
        }
        return filter_source_status_snapshot(snapshot, active_machine_nos, active_source_names)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
