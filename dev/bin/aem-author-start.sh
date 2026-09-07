#!/usr/bin/env bash
# Start AEM Author (Cloud SDK quickstart) on :4502.
#
# Requires AEM_CLOUD_DIR - the directory containing the author/ folder
# from the unpacked AEM Cloud SDK quickstart JAR. Set it in
# tmp-workspace/local-stack.config.json (per-developer, gitignored) or
# pass it inline:
#
#   AEM_CLOUD_DIR=/path/to/aem/cloud bash dev/bin/aem-author-start.sh
#
# This script does NOT live inside the AEM Cloud SDK directory and
# never modifies anything under it. It only invokes the dev's own
# crx-quickstart/bin/start, after applying the four pieces of setup
# that AEM Cloud SDK 2026.x needs but the stock bin/start does not do
# itself:
#
#   1. PIN JAVA 21. crx-quickstart/bin/start resolves the bare command
#      `java` against $PATH (it does NOT honour $JAVA_HOME). If $PATH
#      starts with Java 11 (a common macOS default), 294+ bundles fail
#      OSGi resolution with `osgi.ee; (&(osgi.ee=JavaSE)(version=17))`
#      because Java 11 cannot advertise osgi.ee >= 17. We prepend
#      $JAVA_21_HOME/bin to $PATH so bin/start picks the right JDK.
#      Detection mirrors aem-cloud-setup.sh: /usr/libexec/java_home -v 21
#      with a fallback to /Library/Java/JavaVirtualMachines/jdk-21.jdk.
#
#   2. SYMLINK THE PERSISTENT JCR. On first start the SDK creates a
#      brand-new repository under crx-quickstart/repository/. To keep
#      content alive across SDK upgrades we move it once to
#      $AEM_CLOUD_DIR/repository/author/ and replace the in-tree dir
#      with a symlink. The block below is idempotent: it only acts on
#      the rare path where the symlink is missing.
#
#   3. CANONICAL CQ_PORT / CQ_RUNMODE. The stock bin/start template
#      defaults to CQ_PORT=4502 / CQ_RUNMODE=author, which happens to
#      match Author. Setting them explicitly here makes the intent
#      visible and prevents a future Publisher binary unpacked next to
#      this one from silently launching a second Author on :4502.
#
#   4. TRUSTSTORE. If $AEM_CLOUD_DIR/aem-cacerts exists (a user-owned
#      truststore with corporate roots, see aem-cloud-setup.sh) we
#      inject it via CQ_JVM_OPTS so outbound HTTPS to *.aem.page
#      survives Zscaler / TLS-interception.
set -u
set -o pipefail

if [ -z "${AEM_CLOUD_DIR:-}" ]; then
    echo "AEM_CLOUD_DIR is required." >&2
    echo "  e.g. AEM_CLOUD_DIR=\$HOME/codes/aem/cloud bash $0" >&2
    exit 1
fi

AUTHOR_DIR="$AEM_CLOUD_DIR/author"
START="$AUTHOR_DIR/crx-quickstart/bin/start"
STORAGE_DIR="$AEM_CLOUD_DIR/repository"
AUTHOR_REPO_DIR="$STORAGE_DIR/author"

if [ ! -x "$START" ]; then
    echo "Cannot find executable $START" >&2
    echo "Is the AEM Cloud SDK author quickstart unpacked at $AUTHOR_DIR ?" >&2
    exit 1
fi

JAVA_21_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
if [ -z "$JAVA_21_HOME" ] || [ ! -x "$JAVA_21_HOME/bin/java" ]; then
    # Homebrew's openjdk@21 is keg-only and is NOT registered with
    # /usr/libexec/java_home, so fall back to its standard locations
    # (Apple Silicon /opt/homebrew, Intel /usr/local). Run
    # dev/bin/bootstrap-prereqs.sh to symlink it permanently.
    for CANDIDATE in \
        "$(command -v brew >/dev/null 2>&1 && brew --prefix openjdk@21 2>/dev/null)/libexec/openjdk.jdk/Contents/Home" \
        "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
        "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
        "/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"; do
        if [ -x "$CANDIDATE/bin/java" ]; then
            JAVA_21_HOME="$CANDIDATE"
            break
        fi
    done
fi
if [ ! -x "$JAVA_21_HOME/bin/java" ]; then
    echo "Cannot find a Java 21 installation." >&2
    echo "  /usr/libexec/java_home -v 21 returned: $(/usr/libexec/java_home -v 21 2>&1)" >&2
    echo "  Install JDK 21 and register it by running: bash dev/bin/bootstrap-prereqs.sh" >&2
    echo "  (or: brew install openjdk@21)." >&2
    exit 1
fi
export JAVA_HOME="$JAVA_21_HOME"
export PATH="$JAVA_21_HOME/bin:$PATH"

CRX_REPO="$AUTHOR_DIR/crx-quickstart/repository"
if [ -d "$AUTHOR_DIR/crx-quickstart" ] && [ ! -L "$CRX_REPO" ] && [ -d "$CRX_REPO" ]; then
    mkdir -p "$AUTHOR_REPO_DIR"
    if [ ! -d "$AUTHOR_REPO_DIR/segmentstore" ]; then
        echo "Moving Author repository to persistent storage at $AUTHOR_REPO_DIR..." >&2
        mv "$CRX_REPO"/* "$AUTHOR_REPO_DIR/" 2>/dev/null || true
    else
        echo "Persistent storage already populated at $AUTHOR_REPO_DIR; replacing in-tree dir with a symlink." >&2
    fi
    rm -rf "$CRX_REPO"
    ln -s "$AUTHOR_REPO_DIR" "$CRX_REPO"
fi

if [ -f "$AEM_CLOUD_DIR/aem-cacerts" ]; then
    AEM_TLS_OPTS="-Djavax.net.ssl.trustStore=$AEM_CLOUD_DIR/aem-cacerts -Djavax.net.ssl.trustStorePassword=changeit"
    export CQ_JVM_OPTS="${CQ_JVM_OPTS:-} $AEM_TLS_OPTS"
fi

cd "$AUTHOR_DIR" || exit 1
exec env CQ_PORT=4502 CQ_RUNMODE=author bash ./crx-quickstart/bin/start
