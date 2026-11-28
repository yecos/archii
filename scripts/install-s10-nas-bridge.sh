#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Installs the Archii NAS bridge into native Termux.
# Run this script FROM THE SAME DIRECTORY as s10-nas-bridge.py.
#
# It never changes WebDAV, SAF, Tailscale, SSH, or the existing NAS server.
# It adds one loopback bridge service and one Termux:Boot launcher.

PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
HOME="${HOME:-/data/data/com.termux/files/home}"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SRC_DIR/s10-nas-bridge.py"
BASE="$HOME/.s10-nas-bridge"
BIN="$BASE/bin"
CFG="$BASE/config"
RUN="$BASE/run"
LOG="$BASE/logs"
ENV_FILE="$CFG/bridge.env"
PID_FILE="$RUN/bridge.pid"
BRIDGE_PY="$BIN/s10-nas-bridge.py"
START="$PREFIX/bin/archii-nas-bridge-start"
STOP="$PREFIX/bin/archii-nas-bridge-stop"
STATUS="$PREFIX/bin/archii-nas-bridge-status"
BOOT="$HOME/.termux/boot/20-archii-nas-bridge"

if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC no existe. Copia install-s10-nas-bridge.sh y s10-nas-bridge.py juntos."
  exit 1
fi

command -v python >/dev/null 2>&1 || {
  echo "ERROR: python no está instalado en Termux."
  exit 1
}

mkdir -p "$BIN" "$CFG" "$RUN" "$LOG" "$HOME/.termux/boot"
chmod 700 "$BASE" "$BIN" "$CFG" "$RUN" "$LOG"

cp "$SRC" "$BRIDGE_PY"
chmod 700 "$BRIDGE_PY"
python -m py_compile "$BRIDGE_PY"

if [ ! -f "$ENV_FILE" ] || [ -z "$(cut -d "'" -f2 "$ENV_FILE" | head -n1)" ]; then
  TOKEN="$(python - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
)"
  cat > "$ENV_FILE" <<EOF
ARCHII_NAS_BRIDGE_TOKEN='$TOKEN'
ARCHII_NAS_BRIDGE_HOST='127.0.0.1'
ARCHII_NAS_BRIDGE_PORT='8770'
ARCHII_NAS_WEBDAV='http://127.0.0.1:8766'
ARCHII_NAS_DAV_TIMEOUT='12'
ARCHII_NAS_BRIDGE_MAX_BODY_MB='16'
EOF
  chmod 600 "$ENV_FILE"
else
  TOKEN="$(sed -n "s/^ARCHII_NAS_BRIDGE_TOKEN='\(.*\)'$/\1/p" "$ENV_FILE" | head -n1)"
fi

cat > "$START" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
BASE="$HOME/.s10-nas-bridge"
ENV_FILE="$BASE/config/bridge.env"
PID_FILE="$BASE/run/bridge.pid"
LOG_FILE="$BASE/logs/bridge.log"
PY="$BASE/bin/s10-nas-bridge.py"

[ -f "$ENV_FILE" ] || { echo "Bridge config missing"; exit 1; }
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "Archii NAS Bridge: RUNNING PID=$PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

nohup python "$PY" >>"$LOG_FILE" 2>&1 &
PID=$!
echo "$PID" > "$PID_FILE"
sleep 1

if kill -0 "$PID" 2>/dev/null; then
  echo "Archii NAS Bridge: RUNNING PID=$PID"
else
  echo "Archii NAS Bridge: FAILED"
  tail -n 50 "$LOG_FILE" 2>/dev/null || true
  rm -f "$PID_FILE"
  exit 1
fi
EOF

cat > "$STOP" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
PID_FILE="$HOME/.s10-nas-bridge/run/bridge.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "Archii NAS Bridge: STOPPED"
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  for _ in 1 2 3 4 5; do
    kill -0 "$PID" 2>/dev/null || break
    sleep 1
  done
fi
rm -f "$PID_FILE"
echo "Archii NAS Bridge: STOPPED"
EOF

cat > "$STATUS" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
set -u
BASE="$HOME/.s10-nas-bridge"
ENV_FILE="$BASE/config/bridge.env"
PID_FILE="$BASE/run/bridge.pid"
# shellcheck disable=SC1090
source "$ENV_FILE"

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
  echo "Archii NAS Bridge: RUNNING PID=$PID"
else
  echo "Archii NAS Bridge: STOPPED"
  exit 1
fi

curl --max-time 15 -fsS   -H "X-Archii-Bridge-Token: $ARCHII_NAS_BRIDGE_TOKEN"   "http://127.0.0.1:$ARCHII_NAS_BRIDGE_PORT/health" || true
echo
EOF

chmod 700 "$START" "$STOP" "$STATUS"

cat > "$BOOT" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
"$PREFIX/bin/archii-nas-bridge-start" >>"$HOME/.s10-nas-bridge/logs/boot.log" 2>&1
EOF
chmod 700 "$BOOT"

"$STOP" >/dev/null 2>&1 || true
"$START"

echo
echo "=== LOCAL STATUS ==="
"$STATUS" || true

echo
echo "=== CONFIG FOR ARCHII / VERCEL ==="
echo "NAS_BRIDGE_URL=https://<YOUR-HTTPS-TUNNEL-HOST>"
echo "NAS_BRIDGE_TOKEN=$TOKEN"
echo
echo "IMPORTANT:"
echo "- Keep the token secret."
echo "- Do NOT expose 127.0.0.1:8766 directly."
echo "- Publish only bridge port 8770 through an HTTPS tunnel."
echo "- Save the token in Vercel as a server-only environment variable."
