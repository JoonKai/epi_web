from sqlalchemy import Column, Integer, String, Float, DateTime, func
from database import Base


class MocvdSource(Base):
    __tablename__ = "mocvd_source"

    id = Column(Integer, primary_key=True, index=True)
    machine_no = Column(Integer, nullable=False, comment="호기 번호 (101~236)")
    source_name = Column(String(20), nullable=False, comment="소스명")
    remaining = Column(Float, default=0.0, comment="잔량")
    unit = Column(String(10), default="kg", comment="단위")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
