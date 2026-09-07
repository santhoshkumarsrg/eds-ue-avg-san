#!/usr/bin/env bash
# Re-apply the two AEM OSGi tweaks that Universal Editor local dev needs and
# that a fresh content import from the cloud author OVERWRITES:
#
#   1. A Granite CORS policy allowing the editor SPA origins
#      (cloud author host + experience.adobe.com) and the local proxy ports
#      to make credentialed cross-origin XHRs to AEM at :14502.
#   2. Adding *.adobeaemcloud.com to the Sling Referrer Filter allow-list, so
#      the editor's cross-origin login POST to j_security_check is not rejected
#      with 403 ("Rejected referrer header for POST request"). The imported
#      PROD config allow-lists *.adobe.com but NOT *.adobeaemcloud.com, which is
#      where the editor SPA actually runs.
#
# Both operations are idempotent:
#   - The CORS policy is a NAMED factory instance (~edsueavg), so a re-run
#     upserts it in place rather than stacking duplicates.
#   - The Referrer Filter patch reads the CURRENT allow.hosts / allow.hosts.regexp
#     and only appends the adobeaemcloud entry when it is missing, preserving
#     every existing entry (so it survives prod configs that change the list).
#
# Talks only to the local AEM Author. Nothing here is per-developer; the only
# project-specific value is the cloud author origin, overridable via env:
#   AEM_AUTHOR       (default http://localhost:4502)
#   AEM_AUTHOR_AUTH  (default admin:admin)
#   EDITOR_ORIGIN    (default https://author-p149556-e1749225.adobeaemcloud.com)
#
# Run once after every content import (and it is safe to re-run anytime):
#   bash dev/bin/aem-configure-ue-local.sh
set -u
set -o pipefail

AEM_AUTHOR="${AEM_AUTHOR:-http://localhost:4502}"
AEM_AUTHOR_AUTH="${AEM_AUTHOR_AUTH:-admin:admin}"
EDITOR_ORIGIN="${EDITOR_ORIGIN:-https://author-p149556-e1749225.adobeaemcloud.com}"

CORS_PID="com.adobe.granite.cors.impl.CORSPolicyImpl~edsueavg"
REFERRER_PID="org.apache.sling.security.impl.ReferrerFilter"
AEMCLOUD_REGEXP='https://.*\.adobeaemcloud\.com:443'

au() { curl -s -u "$AEM_AUTHOR_AUTH" "$@"; }
trim() { sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }

echo "=== aem-configure-ue-local ==="
echo "  author        : $AEM_AUTHOR"
echo "  editor origin : $EDITOR_ORIGIN"

# 0. AEM Author reachable? (a down author just yields curl "000")
PING=$(au -o /dev/null -w '%{http_code}' "$AEM_AUTHOR/libs/granite/core/content/login.html" --max-time 10 2>/dev/null)
case "$PING" in
    2*|3*|401) ;;
    *) echo "ERROR: AEM Author not reachable at $AEM_AUTHOR (HTTP ${PING:-000})." >&2
       echo "  Start it first (lledsue-local-stack skill, or dev/bin/aem-author-start.sh)." >&2
       exit 1 ;;
esac

# 1. Granite CORS policy (named factory instance = idempotent upsert).
echo "--- 1/2 Granite CORS policy ($CORS_PID) ---"
CODE=$(au -o /dev/null -w '%{http_code}' -X POST "$AEM_AUTHOR/system/console/configMgr/$CORS_PID" \
    --data-urlencode "apply=true" \
    --data-urlencode "factoryPid=com.adobe.granite.cors.impl.CORSPolicyImpl" \
    --data-urlencode "alloworigin=$EDITOR_ORIGIN" \
    --data-urlencode "alloworigin=https://experience.adobe.com" \
    --data-urlencode "alloworigin=http://localhost:4501" \
    --data-urlencode "alloworigin=https://localhost:14501" \
    --data-urlencode "alloworigin=https://localhost:14500" \
    --data-urlencode "alloworiginregexp=" \
    --data-urlencode "supportscredentials=true" \
    --data-urlencode "maxage=1800" \
    --data-urlencode "exposedheaders=Location" \
    --data-urlencode "supportedheaders=Authorization" \
    --data-urlencode "supportedheaders=Origin" \
    --data-urlencode "supportedheaders=Accept" \
    --data-urlencode "supportedheaders=X-Requested-With" \
    --data-urlencode "supportedheaders=Content-Type" \
    --data-urlencode "supportedheaders=Access-Control-Request-Method" \
    --data-urlencode "supportedheaders=Access-Control-Request-Headers" \
    --data-urlencode "supportedmethods=GET" \
    --data-urlencode "supportedmethods=HEAD" \
    --data-urlencode "supportedmethods=POST" \
    --data-urlencode "supportedmethods=PUT" \
    --data-urlencode "supportedmethods=DELETE" \
    --data-urlencode "supportedmethods=OPTIONS" \
    --data-urlencode "supportedmethods=PATCH" \
    --data-urlencode "propertylist=alloworigin,alloworiginregexp,supportscredentials,maxage,exposedheaders,supportedheaders,supportedmethods" \
    --max-time 15)
case "$CODE" in
    2*|3*) echo "  upsert -> HTTP $CODE (ok)" ;;
    *)     echo "  WARN: CORS POST returned HTTP ${CODE:-000}" >&2 ;;
esac

# 2. Sling Referrer Filter: append *.adobeaemcloud.com if missing.
echo "--- 2/2 Sling Referrer Filter ($REFERRER_PID) ---"
BLOCK=$(au "$AEM_AUTHOR/system/console/status-Configurations.txt" --max-time 20 \
    | grep -A6 "PID = $REFERRER_PID")
REGEXP_LINE=$(printf '%s\n' "$BLOCK" | grep 'allow.hosts.regexp')
HOSTS_LINE=$(printf '%s\n' "$BLOCK" | grep 'allow.hosts =')

if [ -z "$REGEXP_LINE" ] && [ -z "$HOSTS_LINE" ]; then
    echo "  WARN: could not read current ReferrerFilter config - skipping (verify manually)." >&2
elif printf '%s' "$REGEXP_LINE" | grep -q 'adobeaemcloud'; then
    echo "  *.adobeaemcloud.com already allow-listed - nothing to do"
else
    ENTRIES=$(printf '%s' "$REGEXP_LINE" | sed -E 's/.*\[(.*)\].*/\1/')
    HOSTS=$(printf '%s' "$HOSTS_LINE"   | sed -E 's/.*\[(.*)\].*/\1/')
    ARGS=(--data-urlencode "apply=true" --data-urlencode "allow.empty=true")
    # Split on newlines rather than `read -ra`: on a clean local SDK the
    # allow.hosts list is empty, which leaves the target array *unset* and
    # trips `set -u` on "${ARR[@]}" (bash 3.2, the macOS default, errors even
    # for a declared-but-empty array). The -n guard skips the empty line.
    while IFS= read -r h; do
        h=$(printf '%s' "$h" | trim); [ -n "$h" ] && ARGS+=(--data-urlencode "allow.hosts=$h")
    done <<< "$(printf '%s' "$HOSTS" | tr ',' '\n')"
    while IFS= read -r r; do
        r=$(printf '%s' "$r" | trim); [ -n "$r" ] && ARGS+=(--data-urlencode "allow.hosts.regexp=$r")
    done <<< "$(printf '%s' "$ENTRIES" | tr ',' '\n')"
    ARGS+=(--data-urlencode "allow.hosts.regexp=$AEMCLOUD_REGEXP")
    ARGS+=(--data-urlencode "propertylist=allow.empty,allow.hosts,allow.hosts.regexp")
    CODE=$(au -o /dev/null -w '%{http_code}' -X POST "$AEM_AUTHOR/system/console/configMgr/$REFERRER_PID" "${ARGS[@]}" --max-time 15)
    case "$CODE" in
        2*|3*) echo "  appended $AEMCLOUD_REGEXP -> HTTP $CODE (ok)" ;;
        *)     echo "  WARN: ReferrerFilter POST returned HTTP ${CODE:-000}" >&2 ;;
    esac
fi

# 3. Verify.
echo "--- verify ---"
au "$AEM_AUTHOR/system/console/status-Configurations.txt" --max-time 20 \
    | grep -A4 "PID = $REFERRER_PID" | grep 'allow.hosts.regexp' | sed 's/^/  referrer: /'
au "$AEM_AUTHOR/system/console/status-Configurations.txt" --max-time 20 \
    | grep -A20 "CORSPolicyImpl" | grep -o 'localhost:1450[01]' | sort -u | sed 's/^/  cors origin: /'
echo "done."
