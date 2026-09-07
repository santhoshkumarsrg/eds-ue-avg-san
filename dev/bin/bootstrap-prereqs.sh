#!/usr/bin/env bash
# bootstrap-prereqs.sh - One-shot, idempotent setup of everything the local
# AEM-EDS-UE stack needs EXCEPT the Adobe-distributed Universal Editor Service
# and the running services themselves. Safe to re-run; each step no-ops when it
# is already satisfied.
#
# What it does (in order):
#   1. Corporate CA bundle  -> ~/.certs/corp-ca-bundle.pem  (corp-ca-bundle.sh)
#                              + exports NODE_EXTRA_CA_CERTS in your shell rc.
#   2. Java 21 (Temurin/Homebrew) + registers it for /usr/libexec/java_home.
#   3. Global npm CLIs       -> @adobe/aem-cli, local-ssl-proxy.
#   4. Repo dependencies     -> npm install (provides http-proxy for the proxy).
#   5. Self-signed TLS certs -> dev/.local/  (gen-tls-certs.sh).
#
# It does NOT start any service - that is the lledsue-local-stack skill's job.
# It does NOT install or configure UES (Adobe-distributed; see
# docs/universal-editor-local-setup.md).
#
# Usage:
#   bash dev/bin/bootstrap-prereqs.sh
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
RC="${HOME}/.zshrc"   # default macOS login shell
CA_BUNDLE="${LL_CORP_CA_BUNDLE:-$HOME/.certs/corp-ca-bundle.pem}"

note() { printf '\n=== %s ===\n' "$1"; }

if [ "$(uname -s)" != "Darwin" ]; then
    echo "bootstrap-prereqs.sh currently targets macOS. Adapt the steps for Linux." >&2
    exit 1
fi

# --- 1. Corporate CA bundle + NODE_EXTRA_CA_CERTS -------------------------
note "Corporate CA bundle"
bash "$SCRIPT_DIR/corp-ca-bundle.sh" || true
if [ -f "$CA_BUNDLE" ]; then
    export NODE_EXTRA_CA_CERTS="$CA_BUNDLE"
    if [ -f "$RC" ] && grep -q "NODE_EXTRA_CA_CERTS" "$RC"; then
        echo "NODE_EXTRA_CA_CERTS already set in $RC"
    else
        {
            printf '\n# Trust corporate (Zscaler/NortonLifeLock) root CA for Node/npm tooling\n'
            printf 'export NODE_EXTRA_CA_CERTS="%s"\n' "$CA_BUNDLE"
        } >> "$RC"
        echo "appended NODE_EXTRA_CA_CERTS to $RC"
    fi
fi

# --- 2. Java 21 -----------------------------------------------------------
note "Java 21"
JAVA21="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
if [ -n "$JAVA21" ]; then
    echo "Java 21 already visible to java_home: $JAVA21"
else
    if command -v brew >/dev/null 2>&1; then
        if ! brew list openjdk@21 >/dev/null 2>&1; then
            echo "installing openjdk@21 via Homebrew..."
            brew install openjdk@21
        fi
        # Homebrew's openjdk@21 is keg-only and is NOT registered with
        # /usr/libexec/java_home. Symlink it into the per-user JVM dir
        # (java_home scans ~/Library/Java/JavaVirtualMachines too) so the
        # stack's aem-author-start.sh can find it without sudo.
        BREW_JDK="$(brew --prefix openjdk@21 2>/dev/null)/libexec/openjdk.jdk"
        if [ -d "$BREW_JDK" ]; then
            mkdir -p "$HOME/Library/Java/JavaVirtualMachines"
            ln -sfn "$BREW_JDK" "$HOME/Library/Java/JavaVirtualMachines/openjdk-21.jdk"
            echo "symlinked Homebrew JDK 21 into ~/Library/Java/JavaVirtualMachines/"
        fi
        JAVA21="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
        [ -n "$JAVA21" ] && echo "Java 21 now resolves to: $JAVA21" \
            || echo "WARNING: java_home still cannot find Java 21." >&2
    else
        echo "Homebrew not found. Install JDK 21 manually (e.g. Temurin 21) and ensure" >&2
        echo "  /usr/libexec/java_home -v 21  resolves." >&2
    fi
fi

# --- 3. Global npm CLIs ---------------------------------------------------
note "Global npm CLIs (aem-cli, local-ssl-proxy)"
NEED=()
command -v aem >/dev/null 2>&1 || NEED+=("@adobe/aem-cli")
command -v local-ssl-proxy >/dev/null 2>&1 || NEED+=("local-ssl-proxy")
if [ "${#NEED[@]}" -gt 0 ]; then
    echo "installing: ${NEED[*]}"
    npm install -g "${NEED[@]}"
else
    echo "aem-cli and local-ssl-proxy already installed"
fi

# --- 4. Repo dependencies -------------------------------------------------
note "Repo dependencies"
if [ -d "$REPO/node_modules/http-proxy" ]; then
    echo "node_modules already present (http-proxy found)"
else
    echo "running npm install in $REPO ..."
    ( cd "$REPO" && npm install )
fi

# --- 5. TLS certs ---------------------------------------------------------
note "TLS certs for the HTTPS proxies"
bash "$SCRIPT_DIR/gen-tls-certs.sh" || true

# --- Summary --------------------------------------------------------------
note "Summary"
printf '%-22s %s\n' "corp CA bundle:"  "$( [ -f "$CA_BUNDLE" ] && echo "$CA_BUNDLE" || echo MISSING )"
printf '%-22s %s\n' "Java 21:"         "$(/usr/libexec/java_home -v 21 2>/dev/null || echo MISSING)"
printf '%-22s %s\n' "aem cli:"         "$(command -v aem || echo MISSING)"
printf '%-22s %s\n' "local-ssl-proxy:" "$(command -v local-ssl-proxy || echo MISSING)"
printf '%-22s %s\n' "repo http-proxy:" "$( [ -d "$REPO/node_modules/http-proxy" ] && echo present || echo MISSING )"
printf '%-22s %s\n' "tls certs:"       "$( [ -f "$REPO/dev/.local/certificate.pem" ] && echo "dev/.local/ ok" || echo MISSING )"
echo
echo "Prerequisites ready. Next:"
echo "  - Open a NEW terminal (so NODE_EXTRA_CA_CERTS is in your environment), or"
echo "    'source $RC' in this one."
echo "  - Obtain the Universal Editor Service distribution and set 'uesDir' in"
echo "    tmp-workspace/local-stack.config.json (see docs/universal-editor-local-setup.md)."
echo "  - Ask the lledsue-local-stack skill to start the stack."
