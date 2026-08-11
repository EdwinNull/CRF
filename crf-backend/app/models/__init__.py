"""
SQLAlchemy 数据库模型定义
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), nullable=False, default="doctor")  # doctor | admin
    center_id = Column(String(10), nullable=False)  # 01, 02, 03, 04
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    """患者表"""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    screening_no = Column(String(20), unique=True, nullable=False, index=True)  # 01001
    randomization_no = Column(String(20), unique=True, index=True)  # 001
    name_abbr = Column(String(10), nullable=False)  # ZHLS
    center_id = Column(String(10), nullable=False, index=True)

    gender = Column(String(10), nullable=False)
    age = Column(Integer, nullable=False)
    height = Column(Integer)
    weight = Column(Integer)
    enrollment_date = Column(String(20), nullable=False)

    status = Column(String(20), nullable=False, default="screening")
    # screening | treatment | followup | completed | withdrawn | screening_failed

    withdrawal_reason = Column(String(50))
    withdrawal_date = Column(String(20))
    completion_summary = Column(JSON)  # 完成情况总结

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    adverse_events = relationship("AdverseEvent", back_populates="patient", cascade="all, delete-orphan")
    concomitant_meds = relationship("ConcomitantMed", back_populates="patient", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_center_status', 'center_id', 'status'),
    )


class Visit(Base):
    """访视记录表"""
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    visit_no = Column(String(10), nullable=False)  # V1, V2, V3, V4, V5, V6
    visit_date = Column(String(20))
    status = Column(String(20), nullable=False, default="draft")  # draft | submitted
    data = Column(JSON, nullable=False, default=dict)  # 所有访视数据的JSON存储

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="visits")

    __table_args__ = (
        Index('idx_patient_visit', 'patient_id', 'visit_no'),
    )


class AdverseEvent(Base):
    """不良事件表"""
    __tablename__ = "adverse_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    seq_no = Column(Integer, nullable=False)  # 同一患者内的顺序号

    event_name = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20))
    is_ongoing = Column(Boolean, default=False)

    severity = Column(Integer, nullable=False)  # 1=轻度, 2=中度, 3=重度
    drug_relation = Column(Integer, nullable=False)  # 1-5 与研究药物关系
    drug_measure = Column(Integer, nullable=False)  # 1-5 研究药物采取的措施
    other_measure = Column(Integer, nullable=False)  # 1-4 其他处理措施
    other_measure_detail = Column(String(200))
    outcome = Column(Integer, nullable=False)  # 1-6 转归

    is_sae = Column(Boolean, default=False)
    sae_type = Column(Integer)  # 1-7 SAE类型

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="adverse_events")


class ConcomitantMed(Base):
    """合并用药表"""
    __tablename__ = "concomitant_meds"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    seq_no = Column(Integer, nullable=False)

    drug_name = Column(String(200), nullable=False)
    indication = Column(String(200))
    dosage_form = Column(String(100))
    dosage_amount = Column(String(200))
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20))
    is_ongoing = Column(Boolean, default=False)
    drug_relation = Column(String(100))
    remark = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="concomitant_meds")


class AuditLog(Base):
    """审计日志表"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # create_patient, update_visit, export_data
    resource_type = Column(String(50), nullable=False)  # patient, visit, adverse_event
    resource_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
