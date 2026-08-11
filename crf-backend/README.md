# 荆防合剂过敏性鼻炎临床研究 CRF 系统 - 后端 API

FastAPI + PostgreSQL + SQLAlchemy 构建的临床研究数据管理后端。

## 功能特性

- **认证与权限**：JWT token 认证，基于角色的访问控制（doctor/admin）
- **多中心隔离**：医生仅能访问本中心患者，管理员可跨中心
- **患者管理**：CRUD、搜索、筛选、分页
- **访视记录**：6 个访视（V1-V6）的数据录入与提交，V1 自动判定入选/排除
- **不良事件**：CRUD、seq_no 自增、SAE 标记
- **合并用药**：CRUD、seq_no 自增
- **数据导出**：Excel 格式（全量数据 4 Sheet / 安全性数据 2 Sheet），支持筛选

## 技术栈

- **Web 框架**：FastAPI 0.109
- **ORM**：SQLAlchemy 2.0 + Alembic
- **数据库**：PostgreSQL 15
- **认证**：JWT (python-jose + passlib)
- **Excel 导出**：openpyxl
- **测试**：pytest + httpx

## 快速开始

### 1. 安装依赖

```bash
cd crf-backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 修改数据库连接和密钥
```

### 3. 初始化数据库

```bash
# 创建 PostgreSQL 数据库
createdb crf_db

# 生成初始迁移
alembic revision --autogenerate -m "Initial tables"

# 执行迁移
alembic upgrade head
```

### 4. 创建初始用户（手动插入或编写脚本）

```sql
INSERT INTO users (username, hashed_password, full_name, role, center_id, is_active)
VALUES
  ('doctor01', '$2b$12$...', '张医生', 'doctor', '01', true),
  ('admin', '$2b$12$...', '管理员', 'admin', '01', true);
```

使用 Python 生成密码哈希：

```python
from app.core.security import get_password_hash
print(get_password_hash("your_password"))
```

### 5. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 文档：http://localhost:8000/docs

## 运行测试

```bash
pytest
```

## API 端点

### 认证
- `POST /api/v1/auth/login` - 登录获取 token
- `GET /api/v1/auth/me` - 获取当前用户信息

### 患者管理
- `POST /api/v1/patients` - 创建患者
- `GET /api/v1/patients` - 患者列表（支持搜索、筛选、分页）
- `GET /api/v1/patients/{id}` - 患者详情
- `PATCH /api/v1/patients/{id}` - 更新患者
- `DELETE /api/v1/patients/{id}` - 删除患者

### 访视记录
- `POST /api/v1/patients/{id}/visits` - 创建访视
- `GET /api/v1/patients/{id}/visits` - 访视列表
- `GET /api/v1/patients/{id}/visits/{visit_no}` - 访视详情
- `PATCH /api/v1/patients/{id}/visits/{visit_no}` - 更新访视（暂存/提交）
- `DELETE /api/v1/patients/{id}/visits/{visit_no}` - 删除访视

### 不良事件
- `POST /api/v1/patients/{id}/adverse-events` - 创建不良事件
- `GET /api/v1/patients/{id}/adverse-events` - 不良事件列表
- `GET /api/v1/patients/{id}/adverse-events/{ae_id}` - 不良事件详情
- `PATCH /api/v1/patients/{id}/adverse-events/{ae_id}` - 更新不良事件
- `DELETE /api/v1/patients/{id}/adverse-events/{ae_id}` - 删除不良事件

### 合并用药
- `POST /api/v1/patients/{id}/concomitant-meds` - 创建合并用药
- `GET /api/v1/patients/{id}/concomitant-meds` - 合并用药列表
- `GET /api/v1/patients/{id}/concomitant-meds/{med_id}` - 合并用药详情
- `PATCH /api/v1/patients/{id}/concomitant-meds/{med_id}` - 更新合并用药
- `DELETE /api/v1/patients/{id}/concomitant-meds/{med_id}` - 删除合并用药

### 数据导出
- `GET /api/v1/export?mode=full|safety&centers=&statuses=&date_from=&date_to=` - 导出 Excel

## 数据库表结构

### users - 用户表
- id, username, hashed_password, full_name, role, center_id, is_active

### patients - 患者表
- id, screening_no, randomization_no, name_abbr, center_id, gender, age, height, weight
- enrollment_date, status, withdrawal_reason, withdrawal_date, completion_summary

### visits - 访视记录表
- id, patient_id, visit_no, visit_date, status, data (JSON)

### adverse_events - 不良事件表
- id, patient_id, seq_no, event_name, description, start_date, end_date, is_ongoing
- severity, drug_relation, drug_measure, other_measure, outcome, is_sae, sae_type

### concomitant_meds - 合并用药表
- id, patient_id, seq_no, drug_name, indication, dosage_form, dosage_amount
- start_date, end_date, is_ongoing, drug_relation, remark

### audit_logs - 审计日志表
- id, user_id, action, resource_type, resource_id, details (JSON), ip_address

## 多中心隔离逻辑

- **医生 (role=doctor)**：只能看到 center_id 与自己相同的患者
- **管理员 (role=admin)**：可以查看和导出所有中心的数据

## 入选/排除判定逻辑

V1 访视提交时自动判定：
- **入选标准**：5 项全部满足 → `inclusion_met = True`
- **排除标准**：6 项全部不满足 → `exclusion_met = True`
- **最终判定**：`eligible = inclusion_met AND exclusion_met`
- 筛选通过 → 患者状态变为 `treatment`，生成随机号
- 筛选失败 → 患者状态变为 `screening_failed`

## 开发指南

### 数据库迁移

```bash
# 自动生成迁移脚本
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head

# 回滚
alembic downgrade -1
```

### 添加新的 API 端点

1. 在 `app/schemas/schemas.py` 定义 Pydantic 模型
2. 在 `app/routers/` 创建新路由文件
3. 在 `app/main.py` 中注册路由

### 代码规范

- 使用类型注解
- 路由函数使用 `async def`
- 所有数据库操作通过 `Depends(get_db)` 注入
- 权限检查通过 `Depends(get_current_active_user)` 注入

## License

MIT
