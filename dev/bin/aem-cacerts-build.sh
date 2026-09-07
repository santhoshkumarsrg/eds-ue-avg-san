#!/usr/bin/env bash
# Build the AEM Author JVM truststore at $AEM_CLOUD_DIR/aem-cacerts.
#
# Why this exists:
#   AEM Author renders EDS pages by having the franklin bundle fetch the
#   "code bus" over HTTPS. Two of those targets present certs the stock JDK
#   cacerts does not trust:
#     * the cloud preview (https://<ref>--<repo>--<owner>.aem.page) - on the
#       Gen Digital fleet it is re-signed by the NortonLifeLock / Zscaler
#       inspection proxy, whose private root is not in the Mozilla set.
#     * the local-ssl-proxy (https://localhost:14501) - a self-signed cert
#       from dev/.local/certificate.pem.
#   Without a truststore that trusts both, franklin throws
#   `PKIX path building failed` and the page renders blank.
#
#   dev/bin/aem-author-start.sh injects this file via
#   -Djavax.net.ssl.trustStore=$AEM_CLOUD_DIR/aem-cacerts (storepass changeit)
#   ONLY if it exists, so run this once, then (re)start AEM Author.
#
# What it does (idempotent; pass --force to rebuild):
#   1. Seeds from the Java 21 JDK cacerts so all public roots stay trusted.
#   2. Imports every corporate root/intermediate from the corp CA bundle
#      (~/.certs/corp-ca-bundle.pem, see dev/bin/corp-ca-bundle.sh).
#   3. Imports the repo's local-ssl-proxy cert (dev/.local/certificate.pem)
#      as alias `localhost-eds` so https://localhost:14501 also validates.
#
# Requires AEM_CLOUD_DIR (same as aem-author-start.sh). macOS/Linux.
#
# Overridable via env:
#   AEM_CLOUD_DIR        (required - parent of author/)
#   LL_CORP_CA_BUNDLE    (default ~/.certs/corp-ca-bundle.pem)
#   EDS_REPO             (default: git rev-parse, then two dirs up)
set -u
set -o pipefail

if [ -z "${AEM_CLOUD_DIR:-}" ]; then
    echo "AEM_CLOUD_DIR is required (parent of author/)." >&2
    echo "  e.g. AEM_CLOUD_DIR=\$HOME/Desktop/aem/cloud bash $0" >&2
    exit 1
fi

force=0
[ "${1:-}" = "--force" ] && force=1

DEST="$AEM_CLOUD_DIR/aem-cacerts"
STOREPASS="changeit"
BUNDLE="${LL_CORP_CA_BUNDLE:-$HOME/.certs/corp-ca-bundle.pem}"

# Resolve the EDS repo (for dev/.local/certificate.pem).
if [ -z "${EDS_REPO:-}" ]; then
    if EDS_REPO="$(git rev-parse --show-toplevel 2>/dev/null)" && [ -n "$EDS_REPO" ]; then
        :
    else
        EDS_REPO="$(cd "$(dirname "$0")/../.." && pwd)"
    fi
fi
PROXY_CERT="$EDS_REPO/dev/.local/certificate.pem"

# Find Java 21 (mirror aem-author-start.sh).
JAVA_21_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
if [ -z "$JAVA_21_HOME" ] || [ ! -x "$JAVA_21_HOME/bin/java" ]; then
    for CANDIDATE in \
        "$(command -v brew >/dev/null 2>&1 && brew --prefix openjdk@21 2>/dev/null)/libexec/openjdk.jdk/Contents/Home" \
        "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
        "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
        "/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"; do
        if [ -x "$CANDIDATE/bin/java" ]; then JAVA_21_HOME="$CANDIDATE"; break; fi
    done
fi
KEYTOOL="$JAVA_21_HOME/bin/keytool"
SRC_CACERTS="$JAVA_21_HOME/lib/security/cacerts"
if [ ! -x "$KEYTOOL" ] || [ ! -f "$SRC_CACERTS" ]; then
    echo "Cannot find Java 21 keytool / cacerts under: ${JAVA_21_HOME:-<unset>}" >&2
    echo "  Install JDK 21 (bash dev/bin/bootstrap-prereqs.sh) and retry." >&2
    exit 1
fi

if [ -f "$DEST" ] && [ "$force" -eq 0 ]; then
    echo "Truststore already exists: $DEST"
    echo "  (pass --force to rebuild)"
    "$KEYTOOL" -list -keystore "$DEST" -storepass "$STOREPASS" 2>/dev/null \
        | grep -c "trustedCertEntry" | sed 's/^/  entries: /'
    exit 0
fi

echo "=== aem-cacerts-build ==="
echo "  dest      : $DEST"
echo "  seed from : $SRC_CACERTS"
echo "  corp bundle: $BUNDLE"
echo "  proxy cert : $PROXY_CERT"

# 1. Seed from the JDK truststore (keeps every public root).
cp "$SRC_CACERTS" "$DEST"
chmod u+w "$DEST"

# 2. Import each corporate cert from the PEM bundle.
if [ -f "$BUNDLE" ]; then
    TMP="$(mktemp -d)"
    # Split the multi-cert PEM into one file per certificate.
    awk -v d="$TMP" 'BEGIN{n=0} /-----BEGIN CERTIFICATE-----/{n++} {print > (d "/c" n ".pem")}' "$BUNDLE"
    IMPORTED=0
    for c in "$TMP"/c*.pem; do
        [ -s "$c" ] || continue
        ALIAS="corp-$(basename "$c" .pem)"
        if "$KEYTOOL" -importcert -noprompt -trustcacerts \
                -alias "$ALIAS" -file "$c" \
                -keystore "$DEST" -storepass "$STOREPASS" >/dev/null 2>&1; then
            IMPORTED=$((IMPORTED+1))
        fi
    done
    rm -rf "$TMP"
    echo "  imported $IMPORTED corporate cert(s) from bundle"
else
    echo "  WARN: corp CA bundle not found at $BUNDLE - skipping." >&2
    echo "        Run dev/bin/corp-ca-bundle.sh first if you need the cloud preview." >&2
fi

# 3. Import the local-ssl-proxy cert so https://localhost:14501 validates.
if [ -f "$PROXY_CERT" ]; then
    "$KEYTOOL" -delete -alias localhost-eds -keystore "$DEST" -storepass "$STOREPASS" >/dev/null 2>&1 || true
    if "$KEYTOOL" -importcert -noprompt -trustcacerts \
            -alias localhost-eds -file "$PROXY_CERT" \
            -keystore "$DEST" -storepass "$STOREPASS" >/dev/null 2>&1; then
        echo "  imported localhost-eds proxy cert"
    else
        echo "  WARN: failed to import $PROXY_CERT" >&2
    fi
else
    echo "  WARN: proxy cert not found at $PROXY_CERT - skipping localhost-eds." >&2
fi

TOTAL=$("$KEYTOOL" -list -keystore "$DEST" -storepass "$STOREPASS" 2>/dev/null | grep -c "trustedCertEntry")
echo "  total trusted entries: $TOTAL"
echo
echo "Done. (Re)start AEM Author so the JVM picks up the truststore:"
echo "  use the lledsue-local-stack skill (restart aemAuthor), or:"
echo "  AEM_CLOUD_DIR=$AEM_CLOUD_DIR bash dev/bin/aem-author-stop.sh && \\"
echo "  AEM_CLOUD_DIR=$AEM_CLOUD_DIR bash dev/bin/aem-author-start.sh"
