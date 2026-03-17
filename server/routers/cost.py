from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import CostItem, CostVendor, PurchaseRequest, RepairStatus

router = APIRouter(prefix="/api/cost", tags=["cost"])


class CostItemCreate(BaseModel):
    category: str = ""
    code: str
    name: str
    unit: str = "EA"
    is_active: bool = True


class CostVendorCreate(BaseModel):
    vendor_code: str
    vendor_name: str
    business_type: str = ""
    manager: str = ""
    contact: str = ""
    is_active: bool = True


class PurchaseRequestCreate(BaseModel):
    request_date: str
    material_code: str = ""
    item_name: str
    quantity: int = 1
    vendor_name: str = ""
    requester: str = ""
    actual_draft_count: int = 0
    purchase_reason: str = ""
    approval_status: str = "기안 전"
    draft_date: str = ""
    receipt_date: str = ""
    note: str = ""


def _serialize_cost_item(row: CostItem) -> dict:
    return {
        "id": row.id,
        "category": row.category,
        "code": row.code,
        "name": row.name,
        "unit": row.unit,
        "is_active": row.is_active,
    }


def _serialize_cost_vendor(row: CostVendor) -> dict:
    return {
        "id": row.id,
        "vendor_code": row.vendor_code,
        "vendor_name": row.vendor_name,
        "business_type": row.business_type,
        "manager": row.manager,
        "contact": row.contact,
        "is_active": row.is_active,
    }


def _serialize_purchase_request(row: PurchaseRequest) -> dict:
    return {
        "id": row.id,
        "request_date": row.request_date,
        "material_code": row.material_code,
        "item_name": row.item_name,
        "quantity": row.quantity,
        "vendor_name": row.vendor_name,
        "requester": row.requester,
        "actual_draft_count": row.actual_draft_count,
        "purchase_reason": row.purchase_reason,
        "approval_status": row.approval_status,
        "draft_date": row.draft_date,
        "receipt_date": row.receipt_date,
        "note": row.note,
    }


def _serialize_repair_status(row: RepairStatus) -> dict:
    return {
        "id": row.id,
        "receipt_type": row.receipt_type,
        "repair_status": row.repair_status,
        "outbound_date": row.outbound_date,
        "inbound_date": row.inbound_date,
        "equipment_name": row.equipment_name,
        "location": row.location,
        "chamber": row.chamber,
        "material_code": row.material_code,
        "material_name": row.material_name,
        "spec": row.spec,
        "vendor_name": row.vendor_name,
        "vendor_code": row.vendor_code,
        "repair_reason": row.repair_reason,
    }


@router.get("/items")
def list_cost_items(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(CostItem).order_by(CostItem.is_active.desc(), CostItem.code.asc()).all()
    return [_serialize_cost_item(row) for row in rows]


@router.post("/items")
def create_cost_item(body: CostItemCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = CostItem(
        category=body.category.strip(),
        code=body.code.strip(),
        name=body.name.strip(),
        unit=body.unit.strip() or "EA",
        is_active=body.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_cost_item(row)


@router.get("/vendors")
def list_cost_vendors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(CostVendor).order_by(CostVendor.is_active.desc(), CostVendor.vendor_code.asc()).all()
    return [_serialize_cost_vendor(row) for row in rows]


@router.post("/vendors")
def create_cost_vendor(body: CostVendorCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = CostVendor(
        vendor_code=body.vendor_code.strip(),
        vendor_name=body.vendor_name.strip(),
        business_type=body.business_type.strip(),
        manager=body.manager.strip(),
        contact=body.contact.strip(),
        is_active=body.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_cost_vendor(row)


@router.get("/purchase-requests")
def list_purchase_requests(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(PurchaseRequest).order_by(PurchaseRequest.request_date.desc(), PurchaseRequest.id.desc()).all()
    return [_serialize_purchase_request(row) for row in rows]


@router.post("/purchase-requests")
def create_purchase_request(body: PurchaseRequestCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    row = PurchaseRequest(
        request_date=body.request_date,
        material_code=body.material_code.strip(),
        item_name=body.item_name.strip(),
        quantity=max(1, int(body.quantity)),
        vendor_name=body.vendor_name.strip(),
        requester=body.requester.strip(),
        actual_draft_count=max(0, int(body.actual_draft_count)),
        purchase_reason=body.purchase_reason.strip(),
        approval_status=body.approval_status.strip() or "기안 전",
        draft_date=body.draft_date.strip(),
        receipt_date=body.receipt_date.strip(),
        note=body.note.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_purchase_request(row)


@router.get("/repair-status")
def list_repair_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(RepairStatus).order_by(RepairStatus.outbound_date.desc(), RepairStatus.id.desc()).all()
    return [_serialize_repair_status(row) for row in rows]
