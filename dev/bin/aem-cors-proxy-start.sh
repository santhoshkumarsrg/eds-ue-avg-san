#!/usr/bin/env bash
# Foreground cors-pna-proxy in front of AEM Author (HTTPS :14502 -> HTTP :4502).
#
# Wraps the vendored proxy at dev/bin/cors-pna-proxy.cjs. Uses the
# project's own self-signed certs at dev/.local/. Generate them once
# with dev/bin/gen-tls-certs.sh.
#
# This is the AEM-side counterpart to dev/bin/eds-ssl-proxy-start.sh
# (which terminates HTTPS in front of `aem up` :4501). It exists so the
# Adobe-hosted Universal Editor (which only accepts https:// upstreams
# and enforces Private Network Access) can iframe a localhost AEM Author.
#
# This script intentionally runs node in the foreground. The
# lledsue-local-stack skill wraps it in a python3 daemonizer so it
# survives Cursor's Shell tool returning. If invoked directly outside
# the skill, ctrl-C to stop.
#
# The proxy needs `http-proxy` from the EDS repo's node_modules; we cd
# into the repo so node's resolver finds it via package.json.
set -u
set -o pipefail

SOURCE_PORT=14502
TARGET_PORT=4502

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

PROXY_JS="$EDS_REPO/dev/bin/cors-pna-proxy.cjs"
CERT="$EDS_REPO/dev/.local/certificate.pem"
KEY="$EDS_REPO/dev/.local/key.pem"
NODE_BIN=$(command -v node)

if [ ! -f "$PROXY_JS" ]; then
    echo "Missing vendored proxy at $PROXY_JS" >&2
    exit 1
fi

if [ -z "$NODE_BIN" ]; then
    echo "node not in PATH. Install Node 20." >&2
    exit 1
fi

NODE_VER=$("$NODE_BIN" --version)
case "$NODE_VER" in
    v20.*) ;;
    *) echo "WARNING: Node 20 is recommended for the cors-pna-proxy. Found $NODE_VER." >&2 ;;
esac

for f in "$CERT" "$KEY"; do
    if [ ! -f "$f" ]; then
        echo "Missing $f" >&2
        echo "Generate the cert pair with: bash $EDS_REPO/dev/bin/gen-tls-certs.sh" >&2
        exit 1
    fi
done

if [ ! -d "$EDS_REPO/node_modules/http-proxy" ]; then
    echo "Missing $EDS_REPO/node_modules/http-proxy" >&2
    echo "Run 'npm install' in $EDS_REPO first." >&2
    exit 1
fi

if lsof -nP -iTCP:"$SOURCE_PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "Port $SOURCE_PORT already in use:" >&2
    lsof -nP -iTCP:"$SOURCE_PORT" -sTCP:LISTEN >&2
    exit 1
fi

if ! lsof -nP -iTCP:"$TARGET_PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "WARNING: nothing is listening on :$TARGET_PORT (AEM Author). Proxy will start anyway." >&2
fi

cd "$EDS_REPO" || exit 1
exec "$NODE_BIN" "$PROXY_JS" \
    --source "$SOURCE_PORT" \
    --target "http://localhost:$TARGET_PORT" \
    --cert "$CERT" \
    --key "$KEY"
