"""
集成测试
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import User

# 使用内存 SQLite 测试数据库
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def setup_database():
    """创建测试数据库表"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(setup_database):
    """测试客户端"""
    return TestClient(app)


@pytest.fixture(scope="module")
def seed_users():
    """初始化测试用户"""
    db = TestingSessionLocal()

    # 创建测试用户
    user_doctor = User(
        username="doctor01",
        hashed_password=get_password_hash("password123"),
        full_name="张医生",
        role="doctor",
        center_id="01",
        is_active=True
    )

    user_admin = User(
        username="admin",
        hashed_password=get_password_hash("admin123"),
        full_name="管理员",
        role="admin",
        center_id="01",
        is_active=True
    )

    db.add(user_doctor)
    db.add(user_admin)
    db.commit()
    db.close()

    yield

    # 清理
    db = TestingSessionLocal()
    db.query(User).delete()
    db.commit()
    db.close()


class TestAuth:
    """认证相关测试"""

    def test_login_success(self, client, seed_users):
        """测试登录成功"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "01"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, seed_users):
        """测试错误密码"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "wrongpass", "center_id": "01"}
        )
        assert response.status_code == 401

    def test_login_wrong_center(self, client, seed_users):
        """测试错误中心"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "02"}
        )
        assert response.status_code == 401

    def test_get_me(self, client, seed_users):
        """测试获取当前用户信息"""
        # 先登录获取 token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "01"}
        )
        token = login_response.json()["access_token"]

        # 获取用户信息
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "doctor01"
        assert data["role"] == "doctor"
        assert data["center_id"] == "01"


class TestPatients:
    """患者管理测试"""

    @pytest.fixture(scope="class")
    def auth_token(self, client, seed_users):
        """获取认证 token"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "01"}
        )
        return response.json()["access_token"]

    def test_create_patient(self, client, auth_token):
        """测试创建患者"""
        response = client.post(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "screening_no": "01001",
                "name_abbr": "ZHLS",
                "gender": "男",
                "age": 45,
                "height": 175,
                "weight": 70,
                "enrollment_date": "2026-06-01"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["screening_no"] == "01001"
        assert data["center_id"] == "01"
        assert data["status"] == "screening"

    def test_create_duplicate_screening_no(self, client, auth_token):
        """测试重复筛选号"""
        response = client.post(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "screening_no": "01001",
                "name_abbr": "LRY",
                "gender": "女",
                "age": 38,
                "height": 165,
                "weight": 55,
                "enrollment_date": "2026-06-02"
            }
        )
        assert response.status_code == 400

    def test_list_patients(self, client, auth_token):
        """测试患者列表"""
        response = client.get(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["screening_no"] == "01001"

    def test_get_patient(self, client, auth_token):
        """测试获取患者详情"""
        # 先获取列表拿到 patient_id
        list_response = client.get(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        patient_id = list_response.json()[0]["id"]

        # 获取详情
        response = client.get(
            f"/api/v1/patients/{patient_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == patient_id

    def test_update_patient_status(self, client, auth_token):
        """测试更新患者状态"""
        list_response = client.get(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        patient_id = list_response.json()[0]["id"]

        response = client.patch(
            f"/api/v1/patients/{patient_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"status": "treatment", "randomization_no": "001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "treatment"
        assert data["randomization_no"] == "001"


class TestVisits:
    """访视记录测试"""

    @pytest.fixture(scope="class")
    def auth_and_patient(self, client, seed_users):
        """准备认证和患者"""
        # 登录
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "01"}
        )
        token = login_response.json()["access_token"]

        # 获取或创建患者
        list_response = client.get(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {token}"}
        )
        patients = list_response.json()

        if patients:
            patient_id = patients[0]["id"]
        else:
            create_response = client.post(
                "/api/v1/patients",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "screening_no": "01002",
                    "name_abbr": "WXY",
                    "gender": "男",
                    "age": 50,
                    "height": 170,
                    "weight": 75,
                    "enrollment_date": "2026-06-03"
                }
            )
            patient_id = create_response.json()["id"]

        return {"token": token, "patient_id": patient_id}

    def test_list_visits(self, client, auth_and_patient):
        """测试访视列表（V1自动创建）"""
        token = auth_and_patient["token"]
        patient_id = auth_and_patient["patient_id"]

        response = client.get(
            f"/api/v1/patients/{patient_id}/visits",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["visit_no"] == "V1"
        assert data[0]["status"] == "draft"

    def test_update_visit_data(self, client, auth_and_patient):
        """测试更新访视数据"""
        token = auth_and_patient["token"]
        patient_id = auth_and_patient["patient_id"]

        response = client.patch(
            f"/api/v1/patients/{patient_id}/visits/V1",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "visit_date": "2026-06-01",
                "data": {
                    "vitalSigns": {"sbp": 120, "dbp": 80, "hr": 75},
                    "inclusionCriteria": {
                        "age_18_80": True,
                        "diagnosis_confirmed": True,
                        "symptom_duration": True,
                        "symptom_severity": True,
                        "informed_consent": True
                    },
                    "exclusionCriteria": {
                        "pregnancy_lactation": False,
                        "severe_disease": False,
                        "immunodeficiency": False,
                        "drug_allergy": False,
                        "participated_trial": False,
                        "other_exclusion": False
                    }
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visit_date"] == "2026-06-01"
        assert "vitalSigns" in data["data"]

    def test_submit_visit_eligibility(self, client, auth_and_patient):
        """测试提交V1并判定入选"""
        token = auth_and_patient["token"]
        patient_id = auth_and_patient["patient_id"]

        response = client.patch(
            f"/api/v1/patients/{patient_id}/visits/V1",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "submitted"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "submitted"
        assert "eligibility" in data["data"]
        assert data["data"]["eligibility"]["eligible"] == True

        # 检查患者状态是否变为 treatment
        patient_response = client.get(
            f"/api/v1/patients/{patient_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        patient = patient_response.json()
        assert patient["status"] == "treatment"
        assert patient["randomization_no"] is not None


class TestAdverseEvents:
    """不良事件测试"""

    @pytest.fixture(scope="class")
    def setup(self, client, seed_users):
        """准备数据"""
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "01"}
        )
        token = login_response.json()["access_token"]

        list_response = client.get(
            "/api/v1/patients",
            headers={"Authorization": f"Bearer {token}"}
        )
        patient_id = list_response.json()[0]["id"]

        return {"token": token, "patient_id": patient_id}

    def test_create_adverse_event(self, client, setup):
        """测试创建不良事件"""
        token = setup["token"]
        patient_id = setup["patient_id"]

        response = client.post(
            f"/api/v1/patients/{patient_id}/adverse-events",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "event_name": "轻度鼻衄",
                "description": "少量鼻出血",
                "start_date": "2026-06-05",
                "end_date": "2026-06-06",
                "is_ongoing": False,
                "severity": 1,
                "drug_relation": 3,
                "drug_measure": 1,
                "other_measure": 2,
                "outcome": 3,
                "is_sae": False
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["event_name"] == "轻度鼻衄"
        assert data["seq_no"] == 1

    def test_list_adverse_events(self, client, setup):
        """测试不良事件列表"""
        token = setup["token"]
        patient_id = setup["patient_id"]

        response = client.get(
            f"/api/v1/patients/{patient_id}/adverse-events",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1


class TestExport:
    """数据导出测试"""

    @pytest.fixture(scope="class")
    def auth_token(self, client, seed_users):
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "doctor01", "password": "password123", "center_id": "01"}
        )
        return login_response.json()["access_token"]

    def test_export_full(self, client, auth_token):
        """测试全量数据导出"""
        response = client.get(
            "/api/v1/export?mode=full",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    def test_export_safety(self, client, auth_token):
        """测试安全性数据导出"""
        response = client.get(
            "/api/v1/export?mode=safety",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    def test_export_with_filters(self, client, auth_token):
        """测试带筛选条件的导出"""
        response = client.get(
            "/api/v1/export?mode=full&statuses=screening,treatment&date_from=2026-06-01",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
