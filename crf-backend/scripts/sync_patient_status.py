#!/usr/bin/env python3
"""
与前端 seedDataset 画像对齐后端患者状态 / 随机编号（幂等）。

背景：前端 PatientList 将"后端患者档案"与"前端 seedDataset 富数据"按筛选号合并，
合并时用后端的 status 覆盖 seed 状态。数据库 batch 建档时全部患者被设成 screening，
导致列表出现"筛选中但 V6 已完成"的错乱演示。

本脚本把 8 位后端口径状态改为 seed 意图（后续新增 seed 患者也照此维护）。

用法：cd crf-backend && /opt/anaconda3/envs/crf/bin/python scripts/sync_patient_status.py
环境变量：CRF_API (默认 http://localhost:8000/api/v1)、CRF_ADMIN_PASS (默认 admin@crf2026)
"""
import os
import json
from urllib import request, error

API = os.environ.get("CRF_API", "http://localhost:8000/api/v1")
ADMIN_PASS = os.environ.get("CRF_ADMIN_PASS", "admin@crf2026")

# 筛号 -> (预期状态, 预期随机号) 取自 src/mock/seedDataset.ts buildProfiles
TARGET = {
    "01001": ("completed", "001"),
    "01002": ("treatment", "002"),
    # 01003 seed='screening' 无需改
    "02001": ("followup", "003"),
    "02002": ("completed", "004"),
    # 02003 seed='screening' 无需改
    "03001": ("withdrawn", "005"),
    # 03002 seed='screening_failed' 前端映射为 screening 无需改
    "03003": ("treatment", "006"),
    "04001": ("followup", "008"),
    "04002": ("completed", "009"),
    # 04003 seed='screening' 无需改
}


def call(method, path, payload=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = request.Request(API + path, data=data, headers=headers, method=method)
    with request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    # admin 登录（跨中心）
    admin = call("POST", "/auth/login", {"username": "admin", "password": ADMIN_PASS, "center_id": "01"})
    token = admin["access_token"]

    patients = call("GET", "/patients", token=token)
    by_no = {p["screening_no"]: p for p in patients}

    changed, done, missed = 0, 0, 0
    for no, (status, rand) in TARGET.items():
        p = by_no.get(no)
        if not p:
            print(f"[缺失] 后端无 {no}")
            missed += 1
            continue
        patch = {}
        if p["status"] != status:
            patch["status"] = status
        if rand and p["randomization_no"] != rand:
            patch["randomization_no"] = rand
        if not patch:
            print(f"[一致] {no} {p['name_abbr']} status={status} random={rand}")
            done += 1
            continue
        call("PATCH", f"/patients/{p['id']}", patch, token)
        print(f"[更新] {no} {p['name_abbr']} -> {patch}")
        changed += 1

    print(f"\n完成：更新 {changed} 例，已一致 {done} 例，缺失 {missed} 例。")


if __name__ == "__main__":
    main()
