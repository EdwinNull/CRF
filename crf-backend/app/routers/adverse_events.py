"""
不良事件管理路由
"""
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models import User, Patient, AdverseEvent
from app.routers.auth import get_current_active_user
from app.routers.patients import check_patient_access
from app.schemas.schemas import AdverseEventCreate, AdverseEventUpdate, AdverseEventResponse

router = APIRouter(prefix="/patients/{patient_id}/adverse-events")


@router.post("", response_model=AdverseEventResponse, status_code=201)
async def create_adverse_event(
    patient_id: int,
    ae_data: AdverseEventCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """创建不良事件"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    # 计算 seq_no：取当前患者最大 seq_no + 1
    max_seq = db.query(func.max(AdverseEvent.seq_no)).filter(
        AdverseEvent.patient_id == patient_id
    ).scalar()
    seq_no = (max_seq or 0) + 1

    ae = AdverseEvent(
        patient_id=patient_id,
        seq_no=seq_no,
        **ae_data.model_dump()
    )

    db.add(ae)
    db.commit()
    db.refresh(ae)

    return ae


@router.get("", response_model=List[AdverseEventResponse])
async def list_adverse_events(
    patient_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取患者所有不良事件"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    aes = db.query(AdverseEvent).filter(
        AdverseEvent.patient_id == patient_id
    ).order_by(AdverseEvent.seq_no).all()

    return aes


@router.get("/{ae_id}", response_model=AdverseEventResponse)
async def get_adverse_event(
    patient_id: int,
    ae_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取不良事件详情"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    ae = db.query(AdverseEvent).filter(
        AdverseEvent.id == ae_id,
        AdverseEvent.patient_id == patient_id
    ).first()

    if not ae:
        raise HTTPException(status_code=404, detail="不良事件不存在")

    return ae


@router.patch("/{ae_id}", response_model=AdverseEventResponse)
async def update_adverse_event(
    patient_id: int,
    ae_id: int,
    ae_update: AdverseEventUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """更新不良事件"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    ae = db.query(AdverseEvent).filter(
        AdverseEvent.id == ae_id,
        AdverseEvent.patient_id == patient_id
    ).first()

    if not ae:
        raise HTTPException(status_code=404, detail="不良事件不存在")

    # 更新字段
    update_data = ae_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ae, key, value)

    db.commit()
    db.refresh(ae)

    return ae


@router.delete("/{ae_id}", status_code=204)
async def delete_adverse_event(
    patient_id: int,
    ae_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """删除不良事件"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    ae = db.query(AdverseEvent).filter(
        AdverseEvent.id == ae_id,
        AdverseEvent.patient_id == patient_id
    ).first()

    if not ae:
        raise HTTPException(status_code=404, detail="不良事件不存在")

    db.delete(ae)
    db.commit()

    return None
