---
name: lledsue-consolidate
description: Audit and consolidate the lleds codebase to remove duplication and drift introduced over time (often by AI agents). Applies SOLID, DRY, and KISS principles to rules (.cursor/rules/, AGENTS.md), skills (.cursor/skills/), source code (blocks/, scripts/, styles/), and specs/plans (.cursor/plans/, tmp-workspace/). Use when the user asks to dedupe, consolidate, refactor, clean up, audit duplicates, simplify, or "make this less repetitive".
---

# lledsue-consolidate

Scans the codebase for duplication, overlap, and complexity, reports findings, and only then (with explicit user confirmation) applies the consolidations. **Always read-only first.** Destructive changes happen only on a second pass after the user reviews the report.

## Scope

The skill operates on four areas. The user picks one or `all`:

| Area | Paths covered |
|---|---|
| `rules` | `.cursor/rules/`, `AGENTS.md`, `CLAUDE.md` |
| `skills` | `.cursor/skills/*/SKILL.md` plus any supporting files in those folders |
| `code` | `blocks/**`, `scripts/scripts.js`, `scripts/delayed.js`, `scripts/editor-support*.js`, `styles/**` (never `scripts/aem.js` - off-limits per AGENTS.md) |
| `specs` | `.cursor/plans/`, `tmp-workspace/`, plan/spec docs anywhere in the repo |

If the user says "consolidate everything" without specifying, default to `all`. If they say "dedupe my skills", scope to `skills`.

## Required inputs

Ask once via `AskQuestion` if not provided:

- **Scope** - one of `rules | skills | code | specs | all`.
- **Mode** - `audit` (default, read-only report) or `apply` (after audit, do the consolidations).

If they invoke the skill without saying which mode, **default to `audit`**.

## Workflow

```
- [ ] Step 1: Lock scope and mode
- [ ] Step 2: Scan the area(s)
- [ ] Step 3: Score findings (SOLID / DRY / KISS lens)
- [ ] Step 4: Produce the consolidation report
- [ ] Step 5: Confirm with the user (only if mode = apply)
- [ ] Step 6: Apply consolidations one finding at a time
- [ ] Step 7: Re-run lint and build:json if code/models changed
- [ ] Step 8: Print a one-line summary
```

### Sandbox policy for git commands

For this skill, whenever a Shell block contains any `git ...` command (for example `git status --porcelain` safety checks), run that Shell block outside sandbox:

- `required_permissions: ["all"]`

This prevents sandbox-only TLS/cert and environment inconsistencies from affecting repository checks.

Guardrails:

- Do not treat this as a blanket bypass for unrelated commands.
- Command allowlist/policy enforcement still applies.

### Step 1: Lock scope and mode

If the user didn't specify, ask. Working tree should be clean before any `apply` run; if `git status --porcelain` returns anything, refuse `apply` and tell the user to commit or stash first. (Audit mode is always safe to run.)

### Step 2: Scan the area(s)

Use the heuristics below per area. Always read files first; never delete or merge based on file names alone.

#### Rules heuristics

- **Exact-line overlap**: same instruction sentence appears in two or more rules verbatim -> candidate for merge.
- **Containment**: rule A's body is fully contained in rule B's body -> drop A or fold A into B.
- **Restatement of AGENTS.md**: a `.cursor/rules/*.mdc` rule that only repeats AGENTS.md without adding scope/specificity -> drop.
- **Oversized always-applied rule**: any `alwaysApply: true` rule >100 lines -> split into a small always-on core + an auto-attached detail rule via globs.
- **Stale globs**: `globs:` referencing paths that no longer exist -> update or drop.
- **Conflicting guidance**: two rules give contradictory instructions on the same topic -> flag, do not auto-resolve, ask the user.

#### Skills heuristics

- **Trigger overlap**: two skills' descriptions cover the same trigger phrases ("create a component" vs "build a block") -> merge or split clearly.
- **Workflow duplication**: 80%+ of two skills' steps are identical (e.g. both run `npm run build:json` then lint with the same conditions) -> extract the shared sequence into a `reference.md` next to one skill (one level deep, per the create-skill rule) and have both skills reference it.
- **Missing frontmatter fields**: every SKILL.md must have `name` and `description`. Flag and fix.
- **Description weaknesses**: written in first or second person ("I can help...", "you can use this...") - rewrite to third person.
- **Oversized SKILL.md** (>500 lines): split via progressive disclosure into `SKILL.md` + supporting docs.
- **Vague names**: `helper.md`, `utils.md`, `tools.md` -> propose specific names. Skip lledsue-prefixed skills here (they're already specific).

#### Code heuristics

For `blocks/**`, `scripts/`, `styles/`:

- **Duplicated literals**: same color/spacing/font literal appears in 3+ block CSS files -> propose promoting to a token via `lledsue-create-token`.
- **Repeated decorate patterns**: identical sequences across two blocks (e.g. both restructure rows into `<ul>/<li>` exactly the same way) -> consider extracting into `scripts/scripts.js` only if the pattern is genuinely reusable (preserve EDS's per-block code splitting model - do not over-extract).
- **Unscoped CSS selectors**: any block-CSS selector not prefixed with `.<blockname>` -> fix per `lledsue-block-conventions.mdc`.
- **Missing `moveInstrumentation`**: any block JS that calls `replaceChildren`, `replaceWith`, or `append` on new nodes that replace authored nodes without `moveInstrumentation` -> flag for `lledsue-fix-block`.
- **Async decorate without await**: `async function decorate` with no `await` inside -> make sync.
- **Dead imports**: unused symbols in import statements -> remove.
- **CSS reset duplication**: same reset rules in multiple block CSS files -> consider hoisting to `styles/styles.css` only if used by 3+ blocks; otherwise leave (KISS).
- **Stylelint/eslint disables without reason**: any `eslint-disable` or `stylelint-disable` without a comment explaining why -> add a reason or remove the disable.

Hard exclusion: never modify `scripts/aem.js`.

#### Specs/plans heuristics

- **Stale plans**: `.cursor/plans/*.plan.md` referring to work that's already merged on the current branch -> propose archive (move to `.cursor/plans/archive/`) or delete.
- **Merged tickets**: `tmp-workspace/<TICKET>/` whose JIRA ticket is `Done`/`Closed` per the saved `ticket.json` -> propose deletion.
- **Overlapping plans**: two plan docs covering the same feature with different defaults -> flag, ask which is the source of truth.
- **Plans without owner/date**: header missing context for who/when -> flag.

### Step 3: Score findings (SOLID / DRY / KISS lens)

Tag each finding with the principle(s) it violates:

- **SRP** - file/skill/rule does more than one thing (split candidate).
- **OCP / LSP / ISP / DIP** - rarely applicable to this no-build vanilla-JS EDS codebase. Use only when actually relevant; do not force OOP framing.
- **DRY** - duplication. The most common tag.
- **KISS** - over-engineering, premature abstraction, deep conditionals, oversized files.

A finding can have multiple tags. Tag honestly - don't tag DRY for two superficially similar but actually different functions.

### Step 4: Produce the consolidation report

Write the report to `tmp-workspace/consolidate-<YYYYMMDD-HHMM>/report.md`. The report has one section per area scanned, each with a numbered list of findings. Each finding looks like:

```markdown
### Finding 3 - DRY, KISS
**Where:** [.cursor/rules/lledsue-block-conventions.mdc](../../.cursor/rules/lledsue-block-conventions.mdc) lines 22-28 and [AGENTS.md](../../AGENTS.md) lines 45-51
**What:** Both files describe the block file trio (<id>.js / <id>.css / _<id>.json) with near-identical wording.
**Proposed action:** Keep the canonical statement in `AGENTS.md`. In `lledsue-block-conventions.mdc`, reduce to "see AGENTS.md 'Block development conventions'".
**Impact:** -7 lines, single source of truth for the trio rule.
**Risk:** Low - rules already reference AGENTS.md.
```

Print the report path and a one-line tally to the chat:

```
Consolidation audit complete: 12 findings (5 DRY, 4 KISS, 2 SRP, 1 conflict).
Report: tmp-workspace/consolidate-20260529-1758/report.md
```

If mode = `audit`, stop here. The user reads the report and decides what to apply.

### Step 5: Confirm with the user (apply mode)

Show the user the report headline counts and ask which findings to apply:

- "All low-risk findings" (anything tagged Low risk in the report).
- "All findings except conflicts" (skip ones flagged for manual resolution).
- "A specific list" (the user names finding numbers).
- "None" (cancel).

Do **not** apply conflicts (Step 2 "Conflicting guidance") automatically. Always require the user to pick a side.

### Step 6: Apply consolidations one finding at a time

For each chosen finding:

1. Make the smallest edit possible. If the proposed action says "fold A into B", do exactly that, no other refactoring.
2. After each edit, re-read the affected file to verify the change took effect.
3. Append a `## Applied` section to the report with the finding number, the diff summary, and any deviations.

If a finding requires deletion (stale plan, merged ticket folder), confirm a second time before deleting.

### Step 7: Re-run lint and build:json

If code or `_*.json` was touched:

```bash
npm run build:json
npm run lint
```

If lint fails, do not declare done - fix the regression or roll back the offending finding.

### Step 8: Confirm

Print:

```
Applied <N> findings (skipped <M> conflicts, <K> not selected).
Report: tmp-workspace/consolidate-<timestamp>/report.md (with Applied section)
Lint: PASS
build:json: PASS [if ran]
```

## SOLID / DRY / KISS as a lens

The principles guide judgment, not blind rule-application. Cheat sheet:

- **SRP** - one file, one job. A skill that both creates blocks and tokens violates SRP. A block that handles both layout and analytics violates SRP.
- **DRY** - identical knowledge in two places. Same threshold value in two CSS files; same workflow in two SKILLs. Triplicate is the usual trigger - twice is often coincidence.
- **KISS** - the simpler thing fits the project's style. EDS is no-build vanilla JS; do not introduce a build step, framework, or transpiler in the name of "cleanliness".

When DRY and KISS conflict (extracting feels DRY but adds a layer of indirection), prefer KISS for this codebase. EDS prizes per-file simplicity over abstraction.

## Anti-patterns

- Do **not** apply changes in `audit` mode. Audit is read-only by definition.
- Do **not** delete `tmp-workspace/<TICKET>/` folders without checking JIRA status (saved in `ticket.json`).
- Do **not** modify [scripts/aem.js](../../../scripts/aem.js).
- Do **not** auto-resolve "Conflicting guidance" findings. The user picks the source of truth.
- Do **not** introduce new dependencies, build steps, or frameworks in the name of "refactoring". EDS is no-build, vanilla JS only.
- Do **not** rename files in this skill. Renames break too many references; that's a separate, intentional refactor.
- Do **not** extract a utility for a pattern that only appears twice. Wait for the third occurrence (rule of three).
- Do **not** collapse or refactor a block that another block reuses (check its `<id>.md` `## Dependents` section) without auditing every dependent and updating the ledger in both `<id>.md` files. The reused surface is a public API. See [`.cursor/rules/lledsue-block-tiers.mdc`](../../../.cursor/rules/lledsue-block-tiers.mdc) "Cross-block dependencies (Depends on / Dependents ledger)".
