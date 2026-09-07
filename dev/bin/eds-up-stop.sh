#!/usr/bin/env bash
# Stop `aem up` running on :4501.
#
# Tries lsof first (find the listener on :4501), then falls back to
# pgrep against the canonical `aem up --no-open` command line. SIGTERM
# with a 10s SIGKILL escalation.
set -u
set -o pipefail

PORT=4501

PID=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
if [ -z "${PID:-}" ]; then
    PID=$(pgrep -f "aem up --no-open" | head -1)
fi

if [ -z "${PID:-}" ]; then
    echo "aem up not running on :$PORT."
    exit 0
fi

if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "PID $PID not alive."
    exit 0
fi

echo "Stopping aem up (PID $PID)..."
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
