# Brand color refresh — living reference

Source of truth for [`lledsue-brand-color-refresh`](SKILL.md). Update this file
whenever Phase 1 retargets or a Phase 2 exception is fixed.

**Last audited:** 2026-08-05 (product surface re-audit, Core full-page XL `24016:9373`)  
**Last applied:** 2026-07-28 (`apply-tokens` Phase 1)  
**Last swept:** 2026-07-28 (`sweep-surface homepage` + help-me-choose + breadcrumb + steps + product-nav + l-slider + top-nav + product-hero-plans + product-hero-key-features + **sweep-surface product**)  
**Figma files:** `gsZv6vqW7CsHDVT5dSkQ7S` (homepage) · `P0bL9lZts4qeU6w4RHD8En` (product) · `0b9c9OXxLji6nfjHzFg5c7` (global)  
**Product authority node:** `24016:9373` (Core full-page XL)  
**Product-hero right (CTA BOX):** `24016:7728`  
**Product-nav authority node:** `24016:9443` (Nav_Items)  
**Testimonials authority node:** `27013:1444` (homepage Testimonials)  
**Top-nav authority node:** `22123:3708` (Sub Nav_Plans, Global Elements)  
**Homepage authority node:** `27013:891`  
**Theme mode:** LifeLock via `get_variable_defs`  
**EDS brand primitives:** **applied** — `#00445a` / `#017a96` / `#d9e9ee` / `#f7fbfc`  
**Live smoke URL:** `http://localhost:4501/products/lifelock-core`  
**Stage verified:** 2026-08-05 — `https://lifelock-stage.norton.com/styles/styles.css` serves
`#00445a` / `#017a96` / `#d9e9ee` / `#f7fbfc` (Phase 1 is deployed, not just local)

## Method caveat

After the Web-ODS Theme library brand update, Figma semantic `Color/*` variables
resolve to the **new** blues even on older frames. The “Old lock” column is the
LifeLock palette frozen in EDS + block design-lock docs at implementation time.

## Phase 1 — brand primitives

| Role | EDS `--ds-*` | Current EDS hex | Old lock hex | New Figma token(s) | New hex | Status |
|---|---|---|---|---|---|---|
| Brand dark / primary | `--ds-color-brand-dark` | `#00445a` | `#013638` | `Color/Content/primary`, `Color/Background/brand`, `Color/Border/primary`, `Button/primary/bg-default`, `Core…/lifelock-blue` | `#00445a` | **applied** |
| Brand mid / accent | `--ds-color-brand-mid` | `#017a96` | `#108389` | `Color/Content/brand`, `Color/Border/brand`, `Button/primary/border`, `Button/gradient/primary-default-start`, `Core…/ocean-teal-blue` | `#017a96` | **applied** |
| Brand tint / highlight | `--ds-color-brand-tint` | `#d9e9ee` | `#cce5e7` | `Color/Highlight/brand-light`, `Core…/misty-blue` | `#d9e9ee` | **applied** |
| Brand light (cool) | `--ds-color-brand-light-20` | `#f7fbfc` | n/a (new atom) | `Color/Solid Tints/brand-light-20` | `#f7fbfc` | **applied** — design-confirmed 2026-07-28 |
| Brand lighter (warm) | `--ds-color-brand-lighter-20` | `#faf9f5` | `#faf9f5` | `Color/Background/brand-lighter-20` | `#faf9f5` | **applied 2026-08-05** — restored after the two-ladder correction below |
| CTA gradient | `--ll-color-bg-cta-gradient` | `#017a96` → `#00445a` | `#108389` → `#013638` | `Button/gradient/primary-default-start/end` | `#017a96` → `#00445a` | **applied via primitives** |

### Brand-light vs brand-lighter — two ladders, not duplicates (corrected 2026-08-05)

> **Supersedes the 2026-07-28 entry** that called `Color/Background/brand-lighter-20`
> (`#faf9f5`) a "stale duplicate name" and said not to add a warm atom. That was
> wrong: the variable is live and bound on real product surfaces. Both values now
> ship as separate atoms.

Figma carries **two independent tint ladders** whose names differ by one letter:

| Ladder | Figma tokens | Hex | Hue | EDS atom |
|---|---|---|---|---|
| **brand-light** | `Solid Tints/brand-light-20` | `#f7fbfc` | cool blue | `--ds-color-brand-light-20` |
| | `Solid Tints/brand-light-60` | `#e8f2f5` | cool blue | *(no atom yet)* |
| **brand-lighter** | `Background/brand-lighter-20` | `#faf9f5` | warm ivory | `--ds-color-brand-lighter-20` |
| | `Solid Tints/brand-lighter-40` | `#f6f3ec` | warm | *(no atom yet)* |
| | `Solid Tints/brand-lighter-80` | `#ede7d9` | warm | *(no atom yet)* |
| | `Background/brand-lighter` | `#e8e1cf` | warm cream | `--ds-color-accent-cream-warm` |

Semantics: `--ll-color-bg-brand-light` (cool) and `--ll-color-bg-brand-lighter` (warm).

**Role split observed on the product pages:** cool `brand-light` is the *active /
brand-tinted* surface; warm `brand-lighter` is the *resting card* surface that
replaced `Color/Background/secondary` (`#f8f8f7`). `#f8f8f7` is still live for
smaller chrome (e.g. steps bullets), so do **not** globally retire it.

**How to tell them apart:** a node dump frequently lists *both*. Never pick by
name — pixel-sample the rendered node (`get_screenshot` + dominant-color count).
`#faf9f5` = (250,249,245) warm; `#f7fbfc` = (247,251,252) cool; `#f8f8f7` =
(248,248,247) neutral. They are within a manhattan delta of 5–12, so visual
eyeballing is not reliable.

**Naming caveat:** FAQ's authored option value and CSS class are still
`brand-lighter` while resolving to the cool `--ll-color-bg-brand-light`. Left
deliberately for authored-content back-compat; rename only via content migration.

Related (unchanged): `Color/Background/inverse-secondary` `#017a96` →
`--ll-color-bg-brand-accent`.

### Semantic aliases that cascade (do not hand-edit)

**From `--ds-color-brand-dark`:**  
`--ll-color-brand-primary`, `--ll-color-bg-brand`, `--ll-color-bg-inverse`,
`--ll-color-text-primary`, `--ll-color-text-link-hover`,
`--ll-color-border-on-brand`

**From `--ds-color-brand-mid`:**  
`--ll-color-brand-secondary`, `--ll-color-bg-brand-accent`,
`--ll-color-text-brand`, `--ll-color-border-brand`, `--ll-color-border-focus`,
`--ll-color-focus-ring`

**From `--ds-color-brand-tint`:**  
`--ll-color-highlight-brand-light`

**From `--ds-color-brand-light-20` (cool):**  
`--ll-color-bg-brand-light`

**From `--ds-color-brand-lighter-20` (warm):**  
`--ll-color-bg-brand-lighter`

## New Figma tokens — no EDS atom yet

Confirm with design before `lledsue-create-token`:

| Figma token | Hex | Suggested EDS name (TBD) | Notes |
|---|---|---|---|
| `Color/Solid Tints/brand-light-60` | `#e8f2f5` | e.g. `--ds-color-brand-light-60` | Dominant light section wash on new homepage. Cool ladder — sibling of the shipped `--ds-color-brand-light-20`. |
| `Color/Solid Tints/brand-lighter-40` | `#f6f3ec` | e.g. `--ds-color-brand-lighter-40` | Warm lighter tint |
| `Color/Solid Tints/brand-lighter-80` | `#ede7d9` | e.g. `--ds-color-brand-lighter-80` | Deeper warm tint |

## Unchanged (homepage dump — skip in retarget)

| Figma token | Hex | EDS mapping |
|---|---|---|
| `Color/Content/secondary` | `#161616` | `--ll-color-text-secondary` ← `--ds-color-neutral-800` |
| `Color/Content/inverse-primary` | `#ffffff` | `--ll-color-text-inverse` |
| `Color/Background/primary` | `#ffffff` | `--ll-color-bg-default` |
| `Color/Background/tertiary` / `Color/Border/tertiary` / `Color/Shadow/primary` | `#e3e3e2` | `--ds-color-neutral-150` family |
| `Color/Background/delta` | `#cdcccb` | `--ds-color-neutral-200` |
| `Color/Highlight/theta-base` | `#607e95` | `--ds-color-highlight-theta` |
| `Color/Highlight/iota-base` | `#8c9a9a` | `--ds-color-highlight-iota` |
| `Color/Highlight/beta-base` | `#4a5d73` | `--ds-color-highlight-beta` |
| `Color/Signal/success` | `#16a761` | `--ds-color-status-success` |
| `Color/Signal/info` | `#0f71f0` | (PDES opt-in; no `--ll-color-signal-info` yet) |
| sand / cream warm | `#f5f2eb` / `#e8e1cf` | `--ds-color-accent-sand` / `-cream-warm` |
| elevation | `#00000026` | `--ds-color-elevation-tint` |
| `Button/secondary/bg-default` | `#f8f8f7` | `--ds-color-neutral-100` / `--ll-color-bg-muted` |

## Naming collisions + open design questions (2026-08-05, product `24016:9373`)

Figma token names that do **not** mean what the like-named EDS semantic means.
Never pair these by name — pair by resolved value.

| Figma token | Figma hex | Like-named EDS token | EDS resolves to | Verdict |
|---|---|---|---|---|
| `Color/Border/secondary` | `#161616` | `--ll-color-border-secondary` | `#e3e3e2` (neutral-150) | **Collision.** Figma's value pairs to `--ll-color-border-strong`. Do not repoint `--ll-color-border-secondary` (its one consumer, `product-hero-key-features`, wants the light rule). |
| `Color/Disabled/tertiary` | `#e3e3e2` | `--ll-color-border-disabled` | `#cdcccb` (neutral-200) | No EDS atom at this value in the disabled family; `#e3e3e2` = neutral-150. Only wire up if a disabled surface actually needs it. |
| `Color/Background/brand-lighter-20` | `#faf9f5` | `--ds-color-brand-lighter-20` | `#faf9f5` | **Resolved 2026-08-05** — was wrongly called a stale duplicate; it is the warm ladder. Atom restored to `#faf9f5`; the cool `#f7fbfc` moved to `--ds-color-brand-light-20`. |

### `Button/text link/*` — open question (no EDS pair)

Product node dumps `Button/text link/dark/default` = `#017a96` (brand mid, links on
light) and `Button/text link/light/default` = `#d9e9ee` (brand tint, links on dark).

EDS `--ll-color-text-link` = `--ds-color-highlight-theta` `#607e95`, which drives
both the global `:where(a:any-link)` color **and** the `.button.accent` fill.

Screenshot sampling of `24016:9373` finds **both** `#017a96` and `#607e95` present,
so this is not a clear regression: theta still appears to be the inline body-link
colour, while `Button/text link/*` is a *text-link button component* token with no
EDS variant today. `footer.md` already records the same mismatch for footer links.

**Action:** confirm with design whether inline links stay `#607e95` or move to
`#017a96`. Do **not** repoint `--ll-color-text-link` unilaterally — it would also
recolour every `.button.accent` fill.

## Phase 2 — exception ledger

### Homepage surface — cleared 2026-07-28

| Path | Class | Fix | Status |
|---|---|---|---|
| `styles/styles.css` `--ds-color-brand-*` | Phase 1 | retarget | **applied** |
| `test/fixtures/tokens/color/index.html` | fixtures | captions | **applied** |
| `comparison-chart.css` `--cc-teal-gradient` | component gradient | `#017a96` → `#00445a` | **swept** |
| `pdes.css` `--pdes-result-cta-bg` | component gradient | same stops | **swept** |
| `pdes.css` attribute/focus tint | hardcoded RGB | `color-mix` on `--ll-color-text-primary` | **swept** |
| `articles.css` hover shadow | hardcoded RGB | `color-mix` 12% | **swept** |
| `faq.css` fallbacks | hardcoded fallback | `#017a96` / `#f7fbfc` | **swept** |
| `footer.css` comments | citation | refreshed hex | **swept** |
| `icons/…/simple-plus\|minus-green.svg` | asset fill | `#017a96` | **swept** |
| Homepage fixtures (`top-nav`, `pdes`, `value-proposition`, `comparison-chart` anchors) | fixture chrome | retargeted | **swept** |
| Homepage block `.md` / `top-nav.css` / `l-tmlayout` AUTHORING citations | docs | refreshed | **swept** |

Optional follow-up: rename `--cc-teal-gradient` → brand-neutral name (cosmetic).

### Still open (other surfaces — not this sweep)

| Path | Class | Notes | Status |
|---|---|---|---|
| `blocks/help-me-choose/help-me-choose.css` | hover / progress / section wash | semantic + color-mix + `#e8f2f5` | **swept 2026-07-28** |
| `blocks/breadcrumb/*` docs + fixtures | docs/fixtures citations | `#d9e9ee` / `#00445a` | **swept 2026-07-28** |
| `product-nav` CSS selected color | component | → `--ll-color-text-primary` (`#00445a`) | **swept 2026-07-28** |
| `product-nav.md` cites `#108389` | docs | → `#00445a` / text-primary | **swept 2026-07-28** |
| `product-hero*` / `product-features` / `product-feature-tiles` `.md` | docs | design-lock hexes → `#00445a` / DAM mid note | **swept 2026-07-28** (surface) |
| `product-hero-plans` selected border / icon | component | → `--ll-color-border-on-brand` / `--ll-color-text-primary` (`#00445a`) | **swept 2026-07-28** |
| `test/fixtures/product-feature-tiles/anchor-target.html` | fixtures | gradient chrome → `#00445a` | **swept 2026-07-28** |
| `test/fixtures/product-hero-key-features/all.html` | fixtures | `#013638` → `#00445a` | **swept 2026-07-28** |
| `product-hero-key-features.md` | docs | historical primary citation refreshed | **swept 2026-07-28** |
| DAM pre-colored product-features icons (`#108389` fills) | DAM / asset | design/DAM refresh to `#017a96`; no CSS recolor | open — asset follow-up |
| `blocks/steps/steps.css` active bullet/card/icon/connector | component colors | mid mixes → brand-light (cool) + border-on-brand / text-primary | **swept 2026-07-28**, re-pointed to `brand-light` 2026-08-05 (Figma `24016:9839`) |
| `blocks/steps/steps.css` **inactive** card | component color | `--ll-color-bg-muted` `#f8f8f7` → `--ll-color-bg-brand-lighter` `#faf9f5` (bullets stay muted) | **swept 2026-08-05** (Figma `24016:9839`) |
| `blocks/product-features/product-features.css` group pill | component color | `--ll-color-bg-muted` `#f8f8f7` → `--ll-color-bg-brand-lighter` `#faf9f5` | **swept 2026-08-05** (Figma `24016:9546`) |
| `testimonials` card fallback `#0f1419` | component hex | near-black poster fallback — **not** old brand; keep unless design supplies a token | note |
| `top-nav.md` cites `#108389` / `#013638` | docs | → `#017a96` / `#00445a` | **swept 2026-07-28** |
| `l-slider` arrow border/color (used by testimonials) | dependent | ghost `#00445a` → text-primary + border-on-brand | **swept 2026-07-28** |
| Solid tint atoms (`brand-light-60` etc.) | new-token-needed | confirm with design | open |

### Grep seeds (post-homepage)

```bash
rg -n '#013638|#108389|#cce5e7' blocks styles icons test --glob '!node_modules'
rg -n 'cc-teal-gradient|1 54 56' blocks --glob '*.{css,js,md}'
```

`#faf9f5` was dropped from these seeds on 2026-08-05. It used to be an old-lock
hex (Phase 1 retargeted `--ds-color-brand-lighter-20` away from it), but the
two-ladder correction restored it as the **current** warm value — grepping for it
now only produces false positives.

## Surface → block inventory

### homepage — swept

`home-hero`, `guarantee`, `comparison-chart`, `pdes`, `articles`, `reviews`,
`value-proposition`, `awards`, `steps`, `cards-icon`, `footer`, `top-nav`,
`faq` (fallbacks), global buttons; icon plus/minus green SVGs

**`testimonials` audited 2026-07-28** (`27013:1444`): intro/quote/play use
semantics that match Figma (`text-secondary`, `text-inverse`). No old-lock
hex in block CSS/docs/fixtures. Active dots cascade `--ll-color-brand-secondary`
(Phase 1 mid). Card `#0f1419` is non-brand near-black. Figma still dumps
`Color/Content/primary` as `#013638` on nav-prev for this node while
`Button/ghostPrimary/border` is `#00445a` — treat primary dump as stale/partial;
do not revert Phase 1. Arrow chrome: `l-slider` swept to text-primary /
border-on-brand (2026-07-28).

**`top-nav` swept 2026-07-28** (`0b9c9OXxLji6nfjHzFg5c7` / `22123:3708`
Sub Nav_Plans): CSS already semantic — open Plans = `Content/brand`
`#017a96` → `--ll-color-text-brand`; open pill bg = `Background/secondary`
`#f8f8f7` → `--ll-color-bg-muted`; Compare plans border = `Border/secondary`
`#161616` → `--ll-color-border-strong`. Docs citations → `#017a96` / `#00445a`.

### product — swept 2026-07-28

**Blocks:** `product-hero*`, `product-nav`, `product-features`,
`product-feature-tiles`, `product-tile`, `comparison-chart` (shared), `faq`,
`accordion`, `breadcrumb`, `steps`, `footer`, `top-nav`

**CSS:** Phase 1 cascade + plans/nav selected → primary. No remaining old-lock
hex in product-surface block CSS.

**Docs/fixtures:** product-feature-tiles / product-features / plans historical
cites + fixtures refreshed this sweep. **Still open:** DAM-baked icon fills at
old mid `#108389` (product-features) — asset pipeline, not block CSS.

**`product-nav` swept 2026-07-28** (`24016:9443` Nav_Items): selected →
`--ll-color-text-primary` (`Color/Content/primary` `#00445a`).

**`product-hero-plans` swept 2026-07-28** (`24016:7728` CTA BOX): selected →
`--ll-color-border-on-brand` + `--ll-color-text-primary`.

### global

`top-nav` / `footer` / molecule layer — cascaded; product docs cleared above.

## Audit log

| Date | Surface / node | Mode | Outcome |
|---|---|---|---|
| 2026-07-28 | homepage `27013:891` vs EDS | audit | 3 primitives + CTA gradient retarget; solid-tint gaps; Phase 2 ledger seeded |
| 2026-07-28 | `styles/styles.css` + token fixtures | apply-tokens | Brand primitives applied |
| 2026-07-28 | homepage blocks + icons + fixtures/docs | sweep-surface homepage | Gradients, RGB tints, FAQ fallbacks, icon fills, homepage docs/fixtures cleared |
| 2026-07-28 | `help-me-choose` | sweep help-me-choose | Hover → `--ll-color-highlight-brand-light`; progress track `color-mix` on brand; section wash `#e8f2f5` |
| 2026-07-28 | `breadcrumb` | sweep breadcrumb | CSS already semantic; design-lock + `first-in-footer` fixture hexes → `#d9e9ee` / `#00445a` |
| 2026-07-28 | steps in accordion How-to-subscribe `24016:9839` | sweep steps | Active paints: brand-lighter + border-on-brand; icon/connector → primary `#00445a` (was mid mixes) |
| 2026-07-28 | `product-nav` `24016:9443` Nav_Items | audit | Selected should be `--ll-color-text-primary` not `-brand`; bg/default match; docs `#108389` stale |
| 2026-07-28 | `product-nav` | sweep product-nav | Selected → `--ll-color-text-primary`; docs hex refreshed |
| 2026-07-28 | `testimonials` `27013:1444` | audit | Block clean (semantics match); `#0f1419` non-brand note; l-slider arrow ghost `#00445a` vs border-strong open; Figma Content/primary still `#013638` on nav (stale dump) |
| 2026-07-28 | `l-slider` arrows (testimonials Figma nav) | sweep l-slider | Enabled arrow → `--ll-color-text-primary` + `--ll-color-border-on-brand` (`#00445a` ghost) |
| 2026-07-28 | `top-nav` `0b9c9OXxLji6nfjHzFg5c7` / `22123:3708` | audit | CSS matches new brand via `--ll-color-text-brand` / muted / border-strong; docs `#108389`/`#013638` stale only |
| 2026-07-28 | `top-nav` | sweep top-nav | Docs-only: open/focus `#017a96`, bg-inverse citation `#00445a`; CSS unchanged |
| 2026-07-28 | `product-hero` CTA BOX `24016:7728` (l-split-sticky right) | audit | Plans selected border/icon should be primary `#00445a` not mid; CTA gradient OK; docs/fixtures stale |
| 2026-07-28 | `product-hero-plans` | sweep product-hero-plans | Selected → border-on-brand + text-primary; design-lock docs refreshed |
| 2026-07-28 | `product-hero-key-features` | sweep product-hero-key-features | Docs + `all.html` fixture chrome `#013638` → `#00445a`; CSS already semantic |
| 2026-07-28 | product surface | sweep-surface product | Docs/fixtures (feature-tiles, features DAM notes, plans history); CSS already clean; DAM icons still open |
| 2026-08-05 | product `24016:9373` + stage `lifelock-core` | audit (re-run) | **No regressions.** Stage serves applied palette; zero old-lock hex in code (remaining hits are `--ds-color-brand-deep` atom + historical doc citations). New: `Button/text link/*` has no EDS pair (design question); `Color/Border/secondary` + `Color/Disabled/tertiary` name collisions documented. Still open: DAM icon fills, solid-tint atoms |
| 2026-08-05 | product-features pill `24016:9546` + steps `24016:9839` | apply-tokens + sweep | **Two-ladder correction.** Reversed the 2026-07-28 "stale duplicate" call: `Color/Background/brand-lighter-20` `#faf9f5` is live and bound, not stale. Split the merged atom → `--ds-color-brand-light-20` `#f7fbfc` (cool, new) + `--ds-color-brand-lighter-20` `#faf9f5` (warm, restored), added `--ll-color-bg-brand-light`. Repointed FAQ band + steps active card/bullet to cool (values unchanged); product-features group pill + steps **inactive** card `#f8f8f7` → `#faf9f5` (the visible fix). Verified by pixel-sampling, not by token name. |
