"""
访视记录路由
"""
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, Patient, Visit
from app.routers.auth import get_current_active_user
from app.routers.patients import check_patient_access
from app.schemas.schemas import VisitCreate, VisitUpdate, VisitResponse

router = APIRouter(prefix="/patients/{patient_id}/visits")


def check_eligibility(visit_data: dict) -> dict:
    """
    入选/排除标准判定逻辑（V1访视提交时触发）
    返回 {"eligible": bool, "inclusion_met": bool, "exclusion_met": bool}
    """
    # 入选标准（全部满足才通过）
    inclusion_criteria = visit_data.get("inclusionCriteria", {})
    inclusion_met = all([
        inclusion_criteria.get("age_18_80"),
        inclusion_criteria.get("diagnosis_confirmed"),
        inclusion_criteria.get("symptom_duration"),
        inclusion_criteria.get("symptom_severity"),
        inclusion_criteria.get("informed_consent"),
    ])

    # 排除标准（任一满足则排除）
    exclusion_criteria = visit_data.get("exclusionCriteria", {})
    exclusion_met = not any([
        exclusion_criteria.get("pregnancy_lactation"),
        exclusion_criteria.get("severe_disease"),
        exclusion_criteria.get("immunodeficiency"),
        exclusion_criteria.get("drug_allergy"),
        exclusion_criteria.get("participated_trial"),
        exclusion_criteria.get("other_exclusion"),
    ])

    eligible = inclusion_met and exclusion_met

    return {
        "eligible": eligible,
        "inclusion_met": inclusion_met,
        "exclusion_met": exclusion_met
    }


@router.post("", response_model=VisitResponse, status_code=201)
async def create_visit(
    patient_id: int,
    visit_data: VisitCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """创建访视记录（V2-V6，V1已在创建患者时自动生成）"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    # 检查是否已存在该访视
    existing = db.query(Visit).filter(
        Visit.patient_id == patient_id,
        Visit.visit_no == visit_data.visit_no
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{visit_data.visit_no} 访视已存在")

    visit = Visit(
        patient_id=patient_id,
        visit_no=visit_data.visit_no,
        status="draft",
        data={}
    )

    db.add(visit)
    db.commit()
    db.refresh(visit)

    return visit


@router.get("", response_model=List[VisitResponse])
async def list_visits(
    patient_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取患者的所有访视记录"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    visits = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.visit_no).all()
    return visits


@router.get("/{visit_no}", response_model=VisitResponse)
async def get_visit(
    patient_id: int,
    visit_no: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取指定访视详情"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    visit = db.query(Visit).filter(
        Visit.patient_id == patient_id,
        Visit.visit_no == visit_no
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="访视记录不存在")

    return visit


@router.patch("/{visit_no}", response_model=VisitResponse)
async def update_visit(
    patient_id: int,
    visit_no: str,
    visit_update: VisitUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """更新访视记录（暂存或提交）"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    visit = db.query(Visit).filter(
        Visit.patient_id == patient_id,
        Visit.visit_no == visit_no
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="访视记录不存在")

    if visit.status == "submitted":
        raise HTTPException(status_code=400, detail="访视已提交，无法修改")

    # 更新字段
    update_data = visit_update.model_dump(exclude_unset=True)

    if "visit_date" in update_data:
        visit.visit_date = update_data["visit_date"]

    if "data" in update_data:
        visit.data = update_data["data"]

    # 提交访视时的特殊逻辑
    if update_data.get("status") == "submitted":
        # V1 提交时判定入选/排除
        if visit_no == "V1":
            eligibility = check_eligibility(visit.data)
            visit.data["eligibility"] = eligibility

            if eligibility["eligible"]:
                # 筛选通过 → 患者状态变为 treatment
                patient.status = "treatment"
                # 生成随机号（简化：取筛选号后3位）
                patient.randomization_no = patient.screening_no[-3:]
            else:
                # 筛选失败
                patient.status = "screening_failed"

        visit.status = "submitted"

    db.commit()
    db.refresh(visit)

    return visit


@router.delete("/{visit_no}", status_code=204)
async def delete_visit(
    patient_id: int,
    visit_no: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """删除访视记录（仅draft状态可删除）"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    visit = db.query(Visit).filter(
        Visit.patient_id == patient_id,
        Visit.visit_no == visit_no
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="访视记录不存在")

    if visit.status == "submitted":
        raise HTTPException(status_code=400, detail="已提交的访视无法删除")

    db.delete(visit)
    db.commit()

    return None
