# Universal Editor local setup

Source of truth for the local AEM-EDS-UE stack in this project: the five
components, the ports they bind, and the canvas URL. The
`lledsue-local-stack` skill orchestrates them; this doc records the fixed
values it relies on. Per-developer paths live in
`tmp-workspace/local-stack.config.json` (gitignored) and are never committed.

## Project coordinates

| | |
|---|---|
| GitHub owner / repo | `santhoshkumarsrg` / `eds-ue-avg-san` |
| Cloud author | `https://author-p149556-e1749225.adobeaemcloud.com` |
| IMS org segment | `@symantec` (program `p149556`) |
| AEM content root | `/content/eds-ue-avg-san` |
| Preview / live | `https://main--eds-ue-avg-san--santhoshkumarsrg.aem.page` / `.aem.live` |

`fstab.yaml` mounts `/` from the cloud author's `franklin.delivery` endpoint,
so `aem up` serves **this repo's code** against **cloud author content**.

## The five components

Start in this order; stop in reverse.

| # | Component | Port | Depends on | What it is |
|---|---|---|---|---|
| 1 | `aemAuthor` | 4502 | – | AEM author from the Cloud SDK quickstart |
| 2 | `corsProxy` | 14502 | `aemAuthor` | HTTPS in front of Author so the editor can reach it under TLS |
| 2 | `ues` | 14500 | – | Universal Editor Service (independent) |
| 3 | `edsUp` | 4501 | `corsProxy` | `aem up` serving EDS code from this checkout |
| 4 | `sslProxy` | 14501 | `edsUp` | HTTPS in front of `aem up` so the canvas can iframe it |

`ues` has no upstream and may start alongside `corsProxy`.

## One-time machine setup

```bash
bash dev/bin/bootstrap-prereqs.sh
```

Idempotent. Installs Java 21 (and registers it for `java_home`), the `aem` and
`local-ssl-proxy` CLIs, this repo's `node_modules`, the self-signed certs in
`dev/.local/`, and the corporate CA bundle at `~/.certs/corp-ca-bundle.pem`
exported as `NODE_EXTRA_CA_CERTS`. Open a new terminal afterwards so that
export is in your environment.

It deliberately does **not** install the Universal Editor Service, which Adobe
distributes separately — see [Universal Editor Service](#universal-editor-service).

`http-proxy` is a declared devDependency because `dev/bin/cors-pna-proxy.cjs`
imports it; `npm install` is enough to satisfy it.

## AEM OSGi configuration for the editor

```bash
bash dev/bin/aem-configure-ue-local.sh
```

Applies the two tweaks the editor needs, both idempotent, and **re-run this
after every content import from the cloud author** because an import
overwrites them:

1. A Granite CORS policy (named factory instance `~edsueavg`) allowing the
   editor SPA origins and the local proxy ports to make credentialed
   cross-origin requests.
2. Appends `https://.*\.adobeaemcloud\.com:443` to the Sling Referrer Filter
   allow-list. The imported PROD config allow-lists `*.adobe.com` but not
   `*.adobeaemcloud.com`, which is where the editor SPA actually runs, so the
   cross-origin login POST to `j_security_check` would otherwise 403.

Override the target with `AEM_AUTHOR`, `AEM_AUTHOR_AUTH`, or `EDITOR_ORIGIN`.

## Canvas URL

Against a **local** author (requires the content tree to exist locally):

```text
https://author-p149556-e1749225.adobeaemcloud.com/ui#/@symantec/aem/universal-editor/canvas/localhost:14502/{contentPath}
```

Against the **cloud** author (no local Author or UES needed):

```text
https://author-p149556-e1749225.adobeaemcloud.com/ui#/@symantec/aem/universal-editor/canvas/author-p149556-e1749225.adobeaemcloud.com/content/eds-ue-avg-san/us/en.html
```

## Universal Editor Service

UES is distributed by Adobe and is not installable from this repo. Once you
have the checkout, set `uesDir` in `tmp-workspace/local-stack.config.json` and
record its start/stop commands:

```json
"ues": {
  "start": "UES_DIR={{uesDir}} bash {{edsRepoDir}}/dev/bin/ues-start.sh",
  "stop":  "bash {{edsRepoDir}}/dev/bin/ues-stop.sh"
}
```

`ues-start.sh` runs UES in the foreground on purpose — the skill's own
daemonizer is the single backgrounding layer.

A local UES only helps when the local author holds this project's content at
`/content/eds-ue-avg-san`. Editing cloud content needs neither.

## TLS certs

`dev/bin/gen-tls-certs.sh` writes a self-signed pair to `dev/.local/`
(gitignored), covering `DNS:localhost` and `IP:127.0.0.1` — all either proxy
needs. To reach the stack under a branded origin instead, append entries and
regenerate (a DNS wildcard matches exactly one label, so add both levels):

```bash
DEV_TLS_EXTRA_SAN='DNS:*.avg.com,DNS:*.local.avg.com' bash dev/bin/gen-tls-certs.sh --force
```

`curl -k` accepts these certs; Chrome will warn, so use a guest profile if you
also browse production.
