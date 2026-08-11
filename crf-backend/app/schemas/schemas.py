"""
Pydantic schemas for request/response models
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ============ 认证相关 ============
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    center_id: str = Field(..., pattern=r"^0[1-4]$")


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    role: str
    center_id: str
    is_active: bool

    class Config:
        from_attributes = True


# ============ 患者相关 ============
class PatientCreate(BaseModel):
    screening_no: str = Field(..., pattern=r"^\d{5}$")
    name_abbr: str = Field(..., min_length=2, max_length=10)
    gender: str = Field(..., pattern=r"^(男|女)$")
    age: int = Field(..., ge=18, le=80)
    height: int = Field(..., ge=100, le=250)
    weight: int = Field(..., ge=30, le=200)
    enrollment_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class PatientUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern=r"^(screening|treatment|followup|completed|withdrawn|screening_failed)$")
    randomization_no: Optional[str] = None
    withdrawal_reason: Optional[str] = None
    withdrawal_date: Optional[str] = None
    completion_summary: Optional[dict] = None


class PatientResponse(BaseModel):
    id: int
    screening_no: str
    randomization_no: Optional[str]
    name_abbr: str
    center_id: str
    gender: str
    age: int
    height: Optional[int]
    weight: Optional[int]
    enrollment_date: str
    status: str
    withdrawal_reason: Optional[str]
    withdrawal_date: Optional[str]
    completion_summary: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ 访视相关 ============
class VisitCreate(BaseModel):
    visit_no: str = Field(..., pattern=r"^V[1-6]$")


class VisitUpdate(BaseModel):
    visit_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    status: Optional[str] = Field(None, pattern=r"^(draft|submitted)$")
    data: Optional[dict] = None


class VisitResponse(BaseModel):
    id: int
    patient_id: int
    visit_no: str
    visit_date: Optional[str]
    status: str
    data: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ 不良事件相关 ============
class AdverseEventCreate(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    is_ongoing: bool = False
    severity: int = Field(..., ge=1, le=3)
    drug_relation: int = Field(..., ge=1, le=5)
    drug_measure: int = Field(..., ge=1, le=5)
    other_measure: int = Field(..., ge=1, le=4)
    other_measure_detail: Optional[str] = None
    outcome: int = Field(..., ge=1, le=6)
    is_sae: bool = False
    sae_type: Optional[int] = Field(None, ge=1, le=7)


class AdverseEventUpdate(BaseModel):
    event_name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_ongoing: Optional[bool] = None
    severity: Optional[int] = None
    drug_relation: Optional[int] = None
    drug_measure: Optional[int] = None
    other_measure: Optional[int] = None
    other_measure_detail: Optional[str] = None
    outcome: Optional[int] = None
    is_sae: Optional[bool] = None
    sae_type: Optional[int] = None


class AdverseEventResponse(BaseModel):
    id: int
    patient_id: int
    seq_no: int
    event_name: str
    description: Optional[str]
    start_date: str
    end_date: Optional[str]
    is_ongoing: bool
    severity: int
    drug_relation: int
    drug_measure: int
    other_measure: int
    other_measure_detail: Optional[str]
    outcome: int
    is_sae: bool
    sae_type: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ 合并用药相关 ============
class ConcomitantMedCreate(BaseModel):
    drug_name: str = Field(..., min_length=1, max_length=200)
    indication: Optional[str] = None
    dosage_form: Optional[str] = None
    dosage_amount: Optional[str] = None
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    is_ongoing: bool = False
    drug_relation: Optional[str] = None
    remark: Optional[str] = None


class ConcomitantMedUpdate(BaseModel):
    drug_name: Optional[str] = None
    indication: Optional[str] = None
    dosage_form: Optional[str] = None
    dosage_amount: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_ongoing: Optional[bool] = None
    drug_relation: Optional[str] = None
    remark: Optional[str] = None


class ConcomitantMedResponse(BaseModel):
    id: int
    patient_id: int
    seq_no: int
    drug_name: str
    indication: Optional[str]
    dosage_form: Optional[str]
    dosage_amount: Optional[str]
    start_date: str
    end_date: Optional[str]
    is_ongoing: bool
    drug_relation: Optional[str]
    remark: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
