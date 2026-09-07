#!/usr/bin/env bash
# Stop the Universal Editor Service on :14500.
#
# Tries lsof first (listener on :14500), then falls back to pgrep
# against the canonical `node ./universal-editor-service.cjs` command
# line. SIGTERM with a 10s SIGKILL escalation. UES_DIR is not required
# - this is a tiny socket signal, no truststore / no .env work.
set -u
set -o pipefail

PORT=14500

PID=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
if [ -z "${PID:-}" ]; then
    PID=$(pgrep -f "universal-editor-service.cjs" | head -1)
fi

if [ -z "${PID:-}" ]; then
    echo "Universal Editor Service not running on :$PORT."
    exit 0
fi

if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "PID $PID not alive."
    exit 0
fi

echo "Stopping Universal Editor Service (PID $PID)..."
kill -TERM "$PID" 2>/dev/null
for _ in $(seq 1 10); do
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "  stopped."
        exit 0
    fi
    sleep 1
done

echo "  SIGTERM didn't take, sending SIGKILL..."
kill -9 "$PID" 2>/dev/null
echo "  stopped."
