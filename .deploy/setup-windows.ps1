# ============================================================
# CRF 系统 Windows 一键部署脚本 (一次性环境配置)
#
# 功能:
#   1. 检查/提示安装 Python3、PostgreSQL、并下载 ngrok
#   2. 创建 Python 虚拟环境 + 安装后端依赖
#   3. 创建数据库用户/库, 从 crf-data-backup.sql 完整恢复全部数据(12患者+5账号+12访视)
#   4. 应用数据库迁移 (alembic upgrade head)
#   5. 构建前端 (npm install + npm run build -> dist/)
#   6. 写入生产 .env (同源托管, 无需 CORS)
#   7. 校验通过后提示下一步: 运行 crf-service.ps1 注册开机自启
#
# 用法: 右键 -> 使用 PowerShell 运行
#       或: powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
#
# 需要先手动安装 (见 README-windows.md): Python 3.10-3.12, PostgreSQL 12+,
#   Node.js LTS。PostgreSQL 需把 pg_hba.conf 设为 md5/scram 密码认证。
# ============================================================
$ErrorActionPreference = "Stop"

# ---- 载入配置 ----
try { . "$PSScriptRoot\crf-windows.config.ps1" } catch {
    Write-Host "❌ 未找到 crf-windows.config.ps1, 请把三个脚本和 crf-data-backup.sql 放同一目录。" -ForegroundColor Red
    exit 1
}
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
$BackendDir   = Join-Path $ProjectRoot "crf-backend"
$FrontendDir  = Join-Path $ProjectRoot "crf-system"
$VenvDir      = Join-Path $BackendDir ".venv"
$EnvFile      = Join-Path $BackendDir ".env"
$DistDir      = Join-Path $FrontendDir "dist"

function Say   ($m) { Write-Host "[*] $m" -ForegroundColor Cyan }
function Ok    ($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Fail  ($m) { Write-Host "[!!] $m" -ForegroundColor Red }

function Test-Cmd($name, $params) {
    try {
        $null = & $name $params 2>$null; return $LASTEXITCODE -eq 0
    } catch { return $false }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CRF 系统 Windows 一键部署" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ---------- 0. 前提检查 ----------
Say "检查环境 (Python / PostgreSQL / Node)..."
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py)               { Fail "未找到 python。请安装 Python 3.10-3.12 并勾选 'Add python.exe to PATH'，然后重开终端重试。"; $missing=1 }
$psql = Get-ChildItem "$PgBin\psql.exe" -ErrorAction SilentlyContinue
if (-not $psql)             { Fail "未找到 PostgreSQL 于 $PgBin。请先安装 PostgreSQL 12+，并把上面路径改成实际版本号。"; $missing=1 }
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node)             { Fail "未找到 node。请安装 Node.js LTS 后重试。"; $missing=1 }
if (-not (Test-Path $BackupFile)) { Fail "未找到数据备份文件 $BackupFile。请把本机导出的 crf-data-backup.sql 拷到脚本目录。"; $missing=1 }
if (-not (Test-Path $BackendDir)) { Fail "未找到后端目录 $BackendDir。请确认脚本与仓库 crf-backend 在同一上级目录。"; $missing=1 }
if ($missing) { Write-Host "请安装缺失项后重新运行。" -ForegroundColor Red; exit 1 }

# -------- 1. Python 虚拟环境 + 依赖 --------
Say "创建 Python 虚拟环境并安装后端依赖..."
if (-not (Test-Path $VenvDir)) {
    python -m venv $VenvDir
}
$VenvPy = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"
Push-Location $BackendDir
try {
    & $VenvPip install --upgrade pip | Out-Null
    & $VenvPip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { Fail "pip install 失败。"; exit 1 }
} finally { Pop-Location }
Ok "后端依赖安装完成"

# -------- 2. 创建数据库 / 用户 / 恢复数据 --------
Say "创建数据库用户 '$DbUser' 与数据库 '$DbName' 并从备份恢复数据..."
$env:PGPASSWORD = $PgAdminPass
$douser = & "$PgBin\psql.exe" -U $PgAdminUser -h localhost -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DbUser'" 2>$null
if ($LASTEXITCODE -ne 0) { Fail "无法连接 PostgreSQL 超级用户 '$PgAdminUser'。请核对密码, 并确认 pg_hba.conf 允许密码登录。"; exit 1 }
if ("$douser".Trim() -ne "1") {
    & "$PgBin\psql.exe" -U $PgAdminUser -h localhost -d postgres -c "CREATE USER $DbUser WITH PASSWORD '$DbPass'" | Out-Null
    Ok "已创建用户 $DbUser"
}
$dbexists = & "$PgBin\psql.exe" -U $PgAdminUser -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>$null
if ("$dbexists".Trim() -ne "1") {
    & "$PgBin\psql.exe" -U $PgAdminUser -h localhost -d postgres -c "CREATE DATABASE $DbName OWNER $DbUser" | Out-Null
    Ok "已创建数据库 $DbName"
}
# 授权: 让业务用户对该库有全部权限 (dump 恢复时表 owner 已是 crf_user)
& "$PgBin\psql.exe" -U $PgAdminUser -h localhost -d $DbName -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser" | Out-Null
# 恢复数据 (dump 内含 --clean --if-exists, 可重复执行)
& "$PgBin\psql.exe" -U $DbUser -h localhost -d $DbName -v ON_ERROR_STOP=1 -q -f $BackupFile
if ($LASTEXITCODE -ne 0) {
    Fail "从备份恢复失败。上面是报错; 常见原因: pg_hba.conf 认证方式、或用户名非 crf_user。"
    exit 1
}
# 数据自检
$n = & "$PgBin\psql.exe" -U $DbUser -h localhost -d $DbName -tAc "SELECT count(*) FROM patients"
Ok "数据恢复完成: 患者表 $n 条记录"

# -------- 3. 应用迁移 (补齐版本/未来结构) --------
Say "应用数据库迁移 alembic upgrade head..."
& $VenvPy -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { Fail "迁移失败。"; exit 1 }
Ok "迁移完成"

# -------- 4. 构建前端 --------
Say "构建前端 (npm install + npm run build)..."
if (-not (Test-Path (Join-Path $FrontendDir "package.json"))) { Fail "未找到前端 $FrontendDir。"; exit 1 }
Push-Location $FrontendDir
try {
    if (-not (Test-Path "node_modules")) { npm install }
    npm run build
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $DistDir)) { Fail "前端构建失败。"; exit 1 }
} finally { Pop-Location }
Ok "前端构建完成 -> $DistDir"

# -------- 5. 写入生产 .env --------
Say "写入生产 .env..."
$dbUrl = "postgresql://${DbUser}:${DbPass}@localhost:5432/${DbName}"
@"
# 数据库配置
DATABASE_URL=$dbUrl
# JWT (上线务必改随机长串)
SECRET_KEY=$SecretKey
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
# 同源托管前端, 生产无需 CORS; 如需跨域再补
BACKEND_CORS_ORIGINS=$CorsOrigins
"@ | Out-File -FilePath $EnvFile -Encoding utf8
Ok ".env 已写入: $EnvFile"

# -------- 6. 启动一次做健康校验 --------
Say "启动后端做健康校验..."
$Start = New-TimeSpan
$proc = Start-Process -FilePath $VenvPy -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port $Port" `
        -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 1
$healthy = $false
for ($i=0; $i -lt 25; $i++) {
    if ($proc.HasExited) { Fail "后端进程异常退出 (退出码 $($proc.ExitCode))。"; break }
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $healthy = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
if (-not $healthy) { Fail "健康校验未通过 (后端未在 $Port 就绪)。"; exit 1 }
Ok ("健康校验通过: http://localhost:{0}/health" -f $Port)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  ✅ 部署完成!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  数据: $n 名患者 / 5 账号已从备份完整恢复"
Write-Host "  前端: $DistDir (后端同源托管)"
Write-Host "  本机访问: http://localhost:$Port"
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne '127.0.0.1' } |
    Select-Object -First 1 -ExpandProperty IPAddress)
Write-Host "  局域网: http://${lanIp}:$Port"
Write-Host ""
Write-Host "  下一步(长期服务): 运行  crf-service.ps1  注册开机自启 + ngrok 公网隧道"
Write-Host "==========================================================" -ForegroundColor Green
