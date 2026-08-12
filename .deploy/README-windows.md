# CRF 系统 — Windows 部署指南（长期服务 + 公网）

把整个 CRF 系统（含全部现有数据）部署到一台 **Windows** 电脑上，前后端同源托管，
开机自启，并通过 **ngrok** 公网访问。适用于临时/演示或长期稳定运行。

> 现有数据集：本机 PostgreSQL `crf_db` 已完整导出为 **`crf-data-backup.sql`**
> （12 名患者 + 5 个账号 + 12 条访视 + 全部字段）。Windows 部署时用它一键恢复，
> 无需重建数据。

---

## 文件清单（`.deploy/windows/` 下的脚本请与备份文件放在一起）

| 文件 | 作用 |
|---|---|
| `crf-data-backup.sql` | 数据库完整备份（12 名患者 + 5 账号 + 12 访视，**已在此目录就位**） |
| `crf-windows.config.ps1` | 部署配置（数据库密码、ngrok 路径、端口、密钥等，**先编辑**） |
| `setup-windows.ps1` | 一键环境部署：venv + 依赖 + 建库 + 恢复数据 + 迁移 + 构建前端 + 校验 |
| `crf-service.ps1` | 长期服务：注册开机自启（后端 + 隧道），启停/状态/日志 |

---

## 第一步：Windows 上先手动安装 3 个基础软件

> 16GB 内存完全够用，以下都是标准安装程序，一路 `下一步` 即可。

### 1) Python 3.10–3.12（64 位）
- 下载：https://www.python.org/downloads/windows/
- 安装时**务必勾选** “Add python.exe to PATH”
- 验证：打开 PowerShell 运行 `python --version`

### 2) PostgreSQL 12+（推荐 15）
- 下载：https://www.postgresql.org/download/windows/
- 安装时**记下你设置的超级用户密码**（默认用户 `postgres`）
- PG 15 默认安装目录是 `C:\Program Files\PostgreSQL\15\bin`
- **重要**：安装完成后需确认密码登录可用。编辑
  `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`，
  把 `127.0.0.1/32` 那行的 `auth_method` 改为 `scram-sha-256`（或 `md5`）
  并重启 `postgresql-x64-15` 服务。这是 `psql -h localhost` 能连的先决条件。
  （脚本会用 localhost 密码登录。）

### 3) Node.js LTS（用于构建前端）
- 下载：https://nodejs.org/ （LTS 版）
- 验证：`node --version`

### 4) ngrok（公网隧道，与当前 macOS 方案一致）
- 下载：https://ngrok.com/download （Windows 版本）
- 解压到任意目录，例如 `C:\ngrok\ngrok.exe`
- 注册并配置 authtoken：`C:\ngrok\ngrok.exe config add-authtoken 你的token`

---

## 第二步：整理部署目录

把仓库（`crf-backend/` + `crf-system/`）放到 Windows 上一个**纯英文**路径下，例如：

```
C:\crf\
   crf-backend\
   crf-system\
   .deploy\                      ← 三个脚本 + crf-data-backup.sql 已在此
      setup-windows.ps1
      crf-service.ps1
      crf-windows.config.ps1
      crf-data-backup.sql        ← 数据备份 (已就位)
```

配置 `crf-windows.config.ps1`，至少改这几项：

```powershell
$PgAdminPass  = "postgres超级用户密码"      # 装PG时设的
$DbPass       = "新的随机强密码"            # 业务库密码
$NgrokExe     = "C:\ngrok\ngrok.exe"
$SecretKey    = "换成随机长字符串"
$PgBin        = "C:\Program Files\PostgreSQL\15\bin"   # 版本号按实际改
```

---

## 第三步：运行一键部署

在 `.deploy` 目录右键 →“使用 PowerShell 运行” `setup-windows.ps1`，
或手动执行：

```powershell
cd C:\crf\.deploy
powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

脚本会自动完成：
1. 检查 Python / PostgreSQL / Node 是否就绪
2. 创建 `.venv` 并安装后端依赖
3. 创建用户 `crf_user` + 库 `crf_db`，**从 crf-data-backup.sql 完整恢复全部数据**
4. 跑数据库迁移 `alembic upgrade head`
5. `npm install && npm run build` 构建前端到 `crf-system/dist`
6. 写入生产 `.env`
7. 启动一次后端做健康校验，通过后提示完成

成功后应看到 `✅ 部署完成!`，并打印本机/局域网地址。

---

## 第四步：注册长期服务（开机自启 + 公网）

**以管理员身份**打开 PowerShell，切到 `.deploy` 目录：

```powershell
powershell -ExecutionPolicy Bypass
cd C:\crf\.deploy
.\crf-service.ps1 install
```

它会注册两个任务计划（开机自启、崩溃自动重启）：
- `CRF-Backend` — 运行 uvicorn 后端（托管前端 + API）
- `CRF-Tunnel` — 运行 ngrok 公网隧道

然后打印公网地址。把该地址发给项目方即可（首次访问点 “Visit Site”）。

常用管理命令：

```powershell
.\crf-service.ps1 status       # 后端/隧道/公网地址状态
.\crf-service.ps1 ngrok-url    # 只看当前公网地址
.\crf-service.ps1 log          # 看后端日志
.\crf-service.ps1 start        # 手动触发启动
.\crf-service.ps1 uninstall    # 停止并移除自启
```

---

## 登录账号（随备份恢复，无需重建）

```
管理员  admin      / admin@crf2026   (中心01)
医师01  doctor01   / Doctor@0101     (中心01)
医师02  doctor02   / Doctor@0202     (中心02)
医师03  doctor03   / Doctor@0303     (中心03)
医师04  doctor04   / Doctor@0404     (中心04)
```

> 这些账号和密码来自恢复的数据，与 macOS 环境完全一致，**不需要再跑 seed**。

---

## 常见问题

- **psql -h localhost 连不上 / 密码认证失败** → `pg_hba.conf` 的认证方式不是
  `scram-sha-256`/`md5`，按第一步第 2 条改并重启 PG 服务。
- **`python` 不是命令** → 装 Python 时没勾 “Add to PATH”，重装或改用完整路径。
- **8000 被占用** → 在结尾的脚本开新 PowerShell 查 `netstat -ano | findstr :8000`，
  改 `crf-windows.config.ps1` 里的 `$Port`。
- **公网地址打不开** → 检查 Windows 防火墙是否拦截 ngrok（首次会弹窗，点“允许”），
  或 ngrok authtoken 未配置。
- **`.ps1` 不能直接跑** → 始终用 `powershell -ExecutionPolicy Bypass -File ...`，
  或用右键“使用 PowerShell 运行”。
- **数据库还要改字段** → 编辑后端模型后，在 `.venv` 下跑
  `alembic revision --autogenerate` + `alembic upgrade head`（与 macOS 一致）。

---

## 与当前 macOS 环境的差别速查

| 项目 | macOS（现状） | Windows（新） |
|---|---|---|
| 后端 | conda env + nohup bash | `.venv` + 任务计划开机自启 |
| 数据库 | Homebrew PostgreSQL 15 手动配置 | PostgreSQL 安装包 |
| 前端 | `npm run build`（手动） | `setup-windows.ps1` 自动构建 |
| 公网 | `deploy.sh` 里 ngrok | `crf-service.ps1` 里 ngrok |
| 数据 | 本机 PG（已导出） | 从 `crf-data-backup.sql` 完整恢复 |
