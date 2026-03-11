from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import MocvdSource, MocvdMachine, SourceType
from auth import get_current_user

router = APIRouter(prefix="/api/mocvd", tags=["mocvd"])


class SourceUpdate(BaseModel):
    source_name: str
    remaining: float
    unit: str


@router.get("/machines")
def get_machines(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(MocvdMachine).filter(MocvdMachine.is_active == True).order_by(MocvdMachine.machine_no).all()
    return [{"machine_no": r.machine_no, "description": r.description} for r in rows]


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
