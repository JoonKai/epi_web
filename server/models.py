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
