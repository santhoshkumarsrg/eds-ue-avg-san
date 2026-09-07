---
name: lledsue-brand-color-refresh
description: >-
  Audit, compare, and apply LifeLock brand color refreshes (Figma THEME: LifeLock
  vs EDS --ds-*/--ll-* tokens and hardcoded hex exceptions). Token-first globally,
  then per-block exception sweep; pages are coverage inventory only. Use when the
  user asks for brand update, color refresh, teal-to-blue, theme retarget, or to
  check/compare/update brand colors on homepage, product pages, or a block.
---

# lledsue-brand-color-refresh

Color-only brand refresh for ll-eds. **Not** a Figma layout/spacing parity pass
(that stays [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md)).

## Unit of work (do not invent per-page edits)

| Layer | Unit | Role |
|---|---|---|
| Phase 1 | Global tokens (`styles/styles.css`) | Source of truth — retarget `--ds-color-brand-*` |
| Phase 2 | **Per block** | Hardcoded hex, component-scoped gradients, DAM/icons, stale `.md` locks |
| Phase 3 | Page / surface | Inventory only — which blocks to prioritize and smoke-check |

Do **not** loop product pages as the edit unit. Shared THEME: LifeLock variables
and shared organisms make page-scoped color PRs duplicate work.

Living hex ↔ Figma ↔ EDS map: [`reference.md`](reference.md). Update that file
whenever Phase 1 or a Phase 2 exception lands.

## Modes

Ask via `AskQuestion` if the user did not pick one:

| Mode | What runs | Edits code? |
|---|---|---|
| `audit` | Phase 1 map + Phase 2 exception list (+ optional surface inventory) | No |
| `apply-tokens` | Phase 1 only | Yes — `styles.css` + token fixtures |
| `sweep <block-id>` | Phase 2 for one block | Yes — that block only |
| `sweep-surface <homepage\|product\|global>` | Phase 2 for every block used on that surface | Yes — listed blocks |

Default when ambiguous: `audit`.

## Required inputs

- **Mode** — one of the four above.
- **Figma authority** — at least one node URL (or a pinned section from
  [`.cursor/figma-references.md`](../../figma-references.md)). Prefer a
  full-page XL frame for theme dumps; section frames are fine for spot-checks.
- For `sweep <block-id>`: existing folder under `blocks/<id>/`.
- For `sweep-surface`: which surface (`homepage` / `product` / `global`).

## Hard rules

- Resolve colors with **`get_variable_defs`** against **THEME: LifeLock**. Never
  trust `get_design_context` inline hexes.
- Prefer changing **`--ds-color-brand-*` primitives**. Do not rewrite every
  `--ll-*` alias by hand — semantics already point at primitives.
- Do **not** add brand hex literals in block CSS when a `--ll-*` semantic exists.
- New shared solid tints → hand off to
  [`lledsue-create-token`](../lledsue-create-token/SKILL.md); do not invent
  one-off `--<abbr>-*` brand colors that belong in `:root`.
- Layout / spacing / typography parity → stop and route to
  `lledsue-figma-to-code` + `lledsue-enhance-block` / `lledsue-fix-block`.
- After any token or fixture change: update
  `test/fixtures/tokens/color/index.html` per
  [`.cursor/rules/lledsue-testing.mdc`](../../rules/lledsue-testing.mdc).
- After Phase 2 block edits: update that block's fixtures if paint changes are
  observable; refresh design-lock hex citations in `<id>.md`.

## Workflow

```
- [ ] Step 0: Confirm mode + Figma node(s)
- [ ] Step 1: Load reference.md + current styles.css brand primitives
- [ ] Step 2: Extract Figma color vars (get_variable_defs, THEME: LifeLock)
- [ ] Step 3: Build / refresh mapping table (EDS ↔ old lock ↔ new Figma)
- [ ] Step 4: If apply-tokens or audit-found drift → Phase 1 plan (or apply)
- [ ] Step 5: Grep exception ledger (old hex + known component vars)
- [ ] Step 6: If sweep* → fix exceptions per block; update <id>.md
- [ ] Step 7: If sweep-surface → inventory blocks from figma-references + fixtures
- [ ] Step 8: Write results (table + exception list); update reference.md
- [ ] Step 9: npm run lint (when edits were made)
```

### Step 0 — Confirm mode

If the user says "brand update product pages" without a mode, run **`audit`**
for `product` first, then ask whether to `apply-tokens` and/or
`sweep-surface product`.

### Step 1 — Baseline

Read:

- [`reference.md`](reference.md) (canonical mapping + known exceptions)
- Brand primitives in [`styles/styles.css`](../../../styles/styles.css)
  (`--ds-color-brand-dark|mid|tint|lighter-20` and their `--ll-*` aliases)

### Step 2 — Figma extract

Call Figma MCP `get_variable_defs` on the authority node(s). Collect every
`Color/*` and `Core Primitive Colors/LifeLock/*` entry.

**Caveat:** After a theme-library update, *old* and *new* frames may both
resolve to the new hexes. Keep the **EDS / design-lock** column as the “old”
authority when Figma no longer exposes prior values. Document that in the audit
output (see homepage audit note in `reference.md`).

### Step 3 — Mapping table

Emit rows:

| Role | EDS `--ds-*` | EDS `--ll-*` consumers | Old lock hex | New Figma token | New hex | Status |
|---|---|---|---|---|---|---|

Status ∈ `unchanged` | `retarget` | `new-token-needed` | `eds-only` | `figma-only`.

Seed / merge into [`reference.md`](reference.md) — do not leave the map only
in chat.

### Step 4 — Phase 1 (`apply-tokens` or audit recommendation)

When brand primitives differ from new Figma:

1. Update **only** the `--ds-color-brand-*` (and agreed lighter/tint) values in
   `styles/styles.css`.
2. Update `test/fixtures/tokens/color/index.html` swatch captions.
3. Do **not** mass-edit block CSS that already uses `--ll-color-*`.
4. List cascade consumers in the report (home-hero, comparison-chart, pdes,
   footer, top-nav, global `.button`, etc.) as smoke-check targets — not as
   edit targets.

If new solid tints appear (`Color/Solid Tints/brand-light-*`) with no EDS
token: list them under `new-token-needed` and pause for user confirmation
before calling `lledsue-create-token`.

### Step 5 — Exception grep (always in `audit` / `sweep*`)

Search the repo for the **old lock hexes** and known component vars. Current
seeds (refresh from `reference.md`):

```bash
rg -n '#013638|#108389|#cce5e7' --glob '!node_modules' --glob '!.git'
rg -n 'cc-teal-gradient|brand-dark|108389|013638' blocks styles --glob '*.{css,js,md,html}'
```

Classify each hit:

| Class | Action |
|---|---|
| `styles.css` primitive / semantic | Phase 1 only |
| Block CSS `var(--ll-*)` | No edit (cascades) |
| Hardcoded hex / `rgb(1 54 56…)` | Phase 2 — retarget or replace with `--ll-*` |
| Component-scoped gradient (`--cc-teal-gradient`, PDES CTA) | Phase 2 — retarget stops to new mid→dark |
| DAM / SVG / authored asset painted old brand | Flag for design/asset update (do not invent SVG) |
| `.md` design-lock citing old hex | Update citation after code change |
| AUTHORING examples / comments | Update when touching that file |

### Step 6 — Phase 2 sweep

For each target block:

1. Read `<id>.css` / `<id>.js` / `<id>.md` (and author tiers if they paint color).
2. Replace hardcoded old brand with `var(--ll-…)` when a semantic exists; else
   retarget the hex to the new Figma value and document in `<id>.md`.
3. Rename misleading identifiers only when safe (`--cc-teal-gradient` may keep
   its name but must get new stops — note the rename as optional follow-up).
4. Update fixtures if the block's keeper pages show brand paint.
5. If the block has `## Dependents`, re-check dependents' fixtures.

Hand structural/CSS layout fixes to `lledsue-enhance-block` — this skill only
touches **color values and color-token citations**.

### Step 7 — Surface inventory (`sweep-surface` / audit with surface)

Build the block list from:

1. [`.cursor/figma-references.md`](../../figma-references.md) sections for that
   surface
2. `blocks/*/` that appear in homepage/product fixtures or known page models

Run Phase 2 only on blocks that still have exception hits. Skip clean blocks.

Suggested surface seeds (extend in `reference.md` as audits land):

- **homepage** — home-hero, guarantee, comparison-chart, pdes, articles,
  reviews, value-proposition, awards, footer, top-nav, …
- **product** — product-hero*, product-nav, product-features,
  product-feature-tiles, product-tile*, comparison-chart, faq, accordion,
  breadcrumb, footer, top-nav, …
- **global** — top-nav, footer, header, cookie-consent, styles molecule layer

### Step 8 — Report format

Always end with:

1. **Verdict** — one sentence (e.g. “3 primitives stale; 6 block exceptions”).
2. **Mapping table** — changed + new-token rows (unchanged can be summarized).
3. **Exception ledger** — path, class, proposed fix.
4. **Next command** — exact mode the user should run next
   (e.g. `/lledsue-brand-color-refresh apply-tokens`).
5. **reference.md** — updated if anything new was learned.

Prefer a Cursor canvas for large tables when the audit is the deliverable.

### Step 9 — Lint

When files were edited:

```bash
npm run lint
```

## Routing

| User intent | Skill |
|---|---|
| Brand / theme color refresh | **This skill** |
| Add a new shared color token | `lledsue-create-token` |
| Match layout/spacing/type to Figma | `lledsue-figma-to-code` → enhance/fix |
| Non-color block feature | `lledsue-enhance-block` |
| Broken paint / wrong token pairing (single bug) | `lledsue-fix-block` (or this skill if part of a refresh) |

## Anti-patterns

- Per-page color PRs that re-copy the same primitive retarget.
- Editing every `--ll-color-*` alias instead of `--ds-color-brand-*`.
- Trusting `get_design_context` hexes for brand values.
- “Updating” blocks that only reference `--ll-*` with no hex literals.
- Mixing spacing/typography parity into a color-refresh pass.
- Leaving `reference.md` stale after apply/sweep.

## Cross-references

- [`reference.md`](reference.md) — living map + exception ledger seeds
- [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) — token tiers + Figma mode rules
- [`lledsue-create-token`](../lledsue-create-token/SKILL.md) — new atoms
- [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) — non-color Figma work
- [`.cursor/figma-references.md`](../../figma-references.md) — frame catalogue
