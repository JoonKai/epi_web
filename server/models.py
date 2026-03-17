from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", comment="admin / user")
    is_active = Column(Boolean, default=True)
    session_expire_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now())


class MocvdMachine(Base):
    __tablename__ = "mocvd_machine"

    id = Column(Integer, primary_key=True, index=True)
    machine_no = Column(Integer, unique=True, nullable=False, comment="호기 번호")
    description = Column(String(100), default="")
    is_active = Column(Boolean, default=True)


class SourceType(Base):
    __tablename__ = "source_type"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    order_idx = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class SystemSetting(Base):
    __tablename__ = "system_setting"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(200), nullable=False)


class CostItem(Base):
    __tablename__ = "cost_item"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), default="")
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    unit = Column(String(20), default="EA")
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CostVendor(Base):
    __tablename__ = "cost_vendor"

    id = Column(Integer, primary_key=True, index=True)
    vendor_code = Column(String(50), unique=True, nullable=False, index=True)
    vendor_name = Column(String(100), nullable=False, index=True)
    business_type = Column(String(100), default="")
    manager = Column(String(50), default="")
    contact = Column(String(50), default="")
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class PurchaseRequest(Base):
    __tablename__ = "purchase_request"

    id = Column(Integer, primary_key=True, index=True)
    request_date = Column(String(20), nullable=False, index=True)
    material_code = Column(String(50), default="", index=True)
    item_name = Column(String(200), nullable=False)
    quantity = Column(Integer, default=1)
    vendor_name = Column(String(100), default="")
    requester = Column(String(50), default="")
    actual_draft_count = Column(Integer, default=0)
    purchase_reason = Column(String(200), default="")
    approval_status = Column(String(50), default="기안 전", index=True)
    draft_date = Column(String(20), default="")
    receipt_date = Column(String(20), default="")
    note = Column(String(500), default="")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class RepairStatus(Base):
    __tablename__ = "repair_status"

    id = Column(Integer, primary_key=True, index=True)
    receipt_type = Column(String(50), default="", index=True)
    repair_status = Column(String(50), default="", index=True)
    outbound_date = Column(String(20), default="", index=True)
    inbound_date = Column(String(20), default="")
    equipment_name = Column(String(150), default="")
    location = Column(String(100), default="")
    chamber = Column(String(50), default="")
    material_code = Column(String(100), default="")
    material_name = Column(String(300), default="")
    spec = Column(String(200), default="")
    vendor_name = Column(String(150), default="")
    vendor_code = Column(String(50), default="")
    repair_reason = Column(String(500), default="")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class MocvdSource(Base):
    __tablename__ = "mocvd_source"

    id = Column(Integer, primary_key=True, index=True)
    machine_no = Column(Integer, nullable=False)
    source_name = Column(String(20), nullable=False)
    initial_amount = Column(Float, default=0.0)
    threshold_ratio = Column(Float, default=15.0)
    remaining = Column(Float, default=0.0)
    daily_usage = Column(Float, default=0.0)
    unit = Column(String(10), default="kg")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class MocvdPmCounter(Base):
    __tablename__ = "mocvd_pm_counter"

    id = Column(Integer, primary_key=True, index=True)
    machine_no = Column(Integer, unique=True, nullable=False, index=True)
    pm_count = Column(Float, default=0.0)
    pm_base_count = Column(Float, default=0.0)
    filter_count = Column(Float, default=0.0)
    filter_base_count = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SourceChangeLog(Base):
    __tablename__ = "source_change_log"

    id = Column(Integer, primary_key=True, index=True)
    install_date = Column(String(20), nullable=False)
    removal_date = Column(String(20), default="")
    machine_no = Column(Integer, nullable=False, index=True)
    source_name = Column(String(20), nullable=False)
    work_type = Column(String(50), default="교체")
    zone = Column(String(50), default="")
    line_name = Column(String(50), default="")
    production_group = Column(String(50), default="")
    source_slot = Column(String(20), default="")
    source_number = Column(String(20), default="")
    vendor_name = Column(String(100), default="")
    cylinder_no = Column(String(100), default="")
    lot_no = Column(String(100), default="")
    net_weight = Column(Float, default=0.0)
    reset_weight = Column(Float, default=0.0)
    before_value = Column(Float, default=0.0)
    after_value = Column(Float, default=0.0)
    used_amount = Column(Float, default=0.0)
    used_percent = Column(Float, default=0.0)
    runtime_hours = Column(Float, default=0.0)
    sql_value = Column(Float, default=0.0)
    ctc_value = Column(Float, default=0.0)
    worker_name = Column(String(50), default="")
    note = Column(String(500), default="")
    created_at = Column(DateTime, default=func.now())


class PersonnelVendor(Base):
    __tablename__ = "personnel_vendor"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    contact_name = Column(String(50), default="")
    contact_phone = Column(String(50), default="")
    note = Column(String(200), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class PersonnelMember(Base):
    __tablename__ = "personnel_member"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, nullable=False, index=True)
    employee_no = Column(String(50), default="")
    name = Column(String(50), nullable=False)
    department = Column(String(100), default="")
    position = Column(String(100), default="")
    phone = Column(String(50), default="")
    shift = Column(String(50), default="")
    training_due_date = Column(String(20), default="")
    note = Column(String(200), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class MocvdHandoverNote(Base):
    __tablename__ = "mocvd_handover_note"

    id = Column(Integer, primary_key=True, index=True)
    handover_date = Column(String(20), nullable=False, index=True)
    shift_type = Column(String(20), nullable=False, index=True)
    title = Column(String(200), default="")
    content = Column(String(2000), nullable=False)
    author = Column(String(50), default="")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class MocvdNotice(Base):
    __tablename__ = "mocvd_notice"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), default="")
    content = Column(String(2000), nullable=False)
    color = Column(String(20), default="#c4cdd8")
    is_active = Column(Boolean, default=True, index=True)
    author = Column(String(50), default="")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    log_type = Column(String(20), nullable=False, index=True, default="system")
    actor = Column(String(50), default="")
    category = Column(String(50), default="")
    action = Column(String(100), default="")
    target = Column(String(100), default="")
    detail = Column(String(500), default="")
    created_at = Column(DateTime, default=func.now(), index=True)
