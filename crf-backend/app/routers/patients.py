"""
患者管理路由
"""
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models import User, Patient, Visit
from app.routers.auth import get_current_active_user
from app.schemas.schemas import PatientCreate, PatientUpdate, PatientResponse

router = APIRouter(prefix="/patients")


def check_patient_access(patient: Patient, current_user: User):
    """检查用户是否有权限访问该患者（多中心隔离）"""
    if current_user.role == "admin":
        return True
    if patient.center_id != current_user.center_id:
        raise HTTPException(status_code=403, detail="无权访问其他中心的患者数据")
    return True


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(
    patient_data: PatientCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """创建新患者"""
    # 检查筛选号唯一性
    existing = db.query(Patient).filter(Patient.screening_no == patient_data.screening_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="筛选号已存在")

    # 新患者的中心ID来自当前用户
    patient = Patient(
        screening_no=patient_data.screening_no,
        name_abbr=patient_data.name_abbr,
        center_id=current_user.center_id,
        gender=patient_data.gender,
        age=patient_data.age,
        height=patient_data.height,
        weight=patient_data.weight,
        enrollment_date=patient_data.enrollment_date,
        status="screening"
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    # 自动创建 V1 空访视
    v1 = Visit(patient_id=patient.id, visit_no="V1", status="draft", data={})
    db.add(v1)
    db.commit()

    return patient


@router.get("", response_model=List[PatientResponse])
async def list_patients(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db),
    center_id: Optional[str] = Query(None, description="筛选中心ID（admin专用）"),
    status: Optional[str] = Query(None, description="筛选患者状态"),
    search: Optional[str] = Query(None, description="搜索筛选号或缩写"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """获取患者列表（带中心隔离、搜索、分页）"""
    query = db.query(Patient)

    # 多中心隔离：doctor只能看自己中心，admin可跨中心
    if current_user.role != "admin":
        query = query.filter(Patient.center_id == current_user.center_id)
    elif center_id:
        query = query.filter(Patient.center_id == center_id)

    # 状态筛选
    if status:
        query = query.filter(Patient.status == status)

    # 搜索
    if search:
        query = query.filter(
            or_(
                Patient.screening_no.contains(search),
                Patient.name_abbr.contains(search),
                Patient.randomization_no.contains(search)
            )
        )

    # 排序和分页
    query = query.order_by(Patient.created_at.desc())
    patients = query.offset(skip).limit(limit).all()

    return patients


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """获取患者详情"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """更新患者状态、随机编号、退出信息、完成总结"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    # 更新字段
    update_data = patient_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: int,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """删除患者（级联删除访视/AE/合并用药）"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    check_patient_access(patient, current_user)

    db.delete(patient)
    db.commit()

    return None
