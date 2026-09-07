#!/usr/bin/env bash
# corp-ca-bundle.sh - Export the machine's trusted CA roots/intermediates to a
# single PEM bundle so Node/npm (and any other tool that reads
# NODE_EXTRA_CA_CERTS) trust the corporate TLS-interception proxy.
#
# Why this exists:
#   Gen Digital laptops route all HTTPS through a Zscaler / NortonLifeLock
#   inspection proxy. The proxy re-signs every certificate with an internal
#   root - on this fleet the chain is:
#       leaf (*.github.com, re-signed)
#         -> zia.gendigital.com
#         -> NortonLifeLock Inc. Private SSL Inspection ICA
#         -> NortonLifeLock Inc. Private Root CA - GCS   <-- the real root
#   Node ships only the Mozilla root set, so it rejects these with
#   `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` and `npm install` fails the moment it
#   fetches anything from an intercepted host (e.g. the eslint-plugin-xwalk
#   tarball from codeload.github.com). Exporting the System keychain - which
#   DOES contain the corporate roots - into a PEM and pointing
#   NODE_EXTRA_CA_CERTS at it fixes every Node tool at once without disabling
#   TLS verification (never use `npm config set strict-ssl false`).
#
# Idempotent: writes $LL_CORP_CA_BUNDLE (default ~/.certs/corp-ca-bundle.pem).
# Pass --force to overwrite an existing bundle. macOS only (uses `security`).
#
# Usage:
#   bash dev/bin/corp-ca-bundle.sh            # create if missing
#   bash dev/bin/corp-ca-bundle.sh --force    # regenerate
#
# After running, ensure your shell exports it (bootstrap-prereqs.sh does this
# for you):
#   export NODE_EXTRA_CA_CERTS="$HOME/.certs/corp-ca-bundle.pem"
set -u
set -o pipefail

BUNDLE="${LL_CORP_CA_BUNDLE:-$HOME/.certs/corp-ca-bundle.pem}"

force=0
if [ "${1:-}" = "--force" ]; then force=1; fi

if [ "$(uname -s)" != "Darwin" ]; then
    echo "corp-ca-bundle.sh currently supports macOS only (uses /usr/bin/security)." >&2
    echo "On Linux, point NODE_EXTRA_CA_CERTS at your distro's corporate CA bundle." >&2
    exit 1
fi

if [ "$force" -eq 0 ] && [ -f "$BUNDLE" ]; then
    echo "corp CA bundle already exists: $BUNDLE"
    echo "  (pass --force to regenerate)"
    exit 0
fi

mkdir -p "$(dirname "$BUNDLE")"

# Every cert in the System keychain. This captures the corporate roots and
# intermediates injected by MDM, plus any locally-added trust anchors.
security find-certificate -a -p /Library/Keychains/System.keychain > "$BUNDLE" 2>/dev/null

COUNT=$(grep -c "BEGIN CERTIFICATE" "$BUNDLE" 2>/dev/null || echo 0)
if [ "$COUNT" -eq 0 ]; then
    echo "No certificates exported from the System keychain - bundle is empty." >&2
    rm -f "$BUNDLE"
    exit 1
fi

echo "wrote $COUNT certificates to $BUNDLE"

# Best-effort sanity check: can we now verify an intercepted public host?
if command -v openssl >/dev/null 2>&1; then
    RC=$(echo | openssl s_client -connect codeload.github.com:443 \
            -servername codeload.github.com -CAfile "$BUNDLE" 2>/dev/null \
            | grep -oE 'Verify return code: [0-9]+' | grep -oE '[0-9]+$')
    if [ "${RC:-1}" = "0" ]; then
        echo "verified codeload.github.com chains to a CA in the bundle (ok)"
    else
        echo "note: could not verify codeload.github.com (offline, or not behind the proxy right now)." >&2
    fi
fi

echo
echo "Add this to your shell profile (bootstrap-prereqs.sh does it automatically):"
echo "  export NODE_EXTRA_CA_CERTS=\"$BUNDLE\""
