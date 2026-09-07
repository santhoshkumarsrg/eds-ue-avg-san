#!/usr/bin/env bash
# Stop the cors-pna-proxy on :14502.
#
# Tries lsof first (listener on :14502), then falls back to pgrep
# against the canonical `node .../cors-pna-proxy.cjs --source 14502`
# command line. SIGTERM with a 10s SIGKILL escalation.
set -u
set -o pipefail

SOURCE_PORT=14502

PID=$(lsof -nP -iTCP:"$SOURCE_PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
if [ -z "${PID:-}" ]; then
    PID=$(pgrep -f "cors-pna-proxy.cjs.*--source $SOURCE_PORT" | head -1)
fi

if [ -z "${PID:-}" ]; then
    echo "cors-pna-proxy not running on :$SOURCE_PORT."
    exit 0
fi

if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "PID $PID not alive."
    exit 0
fi

echo "Stopping cors-pna-proxy (PID $PID)..."
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
