---
name: lledsue-commit-and-pr
description: Finalize work on the current lleds branch - run pre-commit verification, write a conventional-commit message with the ticket key, push to origin, and open a GitHub PR with a body that links the ticket (or notes adhoc work) and the AEM preview URL. Handles both JIRA tickets and adhoc tickets (ticket number `0+`, e.g. `WEBEXP-0000`). Use when the user asks to commit, push, ship, open a PR, raise a PR, or finish a ticket.
---

# lledsue-commit-and-pr

Takes the current branch from "work done" to "PR open and CI running" without skipping the project's required checks. Stops and confirms with the user before each destructive step (commit, push, PR creation).

## Ticket modes

Detect the mode from the ticket key embedded in the branch name (same rule as `lledsue-new-branch`):

- **JIRA mode** - ticket number is non-zero (e.g. `WEBEXP-1234`). PR body links the JIRA issue. The workspace folder is `tmp-workspace/<TICKET>/` and `tmp-workspace/<TICKET>/ticket.json` exists.
- **Adhoc mode** - ticket number is all zeros (e.g. `WEBEXP-0000`). No JIRA link in the PR body; instead the body says "Adhoc ticket - no JIRA". The all-zeros key is a shared placeholder, so each adhoc task nests under its branch `<slug>`: the workspace folder is `tmp-workspace/<TICKET>/<slug>/` and has `ticket.md` only (no `ticket.json`).

Throughout this skill, `<WORKSPACE>` means the per-mode workspace folder: `tmp-workspace/<TICKET>/` (JIRA) or `tmp-workspace/<TICKET>/<slug>/` (adhoc). `<slug>` is the descriptive tail of the branch after the ticket key (see Step 1).

## Workflow

Track progress against this checklist:

```
- [ ] Step 1: Sanity-check the branch name
- [ ] Step 2: Pre-commit verification
- [ ] Step 3: Stage + draft commit message + confirm
- [ ] Step 4: Commit
- [ ] Step 5: Confirm + push
- [ ] Step 6: Build the AEM preview URL
- [ ] Step 7: Confirm + open PR
- [ ] Step 8: Report `gh pr checks`
- [ ] Step 9: Sync the default branch back into the feature branch
```

If an **open PR already exists** for this branch (Step 7 detects it), you are
"submitting a commit to an already opened PR". Steps 6 and 7 are skipped (no new
PR is created), but **Step 9 still runs** - the PR must be kept current with the
default branch after every push, whether the push opened the PR or added to it.

### Sandbox policy for git commands

For this skill, **every Shell call that includes any `git ...` command must run outside the sandbox**:

- `required_permissions: ["all"]`

This applies to reads and writes (`git branch`, `git status`, `git diff`, `git add`, `git commit`, `git push`, etc.) so commit/PR flows don't fail on sandbox-specific cert/env differences.

Important guardrails:

- This does **not** bypass command allowlist/policy checks; it only changes sandbox context.
- Keep non-git commands sandboxed unless a separate requirement forces otherwise.

### Step 1: Sanity-check the branch name

```bash
git branch --show-current
```

The branch must match:

```
^(feature|bugfix|hotfix|patch|spike)/[A-Z][A-Z0-9]+-\d+-.+$
```

If it does not, stop and tell the user to run the `lledsue-new-branch` skill first. Do not rename branches in this skill.

Also verify the resulting feature-preview hostname fits DNS's 63-character label limit. AEM Code Sync (and the local AEM CLI when launching against a feature branch) will refuse to provision a label longer than 63 chars:

```bash
REPO_OWNER_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=${REPO_OWNER_NAME%/*}
REPO=${REPO_OWNER_NAME#*/}
BRANCH=$(git branch --show-current)
SAFE_BRANCH=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | tr '/' '-')
LABEL_LEN=$(( ${#SAFE_BRANCH} + ${#REPO} + ${#OWNER} + 4 ))
if [ "$LABEL_LEN" -gt 63 ]; then
  echo "Branch '$BRANCH' produces a DNS label of $LABEL_LEN chars (limit 63)."
  exit 1
fi
```

If it overflows, stop. Tell the user to rename the branch shorter (via `lledsue-new-branch` with a tighter title). Do not silently rename or push.

Extract the ticket key from the branch (the `[A-Z][A-Z0-9]+-\d+` portion). Used in commit message and PR body. Also extract the `<slug>` - the branch tail after `<TICKET>-` - which locates the adhoc workspace folder:

```bash
TICKET=$(echo "$BRANCH" | sed -E 's@^[^/]+/([A-Z][A-Z0-9]+-[0-9]+)-.*$@\1@')
SLUG=$(echo "$BRANCH" | sed -E 's@^[^/]+/[A-Z][A-Z0-9]+-[0-9]+-(.*)$@\1@')
case "$TICKET" in
  *-0|*-00|*-000|*-0000) WORKSPACE="tmp-workspace/$TICKET/$SLUG" ;;  # adhoc: shared key, per-task subfolder
  *) WORKSPACE="tmp-workspace/$TICKET" ;;                            # JIRA: unique key
esac
```

Determine the **mode**:

- If the ticket number portion matches `^0+$` (all zeros) -> **adhoc mode**.
- Otherwise -> **JIRA mode**.

### Step 2: Pre-commit verification

Run these checks **in order**. Stop on the first failure and surface the error to the user. Do not auto-fix unless the step explicitly says to.

#### Default checks

1. **Lint**: `npm run lint` - must exit 0. If it fails, suggest `npm run lint:fix` and let the user decide.
2. **JSON aggregates**: if `git diff --cached --name-only` or `git status --porcelain` includes any `models/_*.json` or `blocks/**/_*.json`, run:
   ```bash
   npm run build:json
   ```
   then re-stage `component-models.json`, `component-definition.json`, `component-filters.json`. (This mirrors `.husky/pre-commit.mjs`.)
3. **No unintended files staged**: if `tmp-workspace/`, `.hlx/`, `node_modules/`, or any path matching `\.env` is staged, stop and ask the user.
4. **Playbook freshness**: if the change touches any source the onboarding playbook summarizes - `.cursor/rules/lledsue-*.mdc`, `.cursor/skills/lledsue-*/SKILL.md`, `dev/docs/architecture.md`, `docs/universal-editor-local-setup.md`, `scripts/critical.js`, `scripts/scripts.js`, `styles/styles.css`, `package.json`, or `AGENTS.md` - confirm [`docs/component-development-playbook.md`](../../../docs/component-development-playbook.md) was updated to match (or is genuinely unaffected). Use the topic→source table in [`.cursor/rules/lledsue-playbook-maintenance.mdc`](../../../.cursor/rules/lledsue-playbook-maintenance.mdc) to decide. Do **not** auto-edit the playbook here - surface a warning and let the user decide whether to update it before the PR.

#### Pre-commit checks (TODO)

The list below is a placeholder - extend it as the project gains tests and additional gates. Add each new check as a numbered step with the exact command and the pass criterion.

```
- [ ] Unit tests:    npm run test:unit         (TBD)
- [ ] E2E tests:     npm run test:e2e          (TBD)
- [ ] A11y check:    npm run test:a11y         (TBD)
- [ ] PSI smoke:     local Lighthouse run      (TBD)
```

Until those are wired, the default checks above are the full gate.

### Step 3: Stage + draft commit message + confirm

If nothing is staged yet, stage tracked changes the user clearly intended (`git add -u` plus any new files they pointed at). Never `git add .` blindly - confirm with the user if there are untracked files.

Draft a Conventional Commits message with the JIRA key in brackets at the end of the subject:

```
<type>(<scope>): <subject> [<TICKET>]

<body - what changed and why, in imperative mood>

Refs: <TICKET>
```

- `<type>` derived from the branch type: `feature`->`feat`, `bugfix`/`hotfix`/`patch`->`fix`, `spike`->`chore`.
- `<scope>` derived from the primary block/area touched (e.g. `header`, `cards`, `styles`). Omit `()` if not obvious.
- `<subject>` <= 72 chars, no trailing period.
- Reference `<WORKSPACE>/plan.md` only inside the body (never in the subject).

Show the message to the user and ask for explicit confirmation before committing. Allow them to edit it.

### Step 4: Commit

Use a HEREDOC so multi-line bodies render correctly:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject> [<TICKET>]

<body>

Refs: <TICKET>
EOF
)"
```

If the husky pre-commit hook auto-modifies generated JSON aggregates, the commit will succeed and re-stage them; that is expected. If the hook **rejects** the commit, fix the issue and create a new commit - do not amend.

### Step 5: Confirm + push

Confirm with the user, then:

```bash
git push -u origin HEAD
```

Never force-push from this skill. If the remote rejects with non-fast-forward, stop and ask the user how to proceed.

### Step 6: Build the AEM preview URL

AEM Code Sync normalizes branch names for the hostname: **lowercase** the whole branch and **replace `/` with `-`**. So `feature/WEBEXP-0000-project-setup` becomes `feature-webexp-0000-project-setup` in the URL. Compute it deterministically - do not ask the user.

```bash
REPO_OWNER_NAME=$(gh repo view --json nameWithOwner -q .nameWithOwner)   # e.g. gendigital-webexp/lifelock-ue
OWNER=${REPO_OWNER_NAME%/*}
REPO=${REPO_OWNER_NAME#*/}
BRANCH=$(git branch --show-current)
SAFE_BRANCH=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | tr '/' '-')
PREVIEW="https://${SAFE_BRANCH}--${REPO}--${OWNER}.aem.page/"
```

`$PREVIEW` is the bare branch-host root (`https://<safe-branch>--<repo>--<owner>.aem.page/`). The PR carries a **single** preview link that must land on a page where the change is visible (AGENTS.md policy - a PR without a demonstrating URL is rejected):

- **If the user gave a specific page link / path** (e.g. "preview at `/products/lifelock-core`"), that page is the preview URL - use it verbatim, don't substitute. Emit it as a full absolute URL (`${PREVIEW%/}<path>`), never a bare relative path.
- **If the change renders on the homepage**, the **root path** - the bare `$PREVIEW` root - **is** the demonstrating page, because root = homepage. Use it as-is; do not invent a deeper path just to look like it "has a path".
- **Otherwise** use a demo path that shows the change (a real content path, or a committed fixture per the candidates below).

Candidate demo paths when you need one:
- New blocks (no cloud AEM content yet): a committed fixture, e.g. `${PREVIEW}test/fixtures/<blockname>/all` or `${PREVIEW}test/fixtures/<blockname>/index`.
- Existing blocks/pages: a real content path, e.g. `${PREVIEW}products/lifelock-standard` or `${PREVIEW}drafts/<demo-page>`.

### Step 7: Confirm + open PR

Construct the PR body with a HEREDOC. Pull the summary from `<WORKSPACE>/plan.md` if it exists, otherwise from the title in `<WORKSPACE>/ticket.md`.

The "Ticket" section differs by mode:

- **JIRA mode** - link the JIRA issue.
- **Adhoc mode** - state "Adhoc ticket - no JIRA" and reference `<WORKSPACE>/ticket.md` (which is local-only, so summarize the description inline rather than linking).

```bash
gh pr create \
  --title "<type>(<scope>): <subject> [<TICKET>]" \
  --body "$(cat <<'EOF'
## Summary

- <bullet 1>
- <bullet 2>

## Ticket

<JIRA mode>
- <TICKET>: <link to JIRA issue>

<Adhoc mode>
- <TICKET>: Adhoc ticket - no JIRA
- Description: <one-paragraph summary from ticket.md>
- Acceptance: <bullets from ticket.md, or "n/a">

## Preview URL

<PREVIEW-URL>

## Test plan

- [ ] Verified locally on http://localhost:4501
- [ ] Lint passes (`npm run lint`)
- [ ] Verified on the preview URL above
- [ ] PageSpeed Insights run on preview URL (target 100)

EOF
)"
```

Use only the section that matches the mode (drop the `<JIRA mode>` / `<Adhoc mode>` markers). Show the full title + body to the user and confirm before running `gh pr create`.

Before creating, check whether an **open** PR already targets this branch. Filter on state - `gh pr view` returns merged PRs too, and reusing a merged PR's URL means the new commit has no live PR tracking it:

```bash
OPEN_PR=$(gh pr list \
  --head "$(git branch --show-current)" \
  --state open \
  --json url -q '.[0].url // empty')

if [ -n "$OPEN_PR" ]; then
  echo "Open PR already exists for this branch: $OPEN_PR"
  echo "Skipping gh pr create - the new commit is already attached."
else
  gh pr create --title "..." --body "..."
fi
```

A merged PR for the same branch is fine - the open-state filter ignores it and a new PR gets created for the new commit. Never reuse a merged PR's URL as if it were tracking new commits.

### Step 8: Report `gh pr checks`

```bash
gh pr checks
```

Print the result. If checks are still pending, that's expected - tell the user the PR URL and that AEM Code Sync, lint, and any perf checks will run shortly. The chat confirmation also includes the same single preview URL from the PR body (reachable a minute or two after push, once AEM Code Sync provisions the branch).

#### Slack review block (chat output only)

After the confirmation, also emit a Slack-ready block for the user to copy-paste into the team review channel. **This goes in chat output only - never in the PR description.** Render it as a plain fenced code block (so it copies cleanly) in exactly this format:

```
@here please review and merge this PR
PR: <PR url>
Preview: <preview URL>
Ticket: <JIRA browse URL>
QA: @First Last
Thanks!
```

- **PR** - the URL returned by `gh pr create` (or the existing open PR).
- **Preview** - the same single preview URL from the PR body's `## Preview URL` section.
- **Ticket** - the JIRA browse URL (`https://jira.corp.nortonlifelock.com/browse/<TICKET>`). In **adhoc mode** there is no JIRA issue - drop the `Ticket:` line.
- **QA** - the JIRA ticket **reporter**, formatted as `@First Last` (just `@` + the display name, no brackets or quotes). Read the reporter from `<WORKSPACE>/ticket.json` `fields.reporter.displayName`. In **adhoc mode** (no reporter) drop the `QA:` line.

If the user replies "post it for me" (or similar), invoke [`lledsue-slack-pr-review`](../lledsue-slack-pr-review/SKILL.md) with the PR and ticket from this run - that skill posts the message to `#t-webexp-nlok-pr` via the Slack MCP after showing the draft for confirmation, so no manual copy-paste is needed. That skill uses the channel's house style (Hi @here / PR / JIRA / QA / Thanks) and intentionally omits the `Preview:` line, so the copy-paste block above and the auto-posted block differ in that one field.

### Step 9: Sync the default branch back into the feature branch

Once the push has landed (PR just opened **or** a commit added to an already-open
PR), pull the latest default branch and merge it into the current feature branch
so conflicts surface early and CI runs against the real merge base. This is
Point (b) of the [`lledsue-git-safety`](../../rules/lledsue-git-safety.mdc) sync
policy (the only points `main` is merged in are branch creation, after a PR push,
and on explicit request) - read that rule for the binding version; this step is
the concrete flow for the commit/PR path.

**Never resolve a conflict by writing to `main`.** The merge direction is always
`origin/<DEFAULT>` -> feature branch. You are never on `main`, never merge *into*
`main`, and never push to `origin/main`. If somehow checked out on the default
branch, stop the chat and route the user to [`lledsue-new-branch`](../lledsue-new-branch/SKILL.md)
(`/lledsue-new-branch`) per the git-safety rule.

```bash
git fetch origin --prune

BRANCH=$(git branch --show-current)
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@')
if [ -z "$DEFAULT" ]; then
  git remote set-head origin --auto >/dev/null 2>&1
  DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@')
fi

if [ "$BRANCH" = "$DEFAULT" ]; then
  echo "On the protected default branch ('$DEFAULT'). Refusing to merge/commit here."
  echo "Start a feature branch with /lledsue-new-branch."
  exit 1
fi

git merge --no-edit "origin/$DEFAULT"
```

**Clean merge (or already up to date):** if the merge created a new merge commit,
push it so the PR reflects it (`git push`). If it was a no-op ("Already up to
date."), there is nothing to push - just say so.

**Merge reports conflicts:** do **not** auto-resolve. Enumerate every conflicting
path (`git diff --name-only --diff-filter=U`) and classify each one:

| Class | Examples | What "fixing" means |
|---|---|---|
| **Easy** | Generated JSON aggregates (`component-models.json`, `component-definition.json`, `component-filters.json`) -> regenerate with `npm run build:json`; lockfile (`package-lock.json`) -> re-resolve; pure additive, non-overlapping hunks; import-order / whitespace-only collisions; a block CSS/JS where the two sides touched clearly separate, non-interacting regions. | Mechanical: regenerate, take the union, or re-run a deterministic generator. No judgment about intent required. |
| **Complicated** | Two sides edited the same logic/lines with different intent; conflicting model field definitions; conflicting changes to the same DOM-decoration path; anything where picking a side could silently drop someone's change or change behavior. | Needs the user's intent. Do not guess. |

Output the **full list** in chat, grouped by class, e.g.:

```
Merge of origin/main into <branch> hit conflicts:

Easy (I can fix these mechanically):
  - component-models.json        (regenerate via npm run build:json)
  - package-lock.json            (re-resolve)

Complicated (need your direction):
  - blocks/foo/foo.js        (both sides changed decorate() differently)
  - blocks/foo/_foo.json         (conflicting model fields)
```

Then **ask the user**: proceed with the easy fixes now, and for each complicated
one, how should it be resolved? Do not continue resolving until they answer.
After the user confirms and conflicts are resolved, commit the merge
(`git commit --no-edit` for the merge commit) and `git push` so the PR updates.
If the user prefers to abort and handle it manually, run `git merge --abort` and
leave the branch as it was before the merge attempt.

## Anti-patterns

- Do **not** skip pre-commit checks with `--no-verify`.
- Do **not** `git commit --amend` after pushing.
- Do **not** `git push --force` or `--force-with-lease` from this skill.
- Do **not** commit `tmp-workspace/`, `.env`, or anything matching the project's `.gitignore`.
- Do **not** add qualifiers or explanation around the preview link - one link labeled "Preview URL". If the user gave a specific page link, that is the preview URL; for a homepage-visible change the bare branch-host root is the demonstrating page (root = homepage); otherwise pick a demo path that shows the change.
- Do **not** auto-merge. A human reviewer merges per AGENTS.md.
- Do **not** invent a JIRA URL for an adhoc ticket (`-0+$`). Use the "Adhoc ticket - no JIRA" wording instead.
- Do **not** skip Step 9 after pushing a commit to an already-open PR. The sync-back runs on every push, not only when the PR is first created.
- Do **not** merge the feature branch *into* `main` or push to `origin/main` to "resolve" the post-PR sync. The merge is always `origin/<DEFAULT>` -> feature branch.
- Do **not** auto-resolve a complicated conflict by favoring one side. Classify, list, and wait for the user's direction.
