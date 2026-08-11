#!/usr/bin/env bash
# ============================================================
# CRF 一键启动服务脚本 (macOS)
#
# 一条命令拉起整套公网可测系统：
#   1) 重新构建前端（可选，代码有改动时用）
#   2) 重启后端 (0.0.0.0:8000)
#   3) 启动 ngrok 公网隧道
#   4) 自动打印：公网地址 / 局域网地址 / 登录账号
#
# 用法:
#   ./start.sh           # 启动(不重新构建)
#   ./start.sh rebuild   # 先重新构建前端再启动
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/.deploy"
PORT="${PORT:-8000}"

# 清理本次启动可能残留的旧进程（干净重启）
echo "== 清理旧进程 =="
if [ -f "$LOGS/tunnel.pid" ] && kill -0 "$(cat "$LOGS/tunnel.pid")" 2>/dev/null; then
  kill "$(cat "$LOGS/tunnel.pid")" 2>/dev/null || true
fi
if [ -f "$LOGS/backend.pid" ] && kill -0 "$(cat "$LOGS/backend.pid")" 2>/dev/null; then
  kill "$(cat "$LOGS/backend.pid")" 2>/dev/null || true
fi
pkill -f "ngrok http" 2>/dev/null || true
pkill -f "uvicorn app.main" 2>/dev/null || true
rm -f "$LOGS/tunnel.pid" "$LOGS/backend.pid"
sleep 1

echo "== 前端构建 =="
if [ "${1:-}" = "rebuild" ]; then
  cd "$ROOT/crf-system" && npm run build && echo "  构建完成"
else
  if [ -d "$ROOT/crf-system/dist" ]; then
    echo "  使用现有 dist（如需重新构建，运行 ./start.sh rebuild）"
  else
    cd "$ROOT/crf-system" && npm run build
  fi
fi

echo "== 启动后端 =="
cd "$ROOT/crf-backend"
nohup /opt/anaconda3/envs/crf/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" >"$LOGS/backend.log" 2>&1 &
echo $! > "$LOGS/backend.pid"
ok=0
for _ in $(seq 1 20); do
  if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ "$ok" != "1" ]; then echo "[!!] 后端启动失败，见 $LOGS/backend.log"; tail -20 "$LOGS/backend.log" || true; exit 1; fi
echo "  后端就绪 http://localhost:$PORT/health"

echo "== 启动 ngrok 公网隧道 =="
nohup ngrok http "$PORT" >"$LOGS/ngrok.log" 2>&1 &
echo $! > "$LOGS/tunnel.pid"
URL=""
for _ in $(seq 1 30); do
  URL="$(curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null | /opt/anaconda3/envs/crf/bin/python -c "import sys,json; ts=json.load(sys.stdin).get('tunnels',[]); print(next((t['public_url'] for t in ts if t.get('public_url','').startswith('https://')),''))" 2>/dev/null || true)"
  if [ -n "$URL" ]; then break; fi
  sleep 1
done
echo "$URL" > "$LOGS/tunnel.url"
if [ -z "$URL" ]; then echo "[!!] ngrok 地址未获取到，见 $LOGS/ngrok.log"; tail -10 "$LOGS/ngrok.log" || true; fi

echo
echo "=============================================================="
echo "  ✅ CRF 系统已启动"
echo "=============================================================="
echo "  公网测试地址（发给其他人）:"
echo "     $URL"
echo "  （ngrok 免费临时域名，重启后会变化；首次访问请点 “Visit Site”）"
echo ""
echo "  局域网地址（同一 Wi-Fi 内）:"
echo "     http://$(ipconfig getifaddr en0 2>/dev/null || echo '<本机IP>'):$PORT"
echo ""
echo "  登录账号:"
echo "     管理员  admin       / admin@crf2026   (中心 01)"
echo "     医师01  doctor01    / Doctor@0101     (中心 01)"
echo "     医师02  doctor02    / Doctor@0202     (中心 02)"
echo "     医师03  doctor03    / Doctor@0303     (中心 03)"
echo "     医师04  doctor04    / Doctor@0404     (中心 04)"
echo "=============================================================="
