#!/usr/bin/env bash
# gen-tls-certs.sh - Generate the self-signed TLS cert pair used by both
# HTTPS proxies in this stack (cors-pna-proxy on :14502 and
# local-ssl-proxy on :14501).
#
# Idempotent: skips if both key.pem and certificate.pem already exist
# in $LL_DEV_TLS_DIR. Pass --force to regenerate.
#
# macOS-only (relies on stock /usr/bin/openssl which ships with the OS).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

TLS_DIR="${LL_DEV_TLS_DIR:-$REPO/dev/.local}"
KEY="$TLS_DIR/key.pem"
CERT="$TLS_DIR/certificate.pem"

force=0
if [ "${1:-}" = "--force" ]; then force=1; fi

mkdir -p "$TLS_DIR"

if [ "$force" -eq 0 ] && [ -f "$KEY" ] && [ -f "$CERT" ]; then
  echo "certs already exist at $TLS_DIR"
  echo "  key:  $KEY"
  echo "  cert: $CERT"
  echo "  (pass --force to regenerate)"
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl not found on PATH (macOS ships it at /usr/bin/openssl)"
  exit 1
fi

# Both proxies are only ever reached as localhost, so that is all the SAN
# needs. Set DEV_TLS_EXTRA_SAN to append entries when a script must be run
# under a branded origin instead (a DNS wildcard matches exactly one label,
# so add both *.example.com and *.local.example.com if you need two levels):
#   DEV_TLS_EXTRA_SAN='DNS:*.avg.com,DNS:*.local.avg.com' bash gen-tls-certs.sh --force
SAN="subjectAltName=DNS:localhost,IP:127.0.0.1${DEV_TLS_EXTRA_SAN:+,$DEV_TLS_EXTRA_SAN}"

openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
  -keyout "$KEY" -out "$CERT" \
  -subj '/CN=localhost' \
  -addext "$SAN" \
  -addext 'basicConstraints=CA:FALSE' \
  -addext 'keyUsage=digitalSignature,keyEncipherment' \
  -addext 'extendedKeyUsage=serverAuth' \
  >/dev/null 2>&1

chmod 600 "$KEY"

echo "generated self-signed TLS cert pair (825 days)"
echo "  key:  $KEY"
echo "  cert: $CERT"
echo "  SAN:  ${SAN#subjectAltName=}"
