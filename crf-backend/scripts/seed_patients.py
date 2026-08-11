"""
批量创建各中心的患者档案（供前端联调展示）。
用法：cd crf-backend && /opt/anaconda3/envs/crf/bin/python scripts/seed_patients.py

后端 create_patient 会强制把患者 center_id 设为"建档用户的 center_id"，
因此必须用【各中心的 doctor 账号】为该中心建档（多中心隔离，admin 无法跨中心建）。

注意：此脚本只在"患者不存在"时创建，可重复运行（幂等）。登录账号密码需与已建用户一致。
"""
import json
import os
from urllib import request, error

API = os.environ.get("CRF_API", "http://localhost:8000/api/v1")

# 各中心建档账号（doctor01-04）
CENTER_CREDS = {
    "01": ("doctor01", os.environ.get("CRF_DR01_PASS", "Doctor@0101")),
    "02": ("doctor02", os.environ.get("CRF_DR02_PASS", "Doctor@0202")),
    "03": ("doctor03", os.environ.get("CRF_DR03_PASS", "Doctor@0303")),
    "04": ("doctor04", os.environ.get("CRF_DR04_PASS", "Doctor@0404")),
}

# center, screening_no, name_abbr, gender, age, height, weight, enrollment_date
PATIENTS = [
    ("01", "01001", "ZHLS", "男", 41, 175, 72, "2026-05-20"),
    ("01", "01002", "LRY", "女", 28, 163, 56, "2026-06-02"),
    ("01", "01003", "WXY", "男", 39, 171, 65, "2026-07-28"),
    ("02", "02001", "WXH", "男", 45, 178, 78, "2026-05-18"),
    ("02", "02002", "FMC", "女", 36, 160, 52, "2026-04-11"),
    ("02", "02003", "TDH", "男", 52, 170, 68, "2026-08-05"),
    ("03", "03001", "CLX", "女", 33, 165, 60, "2026-03-10"),
    ("03", "03002", "MHG", "男", 48, 176, 80, "2026-06-15"),
    ("03", "03003", "QYY", "女", 26, 158, 48, "2026-07-01"),
    ("04", "04001", "HYQ", "男", 36, 180, 82, "2026-06-22"),
    ("04", "04002", "SLF", "男", 43, 173, 74, "2026-04-28"),
    ("04", "04003", "JXB", "女", 31, 162, 55, "2026-08-09"),
]


def post(url, payload, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    with request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    # 各中心的登录 token（不同中心患者用对应 doctor 建档）
    tokens = {}
    for center, (user, pwd) in CENTER_CREDS.items():
        try:
            tokens[center] = post(f"{API}/auth/login", {"username": user, "password": pwd, "center_id": center})["access_token"]
        except error.HTTPError as e:
            print(f"[警告] 中心 {center} 账号 {user} 登录失败: {e.read().decode()}")
            tokens[center] = None

    created, skipped, failed = 0, 0, 0
    for center, screening_no, abbr, gender, age, height, weight, enroll in PATIENTS:
        token = tokens.get(center)

        # 幂等：用 admin 查是否已存在该筛号（admin 可看全部）
        admin_token = None
        try:
            from urllib.request import Request
            req = Request(f"{API}/auth/login", data=json.dumps({"username": "admin", "password": os.environ.get("CRF_ADMIN_PASS", "admin@crf2026"), "center_id": "01"}).encode(), headers={"Content-Type": "application/json"})
            with request.urlopen(req) as r:
                admin_token = json.loads(r.read())["access_token"]
        except Exception:  # noqa: BLE001
            pass

        if admin_token:
            try:
                existing = json.loads(request.urlopen(request.Request(f"{API}/patients", headers={"Authorization": f"Bearer {admin_token}"})).read())
                if any(p["screening_no"] == screening_no for p in existing):
                    print(f"[跳过] {screening_no} 已存在")
                    skipped += 1
                    continue
            except Exception:  # noqa: BLE001
                pass

        if not token:
            print(f"[跳过] {screening_no}: 中心 {center} 无有效建档账号")
            failed += 1
            continue
        try:
            bp = post(
                f"{API}/patients",
                {
                    "screening_no": screening_no,
                    "name_abbr": abbr,
                    "gender": gender,
                    "age": age,
                    "height": height,
                    "weight": weight,
                    "enrollment_date": enroll,
                },
                token,
            )
            print(f"[创建] {screening_no} ({abbr}) id={bp['id']} center={bp['center_id']}")
            created += 1
        except error.HTTPError as e:
            print(f"[失败] {screening_no}: {e.read().decode()}")
            failed += 1
        except Exception as e:  # noqa: BLE001
            print(f"[失败] {screening_no}: {e}")
            failed += 1

    print(f"\n完成：新建 {created} 例，跳过 {skipped} 例，失败 {failed} 例。")


if __name__ == "__main__":
    main()
