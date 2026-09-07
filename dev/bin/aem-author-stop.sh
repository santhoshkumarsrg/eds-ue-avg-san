#!/usr/bin/env bash
# Stop the AEM Author quickstart started by aem-author-start.sh.
#
# Requires AEM_CLOUD_DIR (same as start). Falls back to a port-based
# kill on :4502 if the quickstart's stop script can't be found.
set -u
set -o pipefail

PORT=4502

kill_by_port() {
    local PID
    PID=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
    if [ -z "${PID:-}" ]; then
        echo "AEM Author not running on :$PORT."
        return 0
    fi
    echo "Falling back to kill-by-port (PID $PID)..."
    kill -TERM "$PID" 2>/dev/null
    for _ in $(seq 1 60); do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            echo "  stopped."
            return 0
        fi
        sleep 1
    done
    echo "  SIGTERM didn't take, sending SIGKILL..."
    kill -9 "$PID" 2>/dev/null
    echo "  stopped."
}

if [ -z "${AEM_CLOUD_DIR:-}" ]; then
    echo "AEM_CLOUD_DIR not set; using port-based kill on :$PORT." >&2
    kill_by_port
    exit 0
fi

AUTHOR_DIR="$AEM_CLOUD_DIR/author"
STOP="$AUTHOR_DIR/crx-quickstart/bin/stop"

if [ ! -x "$STOP" ]; then
    echo "Cannot find executable $STOP" >&2
    echo "Falling back to port-based kill on :$PORT." >&2
    kill_by_port
    exit 0
fi

cd "$AUTHOR_DIR" || exit 1
bash ./crx-quickstart/bin/stop
