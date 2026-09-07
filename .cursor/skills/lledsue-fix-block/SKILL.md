---
name: lledsue-fix-block
description: Diagnose and fix bugs in an existing AEM EDS block - layout shifts, broken Universal Editor editing, missing instrumentation, accessibility regressions, DOM/CSS mismatches, or three-phase loading regressions. Inspects authored markup vs rendered DOM, applies the minimal fix, and verifies. Use when the user reports a block is broken, looks wrong, has a CLS or layout problem, breaks in Universal Editor, or fails lint.
---

# lledsue-fix-block

Bug-fix sibling of `lledsue-enhance-block`. The difference: this skill always starts with reproduction and diagnosis before changing a single line. The fix is the smallest possible change.

## Is this a complex block?

Before diagnosing, check if the block is a **complex block** (per [`lledsue-complex-blocks`](../../../.cursor/rules/lledsue-complex-blocks.mdc)). Complex blocks ship the two-mode quintet with named `decorate` + module-private `wire` in `<id>.js`:

```
blocks/<id>/<id>.js              ← decorate + wire + decorateAndWire
blocks/<id>/<id>.author.js       ← authorize calls decorate only
blocks/<id>/<id>.author.css
blocks/<id>/<id>.css
blocks/<id>/_<id>.json
```

If `<id>.js` exports both `decorate` and `decorateAndWire`, the block is complex. Run the decorate-vs-wire triage **before** the standard diagnostic checklist:

| Symptom | Likely culprit |
|---|---|
| Block looks wrong on first paint, region order broken, item appearing in wrong region, missing items | `decorate` (or a marker's `annotate` / `collectScope`) |
| Item editing in UE doesn't persist, `data-aue-*` attributes missing on rendered nodes | `decorate` - missing `moveInstrumentation` on a relocated authored node |
| Markers invisible in UE / no labeled pill | Marker CSS, OR `document.body.dataset.ueMode` not set (check [scripts/scripts.js](../../../scripts/scripts.js) `loadEager`) |
| Click does nothing, drawer doesn't open, observer doesn't fire | module-private `wire` in `<id>.js` |
| Doc-level listeners pile up after navigation, memory leaks | `wire` - missing teardown OR `wire` running in author mode (check `<id>.author.js` is not calling `wire`) |
| Sticky / variant-swap MutationObserver mistargets | `wire` |
| Block visible in UE but blank on published site | `decorate` may be throwing, or `wire` assumes DOM `decorate` never built |
| Orphan content item before a marker isn't warned | Parser validation in `decorate` or in the marker's `collectScope` |

For complex blocks, **also read every marker block referenced in the parent's filter** (`blocks/<marker-id>/` folders) before applying any fix - many "decorator bugs" turn out to be marker bugs.

Bug-fix invariants for complex blocks:

- Do NOT add an `if (isUniversalEditor()) return;` early return to `decorate` as a "fix." Author mode loads `<id>.author.js`, which calls `decorate` without `wire`. Move UE-hostile DOM ops into `wire`, or remove them.
- Do NOT call `wire` from `<id>.author.js`.
- Do NOT call `addEventListener` from `decorate`. Move it to `wire`.

## Required inputs

- **Block name** - the affected block id under `blocks/`. If the user says "the menu broke", grep block names against the description and confirm.
- **Symptom** - what they see vs what they expect. Capture both. If only one is given, ask for the other.
- **Where** - URL/path on `localhost:4501` or the preview environment, or a Universal Editor screenshot.

If the symptom is actually a feature request ("can it also do X?"), hand off to `lledsue-enhance-block`.

## Diagnostic checklist

Walk through this in order. Stop as soon as the root cause is identified - do not "fix" things that aren't broken.

```
- [ ] Step 0: Doc-vs-CSS reconciliation (visual / spacing / typography bugs on blocks that ship a <id>.md)
- [ ] Step 1: Reproduce the symptom
- [ ] Step 2: Inspect authored HTML (curl <path>.plain.html)
- [ ] Step 3: Inspect decorated DOM in the browser
- [ ] Step 4: Compare against the block's expected initial structure
- [ ] Step 5: Check Universal Editor instrumentation
- [ ] Step 6: Check CSS scoping and token usage
- [ ] Step 7: Check accessibility regressions
- [ ] Step 8: Check three-phase loading (eager/lazy/delayed) placement
- [ ] Step 9: Apply minimal fix
- [ ] Step 9.5: If the bug exposed a missing fixture variant, add it under test/fixtures/<name>/
- [ ] Step 10: Re-run npm run lint and verify
```

### Step 0: Doc-vs-CSS reconciliation

**Applies to any visual / spacing / typography / structural bug on a block that ships a `<id>.md`.** Skip for pure behavior bugs (UE instrumentation loss, click handlers, script errors) - those go straight to Step 1.

For applicable bugs, the shipped CSS and the block's own design-lock table are the two sources of truth about intent. When they disagree, the disagreement is often the bug itself - the CSS was written from a stale plan and the doc was never updated, or the CSS was retrofitted and the doc was never updated to match, or an earlier "fix" zeroed a value the doc still describes as required. Reconcile before diagnosing.

Workflow:

1. `Read` [`blocks/<name>/<name>.md`](../../../blocks/) and find the "Design lock-in" table (or equivalent design-intent section).
2. `Read` [`blocks/<name>/<name>.css`](../../../blocks/) (plus `<name>.author.css` if the bug involves author mode).
3. For each row of the design-lock table, spot-check the corresponding CSS declaration. Two failure modes to flag:
   - **Doc says X, CSS says Y.** Contradiction. This is a strong candidate for the reported bug even if the user described the symptom differently. Example: `product-feature-tiles.md` said "first step's border is the divider"; the CSS shipped `.__step:first-child { border-top: 0 }`. Users reporting "missing divider between How it works and step 1" -> Step 0 would have surfaced this instantly.
   - **Doc silent, CSS has a rule with no rationale.** Weaker signal but worth flagging. If Step 1 reproduces the symptom and Step 2-8 do not find a cause, come back to any un-doc'd CSS rule.
4. Write a short list of contradictions before touching Step 1. These become the first suspects.

If the block has no `<name>.md` (older blocks, migration in progress), skip Step 0 and proceed to Step 1. Log it as a follow-up to backfill the doc per [`.cursor/rules/lledsue-comment-discipline.mdc`](../../../.cursor/rules/lledsue-comment-discipline.mdc).

### Step 1: Reproduce

Confirm the dev server is up:

```bash
ls /Users/Piseth.Peou/.cursor/projects/Users-Piseth-Peou-codes-eds-ll-lledsue-active/terminals
```

If a terminal is already running `aem up`, reuse it. Otherwise start it in the background:

```bash
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
```

Hit the page once with `curl -sI http://localhost:4501/<path>` to confirm a 200.

### Step 2: Inspect authored HTML

```bash
curl -s http://localhost:4501/<path>.plain.html | head -200
```

Look for the block's div structure. The authored DOM is the contract - the JS must handle exactly this shape (with optional missing fields).

### Step 3: Inspect decorated DOM

Either open dev tools at `http://localhost:4501/<path>` and capture the relevant subtree, or temporarily add a `console.log(block.outerHTML)` at the top of `decorate()`. Remove the log once you're done.

### Step 4: Compare against the expected initial structure

Read the block's `decorate()` function. The JS encodes assumptions about row/cell counts and child types. The most common bug: an extra or missing `div` because the model changed but the JS didn't.

### Step 5: Check Universal Editor instrumentation

If the symptom is "edits don't stick" or "block disappears in editor":

- Search the JS for `moveInstrumentation`. If absent and the block restructures DOM (`replaceChildren`, `replaceWith`, `append` of new nodes), that's the bug.
- Confirm `data-aue-*` attributes survive on the final DOM by checking the rendered output.
- Verify `editor-support.js` is loaded (it lives in [scripts/editor-support.js](../../../scripts/editor-support.js) and Universal Editor wires it).

### Step 6: Check CSS scoping and token usage

If the symptom is visual:

- Search CSS for unscoped selectors (e.g. `ul {`) - they leak into other blocks.
- Search for `.<name>-container` or `.<name>-wrapper` in the block's own CSS - those classes are framework-owned and using them indicates a misunderstanding.
- Check whether literals (`#dadada`, `24px`, `1200px`) should be tokens. If yes, hand off to `lledsue-create-token` after the fix.
- When re-deriving a token value from Figma, resolve it against **THEME: `LifeLock`** with `get_variable_defs` (not `get_design_context` inline hexes - a wrong-mode hex is itself a common cause of "color looks off" bugs). See [`lledsue-atomic-design`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Figma token extraction (mode-aware)".

**Wrong-value fixes are Figma-first, not "change X to Y".** If the bug is a wrong pixel value (radius, spacing, gap, color, font-size), the correct workflow is:

1. Run [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) against the Figma frame to produce the full manifest (tier inventory → layout sheets → spacing/atom CVars).
2. Apply the manifest's value + token pairing (and layout ownership), not just "the number the user asked for".
3. In the fix commit's PR description, include the resolved token(s) and their pixel values so reviewers can grep-verify:

   ```
   Fix: pft tile radius
   - was: border-radius: var(--ll-radius-md)  (6px)
   - now: border-radius: var(--ll-radius-card)  (8px, matches Figma)
   - verified: rg -n '\-\-ll-radius-card:' styles/styles.css -> --ds-radius-l -> 8px
   ```

Value-fix regressions are almost always plan-time errors  the original author paired a Figma pixel value with a same-shape-different-value token by name-resemblance. The grep-verify step in [`.cursor/rules/lledsue-atomic-design.mdc`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Token-value verification gate" would have caught the original mismap, and re-doing the manifest ensures the fix carries the right token, not just the right pixel.

**Wrong-structural fixes are also Figma-first.** Missing dividers, missing borders, missing backgrounds, wrong alignment - these look like "the CSS forgot to add a `border-*`" but the diagnosis pattern is the same as wrong-value fixes: extract the frame tree from Figma before diffing against your prior CSS. Concretely:

1. Run [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) Steps 0–1 (tier inventory + layout sheets + structural cue matrix) against the Figma frame. Do NOT open the block's existing CSS first  the prior CSS may already carry the bug (a divider zeroed, an alignment stripped, a border rule that was never added, a child margin that should be parent gap).
2. Compare the fresh layout sheets and structural cue matrix against the shipped CSS. Every cue / layout decision in those sheets that has no corresponding CSS declaration is a candidate fix.
3. Do NOT trust `.step:first-child { border-top: 0 }` (or similar zero-out rules) as intentional just because it exists in the file. Cross-check every zero-out against the fresh matrix; if the matrix says the divider should render, the zero-out is the bug.

Structural-fix regressions are the twin of value-fix regressions: the prior CSS was written from an approximate Figma read that skipped the frame-tree walk, and the missing cue survived every subsequent pass because no one re-extracted it. Re-doing Steps 0–1 of `lledsue-figma-to-code` ensures the fix carries the right tier ownership and cues, not just the right typography. See [`.cursor/rules/lledsue-atomic-design.mdc`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Figma Atomic Extraction", "Structural cue extraction is mandatory", and "Past code is not a source of truth on Figma-driven re-visits".

### Step 7: Accessibility

- Heading hierarchy intact?
- `<img alt>` present (or `aria-hidden` for decorative)?
- Interactive elements keyboard-reachable, focus visible?
- ARIA on toggles/disclosures (the header block is the reference: `aria-expanded`, `aria-controls`, `aria-label`)?
- **Hide/show focus order:** if the block collapses/expands/shows/hides/moves content off-screen, content inside a **closed** region MUST be unreachable by keyboard and screen reader. A region clipped only with `overflow:hidden` / `max-height:0` / `grid-template-rows:0fr` / `transform` / `opacity:0` still leaves its links, buttons, and nested-block triggers focusable - a WCAG 2.4.3 failure. The fix is `visibility:hidden` / `display:none` / the `hidden` or `inert` attribute on the closed region (see [`.cursor/rules/lledsue-component-anatomy.mdc`](../../../.cursor/rules/lledsue-component-anatomy.mdc) "Hidden content must be unreachable" and [`.cursor/rules/lledsue-eds-js-guardrails.mdc`](../../../.cursor/rules/lledsue-eds-js-guardrails.mdc) "Hide/show keeps hidden content unreachable"). Prove it with the focus check in [`.cursor/rules/lledsue-testing.mdc`](../../../.cursor/rules/lledsue-testing.mdc) "Verifying hide/show focus control".

### Step 8: Three-phase loading

If the symptom is "slow LCP" or "block flashes unstyled":

- Block in the first section -> loads in eager phase. Keep its JS and CSS minimal.
- Block in section 2+ -> loads in lazy phase, blocks should not block it.
- Anything genuinely deferrable (martech, analytics, third-party iframes) belongs in [scripts/delayed.js](../../../scripts/delayed.js).
- Global guard at lines 91-99 of [styles/styles.css](../../../styles/styles.css) hides header/footer until `data-block-status="loaded"`. If the block throws, status never updates and the block stays hidden.

### Step 9: Apply minimal fix

Smallest change that fixes the symptom. Resist the urge to refactor. If you find adjacent issues, list them in the "follow-up" section but don't fix them in this skill - that's `lledsue-enhance-block`.

**Before shipping, check the block's `<name>.md` for a `## Dependents` section.** If another block reuses this one's code (e.g. `accordion` is reused by `faq`), the listed reuse surface (JS exports + return shapes, DOM contract, CSS classes) is a public API. If your minimal fix changes any of it, read every dependent and fix them in the **same change**, then verify their fixtures too. If the block has a `## Depends on` section, confirm your fix still matches the provider. See [`.cursor/rules/lledsue-block-tiers.mdc`](../../../.cursor/rules/lledsue-block-tiers.mdc) "Cross-block dependencies (Depends on / Dependents ledger)".

#### Non-goal re-classification (before you write the fix)

If the fix plan lists **non-goals** ("no header restructure", "no DOM changes", "no icon-asset swap", "no new tokens"), walk each one and re-classify it into one of two buckets:

- **DOM restructure needed** (stays out of scope) - the Figma-visible outcome requires new elements, moved elements, changed semantic tags, or new authored markers. Example: "kicker + close on the same visual row" IS a restructure - the kicker and close currently live in separate DOM subtrees; putting them on one line requires a new wrapper `<div>`.
- **Cosmetic-only** (move INTO scope) - the Figma-visible outcome can be produced by a CSS-only change on the existing DOM: `border-*`, `padding`, `margin`, `align-self`, `gap`, `background`, `font-*`, `color`. Example: "divider line under the kicker" is cosmetic-only  it is a `border-block-end` on the kicker (or `border-block-start` on the next sibling), NOT a `<hr>` insertion.

Cosmetic-only work masquerading as "restructure" is the most common cause of multi-round Figma parity misses: the plan author saw a Figma structural difference and declared the whole thing out of scope, when in fact a single CSS declaration would have produced the visible outcome. The `product-feature-tiles` SM kicker→title divider is the reference miss  the fix plan wrote "No changes to the header structure" as a non-goal, but the divider was one `border-block-start` on the title.

For every non-goal that survives re-classification as "DOM restructure needed", write one sentence explaining WHY the DOM restructure is required (not just "matches Figma"). If you cannot write that sentence, the non-goal is really cosmetic-only  move it in scope.

### Step 9.5: Backfill the fixture if the bug exposed a coverage gap

If the bug reproduced because `test/fixtures/<name>/` did not have a page exercising the broken variant, the fixture is missing coverage. Per the sync contract in [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures":

- Add a fixture file (or section of `all.html`) that reproduces the broken variant statelessly.
- Link it from `test/fixtures/<name>/index.html`.
- Verify the fixture renders the fixed behavior under `http://localhost:4501/test/fixtures/<name>/<variant>`.

If the bug was purely internal (e.g. a UE instrumentation regression that any fixture variant would have caught) and the existing fixture covers the variant, this step is a no-op.

If the block has no `test/fixtures/<name>/` folder at all yet, log it as a follow-up and route the user to `lledsue-create-block`'s fixture step. Do not block the bug fix on bootstrapping the fixture folder.

### Step 10: Verify

```bash
npm run lint
```

Reload the page and confirm:

- The original symptom is gone.
- Universal Editor still loads the block (open it in UE if applicable).
- No new console errors in `--forward-browser-logs` output.

## Common-failure cookbook

### "Content shifts down when the menu/drawer opens"

Cause: the menu is in document flow on open. Fix: use `position: absolute` or `position: fixed` with `inset` for the open state. Existing reference: [blocks/header/header.css](../../../blocks/header/header.css) sets `position: fixed` on `.nav-wrapper` for mobile. Do not change `display: none` to `display: block` on a non-positioned element if you care about CLS.

### "Universal Editor edits don't persist"

Cause: missing `moveInstrumentation` after restructuring DOM. Fix: import from [scripts/scripts.js](../../../scripts/scripts.js) and call it before each authored node is detached or replaced. Reference: [blocks/cards/cards.js](../../../blocks/cards/cards.js).

### "Block stays hidden / unstyled in editor"

Cause: `decorate()` threw, so `data-block-status` never reaches `loaded`. Fix: wrap risky DOM accesses in optional chaining; never assume an authored field exists. Check the browser console for the actual error.

### "Lint fails on `_<name>.json`"

Cause: eslint-plugin-xwalk rule violation - usually missing `valueType` or invalid `resourceType`. Fix: consult https://github.com/adobe-rnd/eslint-plugin-xwalk?tab=readme-ov-file#rules and add the missing key. After any JSON edit, run `npm run build:json`.

### "Block class changes when an author types into a field"

Symptom: author edits a field (e.g. types "USA" into a `name` field on some block) and the rendered DOM mutates - the block's own class gets replaced by the slugified field value (so `<div class="card">` becomes `<div class="usa">`), `.card-wrapper` becomes `.usa-wrapper`, the block's CSS / JS / decorate logic stop matching, and the framework even tries to load a non-existent `blocks/usa/usa.js`.

Cause: the field's `name` (the field key, not the label) is one of AEM's reserved resource keys. `decorateBlock` in `scripts/aem.js` reads `block.classList[0]` as the block name; AEM serializes the block class from the resource's `name` property; if a model field is named `name`, it overwrites that property whenever an author edits it. Empirically reproduced - see git log for the original "reserved-key" investigation.

Fix: in `_<name>.json`, change the field key from `name` to `label` (or another non-reserved key like `title`, `displayName`). The user-visible field label can stay the same. Also rename the corresponding variables in `<name>.js` to keep the code readable. After the fix, run `npm run build:json` and `npm run lint`. Authors who already entered values into the old `name` field will need to re-enter them under the new key (UE keys field data by field name, not by position).

Full table of reserved keys (`name`, `classes`, `id`, `model`, `template`, `path`, `resourceType`) and recommended replacements: [.cursor/rules/lledsue-block-conventions.mdc](../../../.cursor/rules/lledsue-block-conventions.mdc) "Reserved field keys".

### "Keyboard focus lands on invisible links inside a collapsed accordion / drawer / tab"

Symptom: tabbing through a page stops on controls that aren't visible - they live inside a collapsed accordion item, a closed drawer, or an inactive tab panel. Screen readers announce them too.

Cause: the closed region is hidden by **visual clipping only** (`overflow:hidden` + `max-height:0`, `grid-template-rows:0fr`, `transform` off-screen, `opacity:0`). Clipping does not remove descendants from the tab order or the accessibility tree.

Fix: add `visibility:hidden` (animatable, with a delayed `visibility` transition so the close animation still plays), `display:none`, or toggle the `hidden`/`inert` attribute on the closed region; keep `aria-expanded` in sync. For content the project inlines for crawlers (baked fragment content), `visibility:hidden` is still correct - the HTML ships, but keyboard/SR users can't reach it while closed. Empirically reproduced on the accordion (nested + multi-instance); the verified fix lives in [blocks/accordion/accordion.css](../../../blocks/accordion/accordion.css). Full contract: [.cursor/rules/lledsue-component-anatomy.mdc](../../../.cursor/rules/lledsue-component-anatomy.mdc) "Hidden content must be unreachable". Verify with the focus-order Playwright check in [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc).

### "Block flashes unstyled before render"

Cause: critical CSS for the block is in `lazy-styles.css` instead of the block's own CSS, or the block is in section 1 but its CSS is too large. Fix: keep the block's `<name>.css` lean and at least cover above-the-fold layout for first-section instances.

### "Image LCP score dropped"

Cause: `<img>` not optimized or `fetchpriority="high"` missing on the LCP image. Fix: use `createOptimizedPicture` for any author-uploaded images; ensure `loading="eager"` and `fetchpriority="high"` for the first image (handled by `waitForFirstImage` in [scripts/aem.js](../../../scripts/aem.js)).

## Anti-patterns

- Do **not** start changing files before reproducing the symptom.
- Do **not** wrap broken code in try/catch to silence errors. Find the actual cause.
- Do **not** introduce a new third-party dependency to fix a bug.
- Do **not** edit the root `component-*.json` or [scripts/aem.js](../../../scripts/aem.js).
- Do **not** ship `console.log` or `debugger` statements - remove them after diagnosis.
- Do **not** "fix" linter warnings unrelated to the bug; that creates noisy diffs.
- Do **not** ship a fix for a variant that has no fixture. Add the missing fixture in Step 9.5 so the next regression is caught visually.

## Keep the playbook in sync

If a fix **changes a documented convention** (a guardrail, the debug flow, a preview port), update [`docs/component-development-playbook.md`](../../../docs/component-development-playbook.md) in the same change per [`.cursor/rules/lledsue-playbook-maintenance.mdc`](../../../.cursor/rules/lledsue-playbook-maintenance.mdc). A routine bug fix that just repairs a block needs no playbook edit.
