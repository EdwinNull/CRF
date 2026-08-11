# 荆防合剂过敏性鼻炎临床研究 — CRF系统 后端开发与部署方案

> **文档目的**：后端 API 服务 + 数据库 + 部署的完整技术规格书，可直接交付 Codex 执行。
> **交付目标**：一个可公网访问的全栈系统，前端（React）+ 后端（FastAPI）+ 数据库（PostgreSQL），医生通过浏览器即可录入和导出 CRF 数据。

---

## 1. 技术栈

| 层级 | 技术选型 | 理由 |
|---|---|---|
| Web 框架 | **FastAPI** (Python 3.11+) | 自动生成 API 文档、async 支持、类型校验、开发速度快 |
| ORM | **SQLAlchemy 2.0** + **Alembic** | 成熟的 ORM + 数据库迁移管理 |
| 数据库 | **PostgreSQL 15** | JSON 字段支持好，适合存储评分数据 |
| 认证 | **JWT** (python-jose + passlib) | 无状态认证，前后端分离适配 |
| Excel 导出 | **openpyxl** | Python 原生 Excel 生成，支持多 Sheet、样式 |
| 部署 | **Docker Compose** | 一键启动 API + DB + Nginx |
| 反向代理 | **Nginx** | 静态文件托管（前端 build）+ API 代理 |

### 依赖安装

```
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
alembic==1.13.0
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
openpyxl==3.1.5
pydantic==2.9.0
pydantic-settings==2.5.0
```

---

## 2. 项目目录结构

```
backend/
├── main.py                        # FastAPI 应用入口
├── config.py                      # 配置（数据库连接、JWT 密钥等）
├── database.py                    # SQLAlchemy 引擎 + Session
├── requirements.txt
├── alembic.ini                    # Alembic 配置
├── alembic/                       # 数据库迁移脚本
│   ├── env.py
│   └── versions/
├── models/                        # SQLAlchemy ORM 模型
│   ├── __init__.py
│   ├── user.py
│   ├── patient.py
│   ├── visit.py
│   ├── adverse_event.py
│   ├── concomitant_med.py
│   └── non_drug_therapy.py
├── schemas/                       # Pydantic 请求/响应模型
│   ├── __init__.py
│   ├── user.py
│   ├── patient.py
│   ├── visit.py
│   ├── adverse_event.py
│   ├── concomitant_med.py
│   └── export.py
├── routers/                       # API 路由
│   ├── __init__.py
│   ├── auth.py                    # 登录/注册/token
│   ├── patients.py                # 患者 CRUD
│   ├── visits.py                  # 访视数据 CRUD
│   ├── adverse_events.py          # 不良事件 CRUD
│   ├── concomitant_meds.py        # 合并用药 CRUD
│   ├── non_drug_therapies.py      # 非药物治疗 CRUD
│   └── export.py                  # Excel 导出
├── services/                      # 业务逻辑层
│   ├── __init__.py
│   ├── auth_service.py
│   ├── patient_service.py
│   ├── visit_service.py
│   ├── export_service.py          # Excel 生成核心逻辑
│   └── scoring_service.py         # 评分自动计算
├── utils/
│   ├── deps.py                    # 依赖注入（get_db, get_current_user）
│   ├── security.py                # JWT 工具函数
│   └── excel_builder.py           # Excel 构建器
├── seeds/                         # 初始化数据
│   └── init_data.py               # 创建默认用户和研究中心
├── Dockerfile
└── docker-compose.yml
```

---

## 3. 数据库模型（SQLAlchemy ORM）

### 3.1 `models/user.py`

```python
from sqlalchemy import Column, String, Integer, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    DOCTOR = "doctor"           # 录入医生
    ADMIN = "admin"             # 研究管理员
    MONITOR = "monitor"         # 数据监查员

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    real_name = Column(String(50), nullable=False)          # 真实姓名
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.DOCTOR)
    center_id = Column(String(2), nullable=False)           # "01"-"04"
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### 3.2 `models/patient.py`

```python
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, JSON, Text
from sqlalchemy import ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class PatientStatus(str, enum.Enum):
    SCREENING = "screening"
    TREATMENT = "treatment"
    FOLLOWUP = "followup"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    center_id = Column(String(2), nullable=False, index=True)     # "01"-"04"
    screening_no = Column(String(5), unique=True, nullable=False, index=True)  # "01005"
    random_no = Column(String(3), unique=True, nullable=True)     # "048"，筛选成功后分配
    name_abbr = Column(String(4), nullable=False)                 # 姓名拼音缩写
    enrollment_date = Column(Date, nullable=True)
    status = Column(SAEnum(PatientStatus), nullable=False, default=PatientStatus.SCREENING)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ===== 人口学资料（仅 V1 采集）=====
    gender = Column(String(2), nullable=True)                     # "男"/"女"
    age = Column(Integer, nullable=True)
    household = Column(String(100), nullable=True)                # 户籍
    weight = Column(Float, nullable=True)                         # kg
    height = Column(Float, nullable=True)                         # cm
    bmi = Column(Float, nullable=True)                            # 自动计算
    occupation = Column(String(100), nullable=True)
    environment_exposure = Column(JSON, nullable=True)            # ["粉尘","宠物"]
    smoking_history = Column(JSON, nullable=True)                 # {has, years, packs, quitYears}
    drinking_history = Column(JSON, nullable=True)                # {has, years, ml, quitYears}
    diet_habit = Column(JSON, nullable=True)                      # ["辛辣","清淡"]
    living_environment = Column(JSON, nullable=True)
    climate = Column(JSON, nullable=True)

    # ===== 病史（仅 V1 采集）=====
    allergy_history = Column(JSON, nullable=True)                 # {has, drugAllergy, nonDrugAllergy}
    respiratory_history = Column(JSON, nullable=True)             # {has, records:[...]}
    family_history = Column(JSON, nullable=True)                  # {has, detail}
    prior_treatment = Column(JSON, nullable=True)                 # {has, tcm, immunotherapy, meds}

    # ===== 现病史（仅 V1 采集）=====
    current_illness = Column(JSON, nullable=True)                 # 完整现病史 JSON
    tcm_four_exam = Column(JSON, nullable=True)                   # 中医四诊 JSON

    # ===== 入选/排除标准 =====
    inclusion_criteria = Column(JSON, nullable=True)              # [true, true, ...]
    exclusion_criteria = Column(JSON, nullable=True)              # [false, false, ...]
    screening_result = Column(String(10), nullable=True)          # "pass" / "fail"
    screening_fail_reason = Column(Text, nullable=True)

    # ===== 完成情况 =====
    completion_summary = Column(JSON, nullable=True)

    # ===== 时间戳 =====
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # ===== 关系 =====
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    adverse_events = relationship("AdverseEvent", back_populates="patient", cascade="all, delete-orphan")
    concomitant_meds = relationship("ConcomitantMed", back_populates="patient", cascade="all, delete-orphan")
    non_drug_therapies = relationship("NonDrugTherapy", back_populates="patient", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
```

### 3.3 `models/visit.py`

```python
class VisitStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    DRAFT = "draft"
    SUBMITTED = "submitted"

class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    visit_no = Column(String(2), nullable=False)              # "V1"-"V6"
    visit_date = Column(Date, nullable=True)
    status = Column(SAEnum(VisitStatus), nullable=False, default=VisitStatus.NOT_STARTED)

    # ===== 通用模块（所有访视都有）=====
    vital_signs = Column(JSON, nullable=True)
    # {temperature, pulse, systolicBP, diastolicBP, respiration}

    vas_scores = Column(JSON, nullable=True)
    # {sneeze, rhinorrhea, nasalItch, nasalCongestion, eyeItch, lacrimation, total}

    symptom_four_scale = Column(JSON, nullable=True)
    # {sneeze, rhinorrhea, nasalItch, nasalCongestion, eyeItch, lacrimation, nasalTotal, totalScore}

    rqlq_scores = Column(JSON, nullable=True)
    # {activityLimit:[...], sleep:[...], ..., total}

    tcm_scores = Column(JSON, nullable=True)
    # {nasalItch, sneeze, ..., tongueDesc, pulseDesc, total}

    # ===== 治疗/随访期模块（V2-V6）=====
    med_score = Column(JSON, nullable=True)
    # {oralAntihistamine:{selected,days,total}, ..., grandTotal}

    # ===== 实验室检查（V1, V3, V4）=====
    lab_blood = Column(JSON, nullable=True)
    lab_urine = Column(JSON, nullable=True)
    lab_biochem = Column(JSON, nullable=True)

    # ===== 特殊检查 =====
    feno = Column(JSON, nullable=True)                         # V1, V4
    ecg = Column(JSON, nullable=True)                          # V1, V4
    serum_ige = Column(JSON, nullable=True)                    # V4

    # ===== 药物回收与发放（V2-V4）=====
    drug_recovery = Column(JSON, nullable=True)
    # {returnedCount, expectedCount, compliance, dispensedCount}

    # ===== 疗效评估（V2-V6）=====
    efficacy = Column(JSON, nullable=True)
    # {efficacyIndex, efficacyLevel, allSymptomsRelieved, ...}

    # ===== V2-V4 访视后情况 =====
    has_adverse_event = Column(Integer, nullable=True)          # 0/1
    has_new_concomitant_med = Column(Integer, nullable=True)    # 0/1

    # ===== 签字 =====
    physician_name = Column(String(50), nullable=True)
    sign_date = Column(Date, nullable=True)

    # ===== 时间戳 =====
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # ===== 关系 =====
    patient = relationship("Patient", back_populates="visits")

    # 联合唯一约束：一个患者的一个访视只有一条记录
    __table_args__ = (
        UniqueConstraint('patient_id', 'visit_no', name='uq_patient_visit'),
    )
```

### 3.4 `models/adverse_event.py`

```python
class AdverseEvent(Base):
    __tablename__ = "adverse_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    seq_no = Column(Integer, nullable=False)                  # 编号 1,2,3...
    event_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    is_ongoing = Column(Integer, default=0)                   # 0=否 1=是
    end_date = Column(Date, nullable=True)
    severity = Column(Integer, nullable=False)                # 1/2/3
    drug_measure = Column(Integer, nullable=True)             # 1-5
    other_measure = Column(Integer, nullable=True)            # 1-4
    other_measure_detail = Column(Text, nullable=True)
    drug_relation = Column(Integer, nullable=False)           # 1-5
    outcome = Column(Integer, nullable=True)                  # 1-6
    is_sae = Column(Integer, default=0)                       # 0/1
    sae_type = Column(Integer, nullable=True)                 # 1-7
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="adverse_events")
```

### 3.5 `models/concomitant_med.py`

```python
class ConcomitantMed(Base):
    __tablename__ = "concomitant_meds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    seq_no = Column(Integer, nullable=False)
    drug_name = Column(String(200), nullable=False)
    indication = Column(String(200), nullable=True)
    dosage_form = Column(String(100), nullable=True)
    dosage_amount = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    is_ongoing = Column(Integer, default=0)
    end_date = Column(Date, nullable=True)
    drug_relation = Column(String(50), nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="concomitant_meds")


class NonDrugTherapy(Base):
    __tablename__ = "non_drug_therapies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    seq_no = Column(Integer, nullable=False)
    therapy_name = Column(String(200), nullable=False)
    therapy_type = Column(String(100), nullable=True)
    method_frequency = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    start_date = Column(Date, nullable=True)
    is_ongoing = Column(Integer, default=0)
    end_date = Column(Date, nullable=True)
    drug_relation = Column(String(50), nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="non_drug_therapies")
```

---

## 4. API 路由规格

### 基础设计原则

- 所有 API 路径以 `/api/v1` 为前缀
- 所有需要认证的接口在 Header 中传递 `Authorization: Bearer <token>`
- 响应统一格式 `{ "code": 200, "message": "success", "data": {...} }`
- 分页参数：`page`（默认1）、`page_size`（默认20，最大100）
- 错误响应：`{ "code": 400/401/403/404/500, "message": "错误描述", "data": null }`

### 4.1 认证 `/api/v1/auth`

```
POST   /api/v1/auth/login
       Body:   { "username": "str", "password": "str" }
       Return: { "access_token": "str", "token_type": "bearer",
                 "user": { "id", "username", "realName", "role", "centerId" } }

GET    /api/v1/auth/me
       Header: Authorization: Bearer <token>
       Return: 当前用户信息
```

### 4.2 患者 `/api/v1/patients`

```
GET    /api/v1/patients
       Query:  center_id?, status?, screening_no?, random_no?, page, page_size
       Return: { "total": N, "items": [Patient...] }
       权限:   doctor 只能看自己中心的；admin/monitor 可看所有

POST   /api/v1/patients
       Body:   { "centerId", "screeningNo", "nameAbbr", "gender", "age", ... }
       Return: 新建的 Patient
       说明:   创建时自动设置 created_by 为当前用户、status 为 screening

GET    /api/v1/patients/{id}
       Return: Patient 完整信息（含 visits、adverseEvents、concomitantMeds 概要）

PUT    /api/v1/patients/{id}
       Body:   Patient 可更新字段（人口学、病史、入选排除标准等）
       Return: 更新后的 Patient

PUT    /api/v1/patients/{id}/demographics
       Body:   人口学资料的全部字段
       说明:   单独更新人口学模块，BMI 由后端自动计算

PUT    /api/v1/patients/{id}/medical-history
       Body:   过敏史、呼吸疾病史、家族史、既往治疗史、现病史
       说明:   单独更新病史模块

PUT    /api/v1/patients/{id}/screening
       Body:   { "inclusionCriteria": [...], "exclusionCriteria": [...],
                 "screeningResult": "pass"/"fail", "screeningFailReason"?: "str" }
       说明:   更新入选排除标准及筛选结果
       校验:   后端再次验证入选全 true、排除全 false 才允许 result=pass

PUT    /api/v1/patients/{id}/tcm-four-exam
       Body:   中医四诊资料

PUT    /api/v1/patients/{id}/completion
       Body:   CompletionSummary JSON

PUT    /api/v1/patients/{id}/status
       Body:   { "status": "screening"/"treatment"/"followup"/"completed"/"withdrawn" }
       说明:   手动更新患者状态（通常由系统在关键节点自动更新）
```

### 4.3 访视 `/api/v1/patients/{patient_id}/visits`

```
GET    /api/v1/patients/{patient_id}/visits
       Return: 该患者所有访视数据列表（含状态）

GET    /api/v1/patients/{patient_id}/visits/{visit_no}
       Param:  visit_no = "V1" | "V2" | "V3" | "V4" | "V5" | "V6"
       Return: 单次访视的完整数据

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}
       Body:   VisitData 的全部或部分字段
       说明:   创建或更新访视数据（upsert 逻辑）
       校验:   后端自动计算 VAS总分、四分法总分、RQLQ总分、中医证候总分、
               药物评分总分、疗效指数等，客户端传的总分仅作参考
       行为:   status 设为 "draft"

POST   /api/v1/patients/{patient_id}/visits/{visit_no}/submit
       说明:   提交访视数据（锁定）
       校验:   所有必填项非空、数值范围合理
       行为:   status 设为 "submitted"；如果是 V1 且 screeningResult=pass，
               自动将患者 status 更新为 treatment

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/vital-signs
       Body:   VitalSigns JSON
       说明:   单独更新生命体征模块

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/vas
       Body:   VASScores JSON（后端自动计算 total）

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/symptom-four-scale
       Body:   SymptomFourScale JSON（后端自动计算 nasalTotal, totalScore）

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/rqlq
       Body:   RQLQScores JSON（后端自动计算 total）

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/tcm-scores
       Body:   TCMScores JSON（后端自动计算 total）

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/med-score
       Body:   MedScore JSON（后端自动计算 grandTotal）

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/lab-results
       Body:   { "blood"?: LabBloodRoutine, "urine"?: LabUrinalysis,
                 "biochem"?: LabBiochemistry }

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/special-exams
       Body:   { "feno"?: FeNO, "ecg"?: ECG, "serumIgE"?: {...} }

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/drug-recovery
       Body:   DrugRecovery JSON（后端自动计算 compliance）

PUT    /api/v1/patients/{patient_id}/visits/{visit_no}/efficacy
       Body:   EfficacyAssessment JSON
       说明:   后端根据 V1 的 tcm_scores.total 作为 baseline，
               当前访视的 tcm_scores.total 作为 current，自动计算疗效指数
```

### 4.4 不良事件 `/api/v1/patients/{patient_id}/adverse-events`

```
GET    /api/v1/patients/{patient_id}/adverse-events
       Return: 该患者的不良事件列表

POST   /api/v1/patients/{patient_id}/adverse-events
       Body:   AdverseEvent 字段
       说明:   seq_no 由后端自动递增

PUT    /api/v1/patients/{patient_id}/adverse-events/{id}
       Body:   可更新字段

DELETE /api/v1/patients/{patient_id}/adverse-events/{id}
       说明:   仅 draft 状态的访视关联数据可删除
```

### 4.5 合并用药 `/api/v1/patients/{patient_id}/concomitant-meds`

```
GET    /api/v1/patients/{patient_id}/concomitant-meds
POST   /api/v1/patients/{patient_id}/concomitant-meds
PUT    /api/v1/patients/{patient_id}/concomitant-meds/{id}
DELETE /api/v1/patients/{patient_id}/concomitant-meds/{id}
```

### 4.6 合并非药物治疗 `/api/v1/patients/{patient_id}/non-drug-therapies`

```
GET    /api/v1/patients/{patient_id}/non-drug-therapies
POST   /api/v1/patients/{patient_id}/non-drug-therapies
PUT    /api/v1/patients/{patient_id}/non-drug-therapies/{id}
DELETE /api/v1/patients/{patient_id}/non-drug-therapies/{id}
```

### 4.7 数据导出 `/api/v1/export`

```
GET    /api/v1/export/excel
       Query:  center_ids=01,02 & statuses=completed,treatment &
               date_from=2026-01-01 & date_to=2026-12-31
       Return: 直接返回 .xlsx 文件（Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）
       说明:   按筛选条件导出符合条件的所有患者数据

GET    /api/v1/export/safety
       Query:  同上
       Return: 仅包含不良事件和合并用药的 .xlsx 文件

GET    /api/v1/export/preview
       Query:  同上
       Return: JSON，符合条件的患者列表预览（仅基本信息，用于前端展示）
```

### 4.8 字典 `/api/v1/dictionaries`

```
GET    /api/v1/dictionaries/centers
       Return: [{ "id": "01", "name": "中国中医科学院广安门医院呼吸科" }, ...]

GET    /api/v1/dictionaries/options
       Return: 所有下拉选项字典（环境暴露选项、合并疾病选项、AE严重程度定义等）
```

---

## 5. 后端核心业务逻辑

### 5.1 评分自动计算 (`services/scoring_service.py`)

```python
def calc_bmi(weight_kg: float, height_cm: float) -> float:
    """BMI = 体重(kg) / (身高(m))^2"""
    return round(weight_kg / (height_cm / 100) ** 2, 1)

def calc_vas_total(scores: dict) -> int:
    """VAS 总分 = 6 项之和"""
    keys = ['sneeze', 'rhinorrhea', 'nasalItch', 'nasalCongestion', 'eyeItch', 'lacrimation']
    return sum(scores.get(k, 0) for k in keys)

def calc_symptom_totals(scores: dict) -> tuple[int, int]:
    """返回 (鼻部总分, 鼻眼总分)"""
    nasal_keys = ['sneeze', 'rhinorrhea', 'nasalItch', 'nasalCongestion']
    eye_keys = ['eyeItch', 'lacrimation']
    nasal = sum(scores.get(k, 0) for k in nasal_keys)
    total = nasal + sum(scores.get(k, 0) for k in eye_keys)
    return nasal, total

def calc_rqlq_total(scores: dict) -> int:
    """RQLQ 总分 = 7 个维度所有项之和"""
    total = 0
    for key in ['activityLimit', 'sleep', 'nonNasalEye', 'practicalProblems',
                'nasalSymptoms', 'eyeSymptoms', 'emotion']:
        total += sum(scores.get(key, []))
    return total

def calc_tcm_total(scores: dict) -> int:
    """中医证候积分 = 主症4项 + 次症5项"""
    main_keys = ['nasalItch', 'sneeze', 'rhinorrhea', 'nasalCongestion']
    sub_keys = ['windColdAversion', 'bodyAche', 'sweating', 'cough', 'paleFace']
    return sum(scores.get(k, 0) for k in main_keys + sub_keys)

def calc_med_score_total(score: dict) -> int:
    """药物评分总分"""
    total = 0
    rate_map = {
        'oralAntihistamine': 1, 'nasalAntihistamine': 1, 'eyeAntihistamine': 1,
        'nasalSteroid': 2, 'oralCorticosteroid': 3
    }
    for key, rate in rate_map.items():
        item = score.get(key, {})
        if item.get('selected'):
            total += rate * item.get('days', 0)
    return total

def calc_compliance(expected: int, returned: int) -> float:
    """依从性 = (应服 - 剩余) / 应服 × 100%"""
    if expected == 0:
        return 0
    return round((expected - returned) / expected * 100, 1)

def calc_efficacy_index(baseline: int, current: int) -> float:
    """疗效指数 = (基线 - 当前) / 基线 × 100%"""
    if baseline == 0:
        return 0
    return round((baseline - current) / baseline * 100, 1)

def get_efficacy_level(index: float) -> str:
    """疗效等级判定"""
    if index >= 90:
        return "临床控制"
    elif index >= 70:
        return "显效"
    elif index >= 30:
        return "有效"
    else:
        return "无效"
```

### 5.2 Excel 导出核心逻辑 (`services/export_service.py`)

```python
# 导出逻辑伪代码

def build_export_workbook(patients: list[Patient]) -> openpyxl.Workbook:
    wb = Workbook()

    # === Sheet 1: 主数据表 ===
    ws_main = wb.active
    ws_main.title = "主数据表"

    # 构建表头：基本信息列 + V1列 + V2列 + ... + V6列
    headers = build_all_headers()   # 约 300-400 列
    ws_main.append(headers)

    for patient in patients:
        row = []
        # 基本信息
        row += [patient.center_id, patient.screening_no, patient.random_no,
                patient.name_abbr, patient.gender, patient.age, patient.bmi,
                str(patient.enrollment_date), patient.status]
        # V1 字段展开
        row += flatten_v1(patient)
        # V2-V6 字段展开
        for vno in ['V2', 'V3', 'V4', 'V5', 'V6']:
            row += flatten_visit(patient, vno)
        ws_main.append(row)

    # 设置表头样式（加粗、冻结首行、自动列宽）
    style_header_row(ws_main)

    # === Sheet 2: 不良事件 ===
    ws_ae = wb.create_sheet("不良事件")
    ae_headers = ["筛选号", "编号", "事件名称", "描述", "开始日期", "结束日期",
                  "是否持续", "严重程度", "对研究药物措施", "其他措施",
                  "与研究药物关系", "转归", "是否SAE", "SAE类型"]
    ws_ae.append(ae_headers)
    for patient in patients:
        for ae in patient.adverse_events:
            ws_ae.append(flatten_adverse_event(patient.screening_no, ae))
    style_header_row(ws_ae)

    # === Sheet 3: 合并用药 ===
    ws_med = wb.create_sheet("合并用药")
    # ... 同理

    # === Sheet 4: 合并非药物治疗 ===
    ws_ndt = wb.create_sheet("合并非药物治疗")
    # ... 同理

    return wb


def flatten_v1(patient: Patient) -> list:
    """将 V1 的所有字段展开为一维列表"""
    row = []
    v1 = get_visit(patient, 'V1')

    # 生命体征
    vs = v1.vital_signs or {}
    row += [vs.get('temperature'), vs.get('pulse'),
            vs.get('systolicBP'), vs.get('diastolicBP'), vs.get('respiration')]

    # VAS 6项 + 总分
    vas = v1.vas_scores or {}
    for k in ['sneeze','rhinorrhea','nasalItch','nasalCongestion','eyeItch','lacrimation','total']:
        row.append(vas.get(k))

    # 四分法 6项 + 鼻部总分 + 鼻眼总分
    ss = v1.symptom_four_scale or {}
    for k in ['sneeze','rhinorrhea','nasalItch','nasalCongestion','eyeItch','lacrimation',
              'nasalTotal','totalScore']:
        row.append(ss.get(k))

    # RQLQ 28项 + 总分
    rqlq = v1.rqlq_scores or {}
    for dim in ['activityLimit','sleep','nonNasalEye','practicalProblems',
                'nasalSymptoms','eyeSymptoms','emotion']:
        for val in rqlq.get(dim, []):
            row.append(val)
    row.append(rqlq.get('total'))

    # 中医证候 9项 + 舌象 + 脉象 + 总分
    tcm = v1.tcm_scores or {}
    for k in ['nasalItch','sneeze','rhinorrhea','nasalCongestion',
              'windColdAversion','bodyAche','sweating','cough','paleFace']:
        row.append(tcm.get(k))
    row += [tcm.get('tongueDesc'), tcm.get('pulseDesc'), tcm.get('total')]

    # 实验室检查（血常规8项值+判定、尿常规5项、生化4项）
    blood = (v1.lab_blood or {})
    for k in ['hb','rbc','wbc','neu','eos','bas','lym','plt']:
        item = blood.get(k, {})
        row += [item.get('value'), item.get('status')]

    # ... 尿常规、生化、FeNO、心电图同理展开

    return row


def build_all_headers() -> list:
    """构建完整的列名列表"""
    headers = ['中心编号', '筛选号', '随机编号', '姓名缩写', '性别', '年龄',
               'BMI', '入组日期', '状态']

    # V1 列名
    headers += ['V1_生命体征_体温', 'V1_生命体征_脉搏', 'V1_生命体征_收缩压',
                'V1_生命体征_舒张压', 'V1_生命体征_呼吸']
    headers += [f'V1_VAS_{s}' for s in ['喷嚏','流涕','鼻痒','鼻塞','眼痒','流泪','总分']]
    headers += [f'V1_四分法_{s}' for s in ['喷嚏','流涕','鼻痒','鼻塞','眼痒','流泪',
                                           '鼻部总分','鼻眼总分']]
    # RQLQ 28 项
    rqlq_dims = {
        '活动受限': 3, '睡眠': 3, '非鼻眼': 7, '实际问题': 3,
        '鼻部': 4, '眼部': 4, '情绪': 4
    }
    q_idx = 1
    for dim, count in rqlq_dims.items():
        for i in range(count):
            headers.append(f'V1_RQLQ_Q{q_idx}')
            q_idx += 1
    headers.append('V1_RQLQ_总分')

    # 中医证候
    headers += [f'V1_中医_{s}' for s in ['鼻痒','喷嚏','流清涕','鼻塞',
                '怕风怕冷','周身酸痛','汗出','咳嗽','面色淡白',
                '舌象','脉象','总分']]

    # V1 实验室检查
    for item in ['Hb','RBC','WBC','Neu','EOS','BAS','Lym','PLT']:
        headers += [f'V1_血常规_{item}_值', f'V1_血常规_{item}_判定']
    # ... 尿常规、生化同理

    # V2-V6 列名（结构类似，按各访视的模块差异生成）
    for vno in ['V2','V3','V4','V5','V6']:
        headers.append(f'{vno}_访视日期')
        headers += [f'{vno}_生命体征_{s}' for s in ['体温','脉搏','收缩压','舒张压','呼吸']]
        headers += [f'{vno}_VAS_{s}' for s in ['喷嚏','流涕','鼻痒','鼻塞','眼痒','流泪','总分']]
        # ... 各模块同理

    return headers
```

---

## 6. 初始化种子数据 (`seeds/init_data.py`)

```python
"""运行方式：python -m seeds.init_data"""

CENTERS = [
    {"id": "01", "name": "中国中医科学院广安门医院呼吸科"},
    {"id": "02", "name": "中国中医科学院广安门医院耳鼻喉科"},
    {"id": "03", "name": "中国中医科学院西苑医院"},
    {"id": "04", "name": "北京中医药大学东直门医院"},
]

# 每个中心创建一个默认医生账号 + 一个管理员
DEFAULT_USERS = [
    {"username": "doctor01", "password": "crf2026", "realName": "张医生",
     "role": "doctor", "centerId": "01"},
    {"username": "doctor02", "password": "crf2026", "realName": "李医生",
     "role": "doctor", "centerId": "02"},
    {"username": "doctor03", "password": "crf2026", "realName": "王医生",
     "role": "doctor", "centerId": "03"},
    {"username": "doctor04", "password": "crf2026", "realName": "赵医生",
     "role": "doctor", "centerId": "04"},
    {"username": "admin",    "password": "admin2026", "realName": "系统管理员",
     "role": "admin", "centerId": "01"},
    {"username": "monitor",  "password": "monitor2026", "realName": "数据监查",
     "role": "monitor", "centerId": "01"},
]

# 预置 3 个示例患者（含完整访视数据），用于演示
DEMO_PATIENTS = [
    # 患者 1：已完成全部访视
    {
        "centerId": "01", "screeningNo": "01001", "randomNo": "001",
        "nameAbbr": "ZHHO", "gender": "男", "age": 35, "weight": 70.0,
        "height": 175.0, "status": "completed",
        # ... 详细 mock 数据
    },
    # 患者 2：治疗中，V1-V2 已完成
    {
        "centerId": "01", "screeningNo": "01002", "randomNo": "002",
        "nameAbbr": "LSMI", "gender": "女", "age": 28, "weight": 55.0,
        "height": 162.0, "status": "treatment",
    },
    # 患者 3：筛选中
    {
        "centerId": "02", "screeningNo": "02001",
        "nameAbbr": "WYQS", "gender": "男", "age": 42,
        "status": "screening",
    },
]
```

---

## 7. 前端对接改造

前端从 mock 数据切换到真实 API 需要做以下改造：

### 7.1 新增 API 客户端 (`src/api/client.ts`)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',            // Nginx 代理到后端
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动附加 JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：处理 401 跳登录
api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 7.2 新增各模块 API 函数 (`src/api/`)

```typescript
// src/api/patients.ts
export const getPatients = (params) => api.get('/patients', { params });
export const getPatient = (id) => api.get(`/patients/${id}`);
export const createPatient = (data) => api.post('/patients', data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
// ...

// src/api/visits.ts
export const getVisit = (patientId, visitNo) =>
  api.get(`/patients/${patientId}/visits/${visitNo}`);
export const saveVisit = (patientId, visitNo, data) =>
  api.put(`/patients/${patientId}/visits/${visitNo}`, data);
export const submitVisit = (patientId, visitNo) =>
  api.post(`/patients/${patientId}/visits/${visitNo}/submit`);
// ...

// src/api/export.ts
export const exportExcel = (params) =>
  api.get('/export/excel', { params, responseType: 'blob' });
```

### 7.3 PatientContext 改造

将 `useReducer` 中的本地操作替换为 API 调用。每个 dispatch action 变为 async 函数，先调 API 成功后再更新本地 state。

---

## 8. Docker 部署方案

### 8.1 后端 Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 应用代码
COPY . .

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 8.2 前端 Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 8.3 Nginx 配置 (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;    # React Router 支持
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;                # Excel 导出可能耗时

        # 文件下载支持
        proxy_buffering off;
    }
}
```

### 8.4 Docker Compose (`docker-compose.yml`)

```yaml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: crf_system
      POSTGRES_USER: crf_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD:-CrfSecure2026!}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crf_admin -d crf_system"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://crf_admin:${DB_PASSWORD:-CrfSecure2026!}@db:5432/crf_system
      JWT_SECRET: ${JWT_SECRET:-your-jwt-secret-change-in-production}
      CORS_ORIGINS: "*"
    command: >
      sh -c "
        alembic upgrade head &&
        python -m seeds.init_data &&
        uvicorn main:app --host 0.0.0.0 --port 8000
      "

  frontend:
    build: ./frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

### 8.5 环境变量文件 (`.env`)

```env
DB_PASSWORD=CrfSecure2026!
JWT_SECRET=change-this-to-a-random-string-in-production
```

### 8.6 一键启动流程

```bash
# 1. 克隆项目
git clone <repo-url> crf-system && cd crf-system

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 修改密码和密钥

# 3. 构建并启动
docker compose up -d --build

# 4. 查看日志
docker compose logs -f

# 5. 访问系统
# 浏览器打开 http://<服务器IP>
# 默认管理员账号：admin / admin2026
# 默认医生账号：doctor01 / crf2026（01中心）
```

---

## 9. 云服务器部署指南

### 方案 A：国内云服务器（推荐，医院网络友好）

**推荐配置**：阿里云 ECS / 腾讯云 CVM
- 规格：2核 4G 内存（够用）
- 系统：Ubuntu 22.04
- 带宽：5Mbps（几个医生同时用足够）
- 存储：40G SSD
- 预估费用：约 100-200 元/月

**部署步骤**：

```bash
# 1. 连接服务器
ssh root@<服务器IP>

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker

# 3. 安装 Docker Compose
sudo apt-get install docker-compose-plugin

# 4. 上传项目（或 git clone）
git clone <repo-url> /opt/crf-system
cd /opt/crf-system

# 5. 配置环境变量
cp .env.example .env
nano .env    # 修改密码

# 6. 启动
docker compose up -d --build

# 7. 配置防火墙（开放 80 端口）
ufw allow 80/tcp
ufw allow 443/tcp    # 如果后续配 HTTPS
```

### 方案 B：免费/低成本海外平台

| 平台 | 免费额度 | 适合场景 |
|---|---|---|
| Railway.app | $5/月额度 | 快速演示，自动部署 |
| Render.com | 免费 Web Service（750h/月） | 长期运行，但冷启动慢 |
| Fly.io | 免费 3 个小实例 | Docker 原生支持好 |

这些平台支持直接连接 GitHub 仓库自动部署，但服务器在海外，国内医院访问可能较慢。

### 方案 C：HTTPS 配置（可选但推荐）

如果有域名，使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书（需要域名已解析到服务器）
sudo certbot --nginx -d crf.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 10. 数据备份策略

```bash
# 手动备份数据库
docker compose exec db pg_dump -U crf_admin crf_system > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20260811.sql | docker compose exec -T db psql -U crf_admin crf_system

# 定时备份（加入 crontab）
# 每天凌晨 3 点自动备份，保留 30 天
0 3 * * * cd /opt/crf-system && docker compose exec -T db pg_dump -U crf_admin crf_system | gzip > /opt/backups/crf_$(date +\%Y\%m\%d).sql.gz && find /opt/backups -name "crf_*.sql.gz" -mtime +30 -delete
```

---

## 11. 后端开发阶段

### Phase 1：项目骨架（2h）
- FastAPI 应用初始化 + config + database
- SQLAlchemy 模型定义（全部 6 张表）
- Alembic 迁移配置和初始迁移
- CORS 中间件配置

### Phase 2：认证模块（1.5h）
- JWT 工具函数（生成/验证 token）
- 密码哈希（bcrypt）
- /auth/login 和 /auth/me 端点
- get_current_user 依赖注入

### Phase 3：患者 CRUD（2h）
- 患者列表（分页+筛选+中心隔离）
- 患者创建/更新/详情
- 人口学、病史等分模块更新端点
- 入选排除标准校验逻辑

### Phase 4：访视数据 CRUD（3h）
- 访视 upsert 逻辑（PUT 创建或更新）
- 分模块更新端点（vital-signs, vas, rqlq 等）
- 所有评分自动计算（6 个计算函数）
- 访视提交逻辑（校验+锁定+患者状态流转）

### Phase 5：不良事件/合并用药（1.5h）
- AdverseEvent CRUD
- ConcomitantMed CRUD
- NonDrugTherapy CRUD
- seq_no 自动递增

### Phase 6：Excel 导出（3h）
- 列名构建器（300-400 列）
- 患者数据展平逻辑
- 多 Sheet 工作簿生成
- 表头样式、冻结首行、自动列宽
- 安全性数据单独导出

### Phase 7：种子数据 + 测试（1.5h）
- 默认用户创建脚本
- 示例患者数据注入
- API 端点手动测试

### Phase 8：Docker 化 + 部署（2h）
- Dockerfile（前端+后端）
- docker-compose.yml
- Nginx 配置
- 一键启动测试
- 云服务器部署

**总预估工时：约 16-18 小时**

---

## 12. 前后端联调检查清单

联调时按以下顺序逐项验证：

- [ ] 登录：doctor01 登录 → 获得 token → 自动跳转患者列表
- [ ] 患者列表：显示本中心患者 → 搜索和筛选正常
- [ ] 新建患者：筛选号前缀自动填充 → 创建成功跳转 V1
- [ ] V1 录入：所有 17 个模块可正常填写 → 暂存成功 → 提交时校验
- [ ] 入选排除：全部满足 → 筛选通过 → 患者状态变为 treatment
- [ ] V2-V4 录入：VAS/RQLQ/中医证候总分自动计算正确
- [ ] 疗效计算：疗效指数 = (V1中医总分 - 当前中医总分) / V1中医总分 × 100%
- [ ] 依从性：(应服-剩余)/应服 × 100%，<80%或>120%红色警告
- [ ] 不良事件：新增/编辑/删除正常 → SAE联动正常
- [ ] 合并用药：CRUD 正常
- [ ] V5/V6 录入：精简版模块正常
- [ ] 完成总结：提交后患者状态变为 completed
- [ ] 导出 Excel：筛选条件正确 → 下载文件正常 → 打开验证列名和数据
- [ ] 多中心隔离：doctor01 看不到 02 中心的患者
- [ ] admin 权限：可查看所有中心数据 → 可导出全量
