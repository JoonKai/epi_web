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
    remaining = Column(Float, default=0.0)
    daily_usage = Column(Float, default=0.0)
    unit = Column(String(10), default="kg")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


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
