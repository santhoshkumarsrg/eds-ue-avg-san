#!/usr/bin/env bash
# Foreground Universal Editor Service on :14500.
#
# Requires UES_DIR - the directory containing the user's
# universal-editor-service checkout (the one that holds .env,
# universal-editor-service.cjs, certificate.pem, key.pem, and
# node_modules/). Set it in tmp-workspace/local-stack.config.json
# (per-developer, gitignored) or pass it inline:
#
#   UES_DIR=/path/to/universal-editor-service bash dev/bin/ues-start.sh
#
# This script does NOT live inside the UES checkout and never modifies
# anything under it. It only cd's into UES_DIR and exec's node on the
# .cjs entry point - same way the upstream start.sh does, minus the
# spawn.py daemonizer (the lledsue-local-stack skill wraps every start
# command in its own python3 daemonizer, so adding another layer here
# just makes the process tree harder to clean up).
#
# Why a wrapper instead of `bash {{uesDir}}/start.sh`:
#   - Foreground exec means the skill's daemonizer is the single source
#     of process backgrounding (one PID, one logfile, one stop path).
#   - The Node 20 / port-conflict / .env preflight checks live in this
#     repo so they evolve alongside our other portable scripts.
#   - The dev points UES_DIR at their checkout once and never thinks
#     about start.sh / stop.sh shape changes upstream again.
set -u
set -o pipefail

PORT=14500

if [ -z "${UES_DIR:-}" ]; then
    echo "UES_DIR is required." >&2
    echo "  e.g. UES_DIR=\$HOME/codes/aem/cloud/universal-editor-service bash $0" >&2
    exit 1
fi

UES_DIR="$(cd "$UES_DIR" 2>/dev/null && pwd)" || {
    echo "UES_DIR is not a directory: $UES_DIR" >&2
    exit 1
}

ENTRY="$UES_DIR/universal-editor-service.cjs"
if [ ! -f "$ENTRY" ]; then
    echo "Cannot find $ENTRY" >&2
    echo "Is the universal-editor-service checkout at $UES_DIR ?" >&2
    exit 1
fi

if [ ! -d "$UES_DIR/node_modules" ]; then
    echo "Missing $UES_DIR/node_modules" >&2
    echo "Run 'npm install' in $UES_DIR first." >&2
    exit 1
fi

NODE_BIN=$(command -v node)
if [ -z "$NODE_BIN" ]; then
    echo "node not in PATH. Install Node 20 (Adobe specifies v20 for UES)." >&2
    exit 1
fi

NODE_VER=$("$NODE_BIN" --version)
case "$NODE_VER" in
    v20.*) ;;
    *) echo "WARNING: Adobe specifies Node 20 for UES. Found $NODE_VER." >&2 ;;
esac

if [ -f "$UES_DIR/.env" ]; then
    ENV_PORT=$(grep -E '^UES_PORT=' "$UES_DIR/.env" | cut -d= -f2)
    if [ -n "${ENV_PORT:-}" ] && [ "$ENV_PORT" != "$PORT" ]; then
        echo "WARNING: $UES_DIR/.env sets UES_PORT=$ENV_PORT but the lledsue-local-stack skill expects :$PORT." >&2
        PORT="$ENV_PORT"
    fi
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "Port $PORT already in use:" >&2
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >&2
    exit 1
fi

cd "$UES_DIR" || exit 1
exec "$NODE_BIN" ./universal-editor-service.cjs
