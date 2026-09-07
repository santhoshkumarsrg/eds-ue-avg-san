#!/usr/bin/env bash
# Foreground local-ssl-proxy for `aem up` (HTTPS :14501 -> HTTP :4501).
#
# Uses the project's own self-signed certs at dev/.local/. Generate
# them once with dev/bin/gen-tls-certs.sh.
#
# This script intentionally runs local-ssl-proxy in the foreground.
# The lledsue-local-stack skill wraps it in a python3 daemonizer so
# it survives Cursor's Shell tool returning. If invoked directly
# outside the skill, ctrl-C to stop.
set -u
set -o pipefail

SOURCE_PORT=14501
TARGET_PORT=4501

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

CERT="$EDS_REPO/dev/.local/certificate.pem"
KEY="$EDS_REPO/dev/.local/key.pem"
PROXY_BIN=$(command -v local-ssl-proxy)

if [ -z "$PROXY_BIN" ]; then
    echo "local-ssl-proxy not in PATH. Install with: npm i -g local-ssl-proxy" >&2
    exit 1
fi

for f in "$CERT" "$KEY"; do
    if [ ! -f "$f" ]; then
        echo "Missing $f" >&2
        echo "Generate the cert pair with: bash $EDS_REPO/dev/bin/gen-tls-certs.sh" >&2
        exit 1
    fi
done

if lsof -nP -iTCP:"$SOURCE_PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "Port $SOURCE_PORT already in use:" >&2
    lsof -nP -iTCP:"$SOURCE_PORT" -sTCP:LISTEN >&2
    exit 1
fi

if ! lsof -nP -iTCP:"$TARGET_PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "WARNING: nothing is listening on :$TARGET_PORT (aem up). Proxy will start anyway." >&2
fi

exec "$PROXY_BIN" --source "$SOURCE_PORT" --target "$TARGET_PORT" --cert "$CERT" --key "$KEY"
