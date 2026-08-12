# ============================================================
# CRF 系统 Windows 部署配置（需手动填写你的值）
# ============================================================
# 用法: 把本文件和 setup-windows.ps1 / crf-service.ps1 放同一目录, 编辑下面
#       变量后, 右键 setup-windows.ps1 -> 使用 PowerShell 运行; 或:
#       powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1

# ---- 项目根目录 (两个脚本所在目录的上一级) ----
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# ---- PostgreSQL 连接 (Windows 上装的 PG 超级用户) ----
$PgBin      = "C:\Program Files\PostgreSQL\15\bin"   # PG 安装目录下的 bin (版本号按实际改)
$PgAdminUser= "postgres"        # 安装 PG 时设置的管理员用户
$PgAdminPass= "改成你的postgres超级用户密码"
$DbUser     = "crf_user"        # 新建的业务账号 (保持 crf_user, 与 dump 的 owner 一致)
$DbPass     = "改成随机的强密码"
$DbName     = "crf_db"

# ---- SQL 数据备份文件 (本次导出的完整库) ----
$BackupFile = Join-Path $PSScriptRoot "crf-data-backup.sql"   # 脚本目录下的备份文件

# ---- ngrok 公网隧道 (可选) ----
$NgrokExe   = "C:\ngrok\ngrok.exe"                  # ngrok 可执行文件路径
$NgrokDomain= ""                                    # 固定域名(付费), 留空用临时域名

# ---- 应用端口 ----
$Port = 8000

# ---- 密钥 (上线前改成随机长字符串) ----
$SecretKey = "换成随机长字符串-至少32字符-别用默认值"

# 前端默认允许来源(生产同源无需 CORS; 如需开发机联调再加)
$CorsOrigins = ""
