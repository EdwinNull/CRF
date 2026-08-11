"""
合并用药管理路由
"""
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models import User, Patient, ConcomitantMed
from app.routers.auth import get_current_active_user
from app.routers.patients import check_patient_access
from app.schemas.schemas import ConcomitantMedCreate, ConcomitantMedUpdate, ConcomitantMedResponse

router = APIRouter(prefix="/patients/{patient_id}/concomitant-meds")


@router.post("", response_model=ConcomitantMedResponse, status_code=201)
async def create_concomitant_med(
    patient_id: int,
    med_data: ConcomitantMedCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """创建合并用药记录"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    # 计算 seq_no
    max_seq = db.query(func.max(ConcomitantMed.seq_no)).filter(
        ConcomitantMed.patient_id == patient_id
    ).scalar()
    seq_no = (max_seq or 0) + 1

    med = ConcomitantMed(
        patient_id=patient_id,
        seq_no=seq_no,
        **med_data.model_dump()
    )

    db.add(med)
    db.commit()
    db.refresh(med)

    return med


@router.get("", response_model=List[ConcomitantMedResponse])
async def list_concomitant_meds(
    patient_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取患者所有合并用药记录"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    meds = db.query(ConcomitantMed).filter(
        ConcomitantMed.patient_id == patient_id
    ).order_by(ConcomitantMed.seq_no).all()

    return meds


@router.get("/{med_id}", response_model=ConcomitantMedResponse)
async def get_concomitant_med(
    patient_id: int,
    med_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取合并用药详情"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    med = db.query(ConcomitantMed).filter(
        ConcomitantMed.id == med_id,
        ConcomitantMed.patient_id == patient_id
    ).first()

    if not med:
        raise HTTPException(status_code=404, detail="合并用药记录不存在")

    return med


@router.patch("/{med_id}", response_model=ConcomitantMedResponse)
async def update_concomitant_med(
    patient_id: int,
    med_id: int,
    med_update: ConcomitantMedUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """更新合并用药记录"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    med = db.query(ConcomitantMed).filter(
        ConcomitantMed.id == med_id,
        ConcomitantMed.patient_id == patient_id
    ).first()

    if not med:
        raise HTTPException(status_code=404, detail="合并用药记录不存在")

    # 更新字段
    update_data = med_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(med, key, value)

    db.commit()
    db.refresh(med)

    return med


@router.delete("/{med_id}", status_code=204)
async def delete_concomitant_med(
    patient_id: int,
    med_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """删除合并用药记录"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    med = db.query(ConcomitantMed).filter(
        ConcomitantMed.id == med_id,
        ConcomitantMed.patient_id == patient_id
    ).first()

    if not med:
        raise HTTPException(status_code=404, detail="合并用药记录不存在")

    db.delete(med)
    db.commit()

    return None
