#!/usr/bin/env bash
# ============================================================
# CRF 系统一键部署/管理脚本 (macOS) — ngrok 版
#
# 用法:
#   ./deploy.sh up          # 启动 后端 + ngrok 公网隧道(临时域名，地址每次变化)
#   ./deploy.sh lan         # 仅启动后端（局域网，不建公网隧道）
#   ./deploy.sh down        # 停止 后端 + ngrok
#   ./deploy.sh status      # 查看运行状态与当前公网地址
#   ./deploy.sh rebuild     # 重新构建前端后启动
#
# 前置:
#   - PostgreSQL 已运行且数据库已迁移: brew services start postgresql@15
#   - ngrok 已安装并配置 authtoken:    brew install ngrok && ngrok config add-authtoken <你的token>
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${CRF_PYTHON:-/opt/anaconda3/envs/crf/bin/python}"
PORT="${PORT:-8000}"
BACKEND_DIR="$ROOT/crf-backend"
DIST_DIR="$ROOT/crf-system/dist"
LOGS="$ROOT/.deploy"

# ngrok 本地管理 API（用于可靠读取公网 URL）
NGROK_API="${NGROK_API:-http://127.0.0.1:4040}"
# 可选：若在 ngrok.yml 配置了固定域名，填到这里则每次使用同一地址
NGROK_DOMAIN="${NGROK_DOMAIN:-}"

# 读取记录进程 PID 的文件；不存在或为空返回空串
pid_of() {
  cat "$1" 2>/dev/null || true
}

ensure() {
  mkdir -p "$LOGS"
  if ! command -v ngrok >/dev/null 2>&1; then
    echo "[!!] 未安装 ngrok，公网隧道不可用。请先: brew install ngrok"
    return 1
  fi
  return 0
}

backend_up() {
  local pid; pid="$(cat "$LOGS/backend.pid" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

start_backend() {
  if backend_up; then
    echo "[i] 后端已在运行 (PID $(pid_of "$LOGS/backend.pid"))"
    return 0
  fi
  echo "[i] 启动后端 (0.0.0.0:$PORT)..."
  cd "$BACKEND_DIR"
  nohup "$PY" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" >"$LOGS/backend.log" 2>&1 &
  echo $! > "$LOGS/backend.pid"
  # 等待健康检查
  for _ in $(seq 1 20); do
    if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
      echo "[ok] 后端已就绪 http://localhost:$PORT/health"
      return 0
    fi
    sleep 1
  done
  echo "[!!] 后端启动超时，见 $LOGS/backend.log"
  tail -20 "$LOGS/backend.log" 2>/dev/null || true
  return 1
}

# 通过 ngrok 本地 API 读取公网 URL（临时域名每次启动不同）
ngrok_url() {
  curl -sf "$NGROK_API/api/tunnels" 2>/dev/null | "$PY" -c '
import sys, json
d = json.load(sys.stdin)
urls = [t["public_url"] for t in d.get("tunnels", []) if t.get("public_url", "").startswith("https://")]
print(urls[0] if urls else "")
' 2>/dev/null || true
}

start_tunnel() {
  local tpid; tpid="$(pid_of "$LOGS/tunnel.pid")"
  if [ -n "$tpid" ] && kill -0 "$tpid" 2>/dev/null; then
    echo "[i] ngrok 隧道已在运行"
    local current; current="$(ngrok_url)"
    if [ -n "$current" ]; then echo "$current" > "$LOGS/tunnel.url"; echo "[ok] 公网地址: $current"; fi
    return 0
  fi
  local args=("http" "$PORT")
  if [ -n "$NGROK_DOMAIN" ]; then args+=(--domain "$NGROK_DOMAIN"); fi
  echo "[i] 启动 ngrok 隧道 (${args[*]})..."
  nohup ngrok "${args[@]}" >"$LOGS/ngrok.log" 2>&1 &
  echo $! > "$LOGS/tunnel.pid"
  # 等待 ngrok 本地 API 就绪并给出公网 URL
  for _ in $(seq 1 30); do
    local got; got="$(ngrok_url)"
    if [ -n "$got" ]; then
      echo "$got" > "$LOGS/tunnel.url"
      echo "[ok] 公网地址: $got"
      return 0
    fi
    sleep 1
  done
  echo "[!!] ngrok 公网地址未获取到，见 $LOGS/ngrok.log"
  tail -10 "$LOGS/ngrok.log" 2>/dev/null || true
  return 1
}

status() {
  echo "== 后端 =="
  if backend_up; then
    echo "  运行中 (PID $(pid_of "$LOGS/backend.pid"))  健康: $(curl -s http://localhost:$PORT/health)"
    echo "  局域网: http://$(ipconfig getifaddr en0 2>/dev/null || echo '<本机IP>'):$PORT"
  else
    echo "  未运行"
  fi
  echo "== 公网隧道 (ngrok) =="
  local tpid; tpid="$(pid_of "$LOGS/tunnel.pid")"
  if [ -n "$tpid" ] && kill -0 "$tpid" 2>/dev/null; then
    local current; current="$(ngrok_url)"
    if [ -n "$current" ]; then echo "$current" > "$LOGS/tunnel.url"; fi
    local saved; saved="$(cat "$LOGS/tunnel.url" 2>/dev/null || true)"
    echo "  运行中  公网: ${current:-${saved:-<未获取到>}}"
    echo "  (提示: ngrok 免费临时域名在隧道重启后会变化)"
  else
    echo "  未运行"
  fi
}

down() {
  echo "[i] 停止 ngrok 与后端..."
  local tpid; tpid="$(pid_of "$LOGS/tunnel.pid")"
  local bpid; bpid="$(pid_of "$LOGS/backend.pid")"
  if [ -n "$tpid" ]; then kill "$tpid" 2>/dev/null || true; rm -f "$LOGS/tunnel.pid"; fi
  if [ -n "$bpid" ]; then kill "$bpid" 2>/dev/null || true; rm -f "$LOGS/backend.pid"; fi
  pkill -f "ngrok http" 2>/dev/null || true
  pkill -f "uvicorn app.main" 2>/dev/null || true
  echo "[ok] 已停止"
}

rebuild() {
  echo "[i] 重新构建前端..."
  cd "$ROOT/crf-system"
  npm run build
  echo "[ok] 前端构建完成"
}

ensure || exit 1
case "${1:-up}" in
  up)
    if [ ! -d "$DIST_DIR" ]; then echo "[warn] dist 不存在，先 rebuild"; rebuild; fi
    start_backend && start_tunnel
    status
    ;;
  lan)
    if [ ! -d "$DIST_DIR" ]; then echo "[warn] dist 不存在，先 rebuild"; rebuild; fi
    start_backend
    status
    ;;
  down) down ;;
  status) status ;;
  rebuild) rebuild ;;
  *)
    echo "用法: $0 {up|lan|down|status|rebuild}"
    exit 1
    ;;
esac
