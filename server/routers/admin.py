from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import hash_password, require_admin
from database import get_db
from models import MocvdMachine, SourceType, SystemSetting, User

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    role: str
    is_active: bool


class MachineCreate(BaseModel):
    machine_no: int
    description: str = ""


class SourceCreate(BaseModel):
    name: str
    order_idx: int = 0


@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "is_active": user.is_active,
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
    user.role = body.role
    user.is_active = body.is_active
    db.commit()
    return {"result": "ok"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    db.delete(user)
    db.commit()
    return {"result": "ok"}


@router.put("/users/{user_id}/password")
def reset_password(user_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
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
