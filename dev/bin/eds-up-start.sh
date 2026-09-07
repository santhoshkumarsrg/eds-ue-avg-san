#!/usr/bin/env bash
# Foreground `aem up` for an EDS project on :4501.
#
# Resolves the EDS repo in this order:
#   1. $EDS_REPO env var, if set.
#   2. `git rev-parse --show-toplevel` from the current working directory.
#   3. The directory two levels up from this script.
#
# This script intentionally runs `aem up` in the foreground. The
# lledsue-local-stack skill wraps it in a python3 daemonizer so it
# survives Cursor's Shell tool returning. If invoked directly outside
# the skill, ctrl-C to stop.
#
# NODE_TLS_REJECT_UNAUTHORIZED=0 lets aem up tolerate the self-signed
# cert on the cors-pna-proxy at https://localhost:14502 when it fetches
# fstab.yaml.
set -u
set -o pipefail

PORT=4501

if [ -z "${EDS_REPO:-}" ]; then
    if EDS_REPO="$(git rev-parse --show-toplevel 2>/dev/null)" && [ -n "$EDS_REPO" ]; then
        :
    else
        EDS_REPO="$(cd "$(dirname "$0")/../.." && pwd)"
    fi
fi
EDS_REPO="$(cd "$EDS_REPO" 2>/dev/null && pwd)" || {
    echo "EDS repo path is not a directory: $EDS_REPO" >&2
    exit 1
}

AEM_CLI=$(command -v aem)
if [ -z "$AEM_CLI" ]; then
    echo "aem not in PATH. Install with: npm i -g @adobe/aem-cli" >&2
    exit 1
fi

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "Port $PORT already in use:" >&2
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >&2
    exit 1
fi

cd "$EDS_REPO" || exit 1

export NODE_TLS_REJECT_UNAUTHORIZED=0
exec "$AEM_CLI" up --no-open --port "$PORT"
