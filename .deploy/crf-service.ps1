# ============================================================
# CRF 系统 Windows 长期服务脚本 (开机自启 + ngrok 公网隧道)
#
# 用法 (管理员 PowerShell, 在 .deploy 目录):
#   .\crf-service.ps1 install   # 注册 2 个任务计划开机自启(后端+隧道), 并立即启动
#   .\crf-service.ps1 start     # 手动启动
#   .\crf-service.ps1 status    # 查看运行状态与公网地址
#   .\crf-service.ps1 log       # 查看后端日志
#   .\crf-service.ps1 ngrok-url # 打印当前公网地址
#   .\crf-service.ps1 uninstall # 删除任务计划并停止
#
# 前置: 已运行过 setup-windows.ps1 完成环境与数据部署;
#       ngrok 已下载并配置 authtoken, 路径写在 crf-windows.config.ps1
# ============================================================
param(
    [switch]$RunBackend,
    [switch]$RunTunnel,
    [switch]$Install,
    [switch]$Start,
    [switch]$Status,
    [switch]$Log,
    [switch]$NgrokUrl,
    [switch]$Uninstall
)
$ErrorActionPreference = "Stop"
try { . "$PSScriptRoot\crf-windows.config.ps1" } catch {
    Write-Host "未找到 crf-windows.config.ps1" -ForegroundColor Red; exit 1
}
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }

$BackendDir = Join-Path $ProjectRoot "crf-backend"
$VenvPy     = Join-Path $BackendDir ".venv\Scripts\python.exe"
$LogDir     = Join-Path $PSScriptRoot "logs"
$SvcTask    = "CRF-Backend"
$TunTask    = "CRF-Tunnel"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Public-Url {
    try {
        $t = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
        $u = $t.tunnels | Where-Object { $_.public_url -like "https*" } | Select-Object -First 1 -ExpandProperty public_url
        return $u
    } catch { return $null }
}

# ---------- 供任务计划执行的常驻进程 ----------
if ($RunBackend) {
    if (-not (Test-Path $VenvPy)) { Write-Host "未找到 $VenvPy (请先跑 setup-windows.ps1)"; exit 1 }
    Push-Location $BackendDir
    while ($true) {
        $p = Start-Process -FilePath $VenvPy `
            -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port $Port" `
            -WorkingDirectory $BackendDir `
            -RedirectStandardOutput (Join-Path $LogDir "backend.log") `
            -RedirectStandardError  (Join-Path $LogDir "backend.err.log") `
            -NoNewWindow -PassThru
        $p.WaitForExit()          # 崩溃则自动重启
        Start-Sleep -Seconds 3
    }
    exit 0
}

if ($RunTunnel) {
    if (-not (Test-Path $NgrokExe)) {
        Out-File -FilePath (Join-Path $LogDir "tunnel.log") -Encoding utf8 `
            -InputObject "ngrok 未找到: $NgrokExe (请填 crf-windows.config.ps1 \$NgrokExe)"
        exit 1
    }
    while ($true) {
        $a = @("http", "$Port")
        if ($NgrokDomain) { $a += @("--domain", $NgrokDomain) }
        $p = Start-Process -FilePath $NgrokExe -ArgumentList $a -NoNewWindow -PassThru
        $p.WaitForExit()
        Start-Sleep -Seconds 3
    }
    exit 0
}

# ---------- 注册任务计划 ----------
function Register-Tasks {
    foreach ($pair in @(@($SvcTask, "-RunBackend"), @($TunTask, "-RunTunnel"))) {
        $a = New-ScheduledTaskAction -Execute "powershell.exe" `
            -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\crf-service.ps1`" $($pair[1])"
        $tr = New-ScheduledTaskTrigger -AtStartup
        $st = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
                 -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
        $pr = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        Register-ScheduledTask -TaskName $pair[0] -Action $a -Trigger $tr -Settings $st -Principal $pr -Force | Out-Null
        Start-ScheduledTask -TaskName $pair[0]
    }
}

function Stop-Procs {
    Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'uvicorn' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Backend-Running {
    [bool](Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'uvicorn' })
}

# ---------- 交互命令 ----------
switch ($true) {
    $Uninstall {
        Unregister-ScheduledTask -TaskName $SvcTask -Confirm:$false -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $TunTask -Confirm:$false -ErrorAction SilentlyContinue
        Stop-Procs
        Write-Host "[OK] 已卸载开机自启并停止进程。" -ForegroundColor Green
    }
    $Install {
        try {
            Register-Tasks
            Start-Sleep -Seconds 8
            Write-Host "[OK] 已注册开机自启并启动。" -ForegroundColor Green
            Write-Host "  后端: $(if (Backend-Running) {'运行中'} else {'启动中…'})"
            Write-Host "  公网地址: $(Public-Url)"
        } catch { Write-Host "[!!] 注册失败: $_" -ForegroundColor Red }
    }
    $Start {
        Start-ScheduledTask -TaskName $SvcTask -ErrorAction SilentlyContinue
        Start-ScheduledTask -TaskName $TunTask -ErrorAction SilentlyContinue
        Write-Host "[OK] 已触发启动。" -ForegroundColor Green
    }
    $Status {
        Write-Host "后端: $(if (Backend-Running) {'运行中'} else {'停止'})"
        Write-Host "隧道: $(if ((Get-Process -Name 'ngrok' -ErrorAction SilentlyContinue)) {'运行中'} else {'停止'})"
        Write-Host "公网: $(Public-Url)"
    }
    $Log     { Get-Content (Join-Path $LogDir "backend.log") -Tail 60 -ErrorAction SilentlyContinue }
    $NgrokUrl { Write-Host (Public-Url) }
    default  {
        Write-Host "用法: .\crf-service.ps1 {install|start|status|log|ngrok-url|uninstall}"
        Write-Host "首次部署请先运行 setup-windows.ps1 完成环境与数据恢复。"
    }
}
