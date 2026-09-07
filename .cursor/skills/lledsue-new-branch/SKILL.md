---
name: lledsue-new-branch
description: Start work on a JIRA ticket or an adhoc task - checkout a fresh branch from origin's default branch using the lleds naming convention (`<feature|bugfix|hotfix|patch|spike>/<TICKET>-<slug>`), fetch the JIRA ticket from the self-hosted Jira Data Center REST API using a personal access token (`JIRA_PAT`) (or, for adhoc tickets like `WEBEXP-000`/`WEBEXP-0000`, prompt the developer for requirements), and save the result under `tmp-workspace/<TICKET>/` (adhoc tickets reuse a shared key like `WEBEXP-0000`, so each adhoc task nests under its own branch slug at `tmp-workspace/<TICKET>/<slug>/`). Use when the user asks to start a ticket, create a new branch for a JIRA issue, pick up a ticket, mentions a JIRA key like `ABC-123`, or wants an adhoc branch for ad-hoc/setup/spike work.
---

# lledsue-new-branch

Sets up the local environment to start work on a JIRA ticket or an adhoc task: a clean branch off the remote default branch and a per-ticket scratch folder pre-populated with the ticket data (or developer-provided requirements for adhoc tickets).

## Ticket modes

There are two modes, detected from the ticket number:

| Mode | Pattern | Example | Behavior |
|---|---|---|---|
| **JIRA** | `^[A-Z][A-Z0-9]+-[1-9]\d*$` (any non-zero ticket number) | `WEBEXP-1234`, `ABC-7` | Fetch the ticket from the self-hosted Jira DC REST API using the `JIRA_PAT` token (see [Jira access](#jira-access-self-hosted-dc--pat)) and write `ticket.md` + `ticket.json`. |
| **Adhoc** | `^[A-Z][A-Z0-9]+-0+$` (ticket number is all zeros) | `WEBEXP-000`, `WEBAVAST-0000`, `ABC-00` | Skip the JIRA fetch entirely. Prompt the developer for requirements and write a `ticket.md` based on those answers. No `ticket.json`. |

Adhoc tickets are for project setup, spikes, refactors, tooling work, or anything that doesn't have (or doesn't need) a real JIRA issue.

## Required inputs

- **Ticket key** - e.g. `WEBEXP-1234` (JIRA mode) or `WEBEXP-0000` (adhoc mode). Refuse to proceed without one.
- **Branch type** - one of `feature | bugfix | hotfix | patch | spike`. If the user did not supply it, ask once via `AskQuestion` before doing anything else.

If the user said something ambiguous like "start a new branch for ABC-123" without a type, ask. Do not guess.

## Jira access (self-hosted DC + PAT)

This project's Jira is **self-hosted Jira Data Center** at `https://jira.corp.nortonlifelock.com`, not Atlassian Cloud. Access it via its REST API with a **personal access token (PAT)**, sent as a bearer token.

**Prefer a PAT over the Atlassian Cloud MCP connector.** The bundled `plugin-atlassian-atlassian` MCP is the Atlassian *Cloud* connector; it cannot reach this self-hosted DC instance, and its browser auth flow tends to time out. Do not rely on it for ticket fetches. If a future workspace wires up a real DC MCP (e.g. `user-atlassian-jira-dc`), that is also acceptable, but the PAT path below is the default.

### Token storage convention

The PAT lives in the **`JIRA_PAT` environment variable**, never in a tracked file:

1. **Preferred:** `export JIRA_PAT="…"` in `~/.zshrc` (outside the repo entirely - zero commit risk, available to every terminal). This mirrors how `bootstrap-prereqs.sh` exports `NODE_EXTRA_CA_CERTS`.
2. **In-repo fallback:** `dev/.local/jira.env` as `JIRA_PAT=…`. `dev/.local/` is already gitignored. `source dev/.local/jira.env` before use.

Never paste the PAT into chat, echo it, or write it to a tracked path. A non-interactive agent shell may not have `~/.zshrc` loaded, so `source "$HOME/.zshrc"` (or `source dev/.local/jira.env`) first, then read `$JIRA_PAT`.

### Corporate TLS

The DC host is behind the Gen Digital TLS-inspection proxy, so `curl` needs the corporate CA bundle (the same one `dev/bin/corp-ca-bundle.sh` writes for Node). Pass it with `--cacert "$BUNDLE"` where `BUNDLE="${LL_CORP_CA_BUNDLE:-$HOME/.certs/corp-ca-bundle.pem}"`. Never disable verification (`-k`).

## Workflow

Track progress against this checklist:

```
- [ ] Step 1: Validate inputs (ticket key + branch type) and detect mode
- [ ] Step 2: Sync the default branch
- [ ] Step 3a: JIRA mode - fetch the ticket from the Jira DC REST API (PAT)
- [ ] Step 3b: Adhoc mode - prompt developer for requirements
- [ ] Step 4: Build the branch name
- [ ] Step 5: Create the branch
- [ ] Step 6: Write the workspace folder (JIRA: tmp-workspace/<TICKET>/; adhoc: tmp-workspace/<TICKET>/<slug>/)
- [ ] Step 7: Verify tmp-workspace/ is gitignored
- [ ] Step 8: Confirm to the user
```

### Sandbox policy for git commands

For this skill, **every Shell call that runs any `git ...` command must execute outside the sandbox** with:

- `required_permissions: ["all"]`

This avoids sandbox-specific TLS/cert and process-environment drift that can break `git fetch`, `git pull`, branch checks, and status reads.

Important guardrails:

- Keep using the same git command allowlist/policies already in place - this rule changes execution context only.
- Do **not** use this as a reason to run non-git commands outside sandbox unless they also require it.
- Do **not** disable verification (`-k`, `GIT_SSL_NO_VERIFY`, etc.) to compensate for sandbox TLS issues.

### Step 1: Validate inputs and detect mode

- Ticket key must match `^[A-Z][A-Z0-9]+-\d+$` - uppercase project key, dash, ticket number.
- **Detect mode**:
  - If the ticket number is all zeros (`-0+$`, e.g. `-0`, `-00`, `-000`, `-0000`) -> **adhoc mode**.
  - Otherwise -> **JIRA mode**.
- Branch type must be one of `feature`, `bugfix`, `hotfix`, `patch`, `spike`.
- Working tree should be clean. If `git status --porcelain` returns anything, stop and tell the user to commit or stash before continuing.

### Step 2: Sync the default branch

```bash
git fetch origin
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@')
git switch "$DEFAULT"
git pull --ff-only
```

If `git symbolic-ref` fails (no `origin/HEAD`), run `git remote set-head origin --auto` once and retry.

### Step 3a: JIRA mode - fetch the ticket from the Jira DC REST API

Skip this step if the ticket is adhoc (Step 3b instead).

Fetch the issue from the self-hosted Jira DC REST API with the `JIRA_PAT` bearer token (see [Jira access](#jira-access-self-hosted-dc--pat)). Save the raw payload straight to `tmp-workspace/<TICKET>/ticket.json` so the token never lands in shell output:

```bash
source "$HOME/.zshrc" >/dev/null 2>&1            # or: source dev/.local/jira.env
[ -n "${JIRA_PAT:-}" ] || { echo "JIRA_PAT not set - see Jira access section"; exit 1; }
BUNDLE="${LL_CORP_CA_BUNDLE:-$HOME/.certs/corp-ca-bundle.pem}"
mkdir -p "tmp-workspace/<TICKET>"
curl -sS --cacert "$BUNDLE" -H "Authorization: Bearer $JIRA_PAT" \
  "https://jira.corp.nortonlifelock.com/rest/api/2/issue/<TICKET>?expand=names" \
  -o "tmp-workspace/<TICKET>/ticket.json" -w "HTTP %{http_code}\n"
```

Confirm `HTTP 200`. On `401`/`403` the token is missing/expired/unauthorized - tell the user to refresh `JIRA_PAT` and retry once; do **not** create the branch on failure. On `404` the key is wrong or you lack project access. If `curl` reports an SSL/cert error, the CA bundle is missing - run `bash dev/bin/corp-ca-bundle.sh`.

Parse the saved JSON (don't re-fetch). The summary used in Step 4 comes from `fields.summary`.

### Step 3b: Adhoc mode - prompt developer for requirements

Skip this step if the ticket is JIRA (Step 3a instead).

Adhoc tickets have no JIRA record. Prompt the developer via `AskQuestion` for the inputs needed to drive the branch slug and the local `ticket.md`. Ask them in one batch:

- **Title** (required) - a one-line summary, used to slugify the branch and as the H1 of `ticket.md`. Aim for <60 chars.
- **Description** (required) - a short paragraph describing what the work is and why. Multi-line is fine.
- **Acceptance criteria** (optional but recommended) - bullet list of done conditions.
- **Notes** (optional) - links, references, or anything else.

If the developer provides the title in the original message (e.g. "start an adhoc branch for project setup, title: Set up lleds skills"), use that and only prompt for the missing fields. Refuse to proceed without at least a title.

The summary used in Step 4 comes from the title the developer just provided.

### Step 4: Build the branch name (with DNS label budget)

The branch must produce a feature-preview hostname that respects DNS's 63-character label limit (RFC 1035):

```
https://<safe-branch>--<repo>--<owner>.aem.page/
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^ this whole label must be <= 63 chars
```

`<safe-branch>` is `<type>-<ticket-lower>-<slug>` (lowercase, `/` -> `-`; see `lledsue-commit-and-pr` Step 6 for the transformation). Compute the slug budget dynamically from the actual repo and owner:

```bash
REPO_OWNER_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=${REPO_OWNER_NAME%/*}
REPO=${REPO_OWNER_NAME#*/}
SUFFIX_LEN=$(( ${#REPO} + ${#OWNER} + 4 ))      # 4 = the four "-" in "--{repo}--{owner}"
TICKET_LOWER=$(echo "$TICKET" | tr '[:upper:]' '[:lower:]')
OVERHEAD=$(( ${#TYPE} + 1 + ${#TICKET_LOWER} + 1 ))   # "{type}-{ticket}-"
SLUG_BUDGET=$(( 63 - SUFFIX_LEN - OVERHEAD ))
```

Slugify the summary (from Step 3a `fields.summary` or Step 3b developer-provided title):

1. Lowercase.
2. Replace anything not `[a-z0-9]` with `-`.
3. Collapse repeated `-` into a single `-`.
4. Trim leading/trailing `-`.
5. Truncate to **`$SLUG_BUDGET`** characters, then re-trim trailing `-`.

If `$SLUG_BUDGET < 8`, stop. A slug shorter than 8 chars is unreadable - tell the user the project has very long repo/owner names and ask for a shorter title. Do not silently produce `feature/ABC-123-add-us`.

Branch name = `<type>/<TICKET>-<slug>`.

Examples (with `repo=lifelock`, `owner=gendigital-webexp`: `SUFFIX_LEN=29`, so `SLUG_BUDGET = 34 - OVERHEAD`):

| Type | Ticket | Title | Overhead | Slug budget | Result |
|---|---|---|---|---|---|
| `feature` | `ABC-123` | `Add user login & 2FA support` | 7+1+7+1=16 | 18 | `feature/ABC-123-add-user-login-2fa` |
| `bugfix` | `WEBEXP-1234` | `Fix mega-menu CLS on tablet` | 6+1+11+1=19 | 15 | `bugfix/WEBEXP-1234-fix-megamenu` |
| `patch` | `WEBEXP-0000` | `Trim long branch name` | 5+1+11+1=18 | 16 | `patch/WEBEXP-0000-trim-long-name` |

For projects with shorter `{repo}--{owner}` suffixes, the budgets are more generous. The math is always the same; do the calculation, don't hardcode a truncation length.

### Step 5: Create the branch

```bash
git switch -c "<branch>"
```

If a local branch with that name already exists, stop and ask the user whether to switch to it, delete it, or pick a new slug. Do not silently overwrite.

### Step 6: Write the workspace folder

Each task's scratch files live in a per-mode **workspace directory** (`<WORKSPACE>`):

- **JIRA mode** -> `<WORKSPACE>` = `tmp-workspace/<TICKET>/`. The ticket key is globally unique, so it is its own folder.
- **Adhoc mode** -> `<WORKSPACE>` = `tmp-workspace/<TICKET>/<slug>/`. An adhoc key like `WEBEXP-0000` is a **shared placeholder reused by every adhoc task**, so each task nests under its own branch `<slug>` (from Step 4) to keep `ticket.md` / `plan.md` unique and avoid clobbering sibling adhoc tasks. The parent `tmp-workspace/<TICKET>/` therefore accumulates one subfolder per adhoc task.

Create `<WORKSPACE>` (e.g. `mkdir -p "<WORKSPACE>"`) and write the per-mode files into it. Do not re-fetch JIRA.

#### JIRA mode

Three files in `<WORKSPACE>` (= `tmp-workspace/<TICKET>/`): `ticket.json`, `ticket.md`, `plan.md`.

**`<WORKSPACE>/ticket.json`** - the raw REST API issue response (already written in Step 3a). Used to re-derive any field later without another API call.

**`<WORKSPACE>/ticket.md`** - human-readable summary. Use this template, omit any section whose value is missing:

```markdown
# <TICKET>: <fields.summary>

- **Mode**: JIRA
- **Status**: <fields.status.name>
- **Type**: <fields.issuetype.name>
- **Priority**: <fields.priority.name>
- **Assignee**: <fields.assignee.displayName>
- **Reporter**: <fields.reporter.displayName>
- **Labels**: <fields.labels joined by ", ">
- **Components**: <fields.components[].name joined by ", ">
- **Link**: <self URL or browse URL>

## Description

<fields.description>

## Acceptance Criteria

<extract from a custom field if present, otherwise from description>

## Links

<fields.issuelinks[] formatted as "- <type>: <KEY> - <summary>">

## Comments

<fields.comment.comments[] formatted as "### <author> - <created>\n\n<body>">
```

#### Adhoc mode

Two files in `<WORKSPACE>` (= `tmp-workspace/<TICKET>/<slug>/`): `ticket.md`, `plan.md`. **No `ticket.json`** - there is no JIRA payload to save.

**`<WORKSPACE>/ticket.md`** - based entirely on the developer answers from Step 3b:

```markdown
# <TICKET>: <title from Step 3b>

- **Mode**: Adhoc
- **Created**: <ISO date>
- **Author**: <git config user.name>

## Description

<description from Step 3b>

## Acceptance Criteria

<bullet list from Step 3b, or "(none provided)">

## Notes

<notes from Step 3b, or omit the section>
```

#### Both modes

**`<WORKSPACE>/plan.md`** - empty scaffold for the working session:

```markdown
# <TICKET> - Working Plan

## Goal

<one-line goal>

## Approach

- [ ] ...

## Notes

```

### Step 7: Verify `tmp-workspace/` is gitignored

Check the `ticket.md` you actually wrote (in `<WORKSPACE>`):

```bash
git check-ignore -q "<WORKSPACE>/ticket.md" && echo OK || echo MISSING
```

If `MISSING`, append `tmp-workspace/` to `.gitignore` and warn the user that it was missing.

### Step 8: Confirm to the user

Also compute the AEM Code Sync preview URL for the new branch so the developer can open it directly once the branch is pushed. The transformation is **lowercase + replace `/` with `-`** (matches `lledsue-commit-and-pr` step 6):

```bash
REPO_OWNER_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=${REPO_OWNER_NAME%/*}
REPO=${REPO_OWNER_NAME#*/}
SAFE_BRANCH=$(git branch --show-current | tr '[:upper:]' '[:lower:]' | tr '/' '-')
PREVIEW="https://${SAFE_BRANCH}--${REPO}--${OWNER}.aem.page/"
```

Then print a short multi-line summary. Include the mode, the workspace path, and the preview URL:

```
Ready (JIRA): branch feature/ABC-123-add-user-login-2fa-support
  Workspace: tmp-workspace/ABC-123/
  Preview:   https://feature-abc-123-add-user-login-2fa-support--lifelock-ue--gendigital-webexp.aem.page/
```

```
Ready (adhoc): branch feature/WEBEXP-0000-project-setup-skills-and-rules
  Workspace: tmp-workspace/WEBEXP-0000/project-setup-skills-and-rules/
  Preview:   https://feature-webexp-0000-project-setup-skills-and-rules--lifelock-ue--gendigital-webexp.aem.page/
```

The preview URL becomes reachable only after the first push (handled by `lledsue-commit-and-pr`); flag that to the developer if it's their first run on this branch.

## Anti-patterns

- Do **not** create the branch before the JIRA fetch succeeds (JIRA mode) or the developer prompt is answered (adhoc mode) - the summary/title drives the slug.
- Do **not** hit the Jira REST API for adhoc tickets (`-0+$`). They have no JIRA record; calling will 404 and waste time.
- Do **not** reach for the Atlassian Cloud MCP (`plugin-atlassian-atlassian`) to fetch tickets - it can't see the self-hosted DC instance. Use the `JIRA_PAT` REST path.
- Do **not** print, echo, or commit the PAT. It lives only in `JIRA_PAT` (`~/.zshrc` or gitignored `dev/.local/jira.env`).
- Do **not** invent a title for an adhoc ticket. Always prompt the developer.
- Do **not** write adhoc `ticket.md` / `plan.md` flat into `tmp-workspace/<TICKET>/` - the all-zeros key is shared, so flat files clobber the previous adhoc task. Always nest under the per-task `<slug>` subfolder.
- Do **not** push the branch in this skill. That's `lledsue-commit-and-pr`'s job.
- Do **not** modify any source files, run installs, or start the dev server. This skill only sets up the workspace.
- Do **not** commit `tmp-workspace/` contents. They are local-only scratch.
