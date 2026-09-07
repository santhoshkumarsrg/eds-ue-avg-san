---
name: lledsue-enhance-block
description: Modify an existing AEM EDS block - add a model field, restructure DOM, change CSS, or add accessibility. Reads the block's full quintet first, applies changes following project patterns (mobile-first, UE instrumentation, scoped CSS), regenerates JSON aggregates, and lints. Use when the user asks to update, extend, tweak, or add a feature to an existing block.
---

# lledsue-enhance-block

For changes to a block that already exists in `blocks/`. Preserves the author/developer contract: existing model fields stay in order, existing CSS classes stay valid, existing DOM contracts stay intact.

If the block does not yet exist, hand off to `lledsue-create-block` (or `lledsue-create-complex-block` if it meets the complex criteria).

## If the block is a complex block

Some blocks ship the **two-mode quintet** (`<id>.js` + `<id>.css` + `<id>.author.{js,css}` + `_<id>.json`) per [`lledsue-complex-blocks`](../../../.cursor/rules/lledsue-complex-blocks.mdc). Identify complex blocks by named `decorate` + module-private `wire` + default `decorateAndWire` in `<id>.js`.

For complex-block enhancements:

- Read ALL files in the quintet, not just `<id>.js`. Plus every marker block in the parent's filter (each marker is its own folder under `blocks/<marker-id>/`).
- Respect the decorate/wire split. Event handling lives in module-private `wire`. Authored-DOM-to-rendered-DOM transformation lives in `decorate`. Marker scope/parse logic lives in the marker's `<marker-id>.js`.
- Do NOT call `wire` from `<id>.author.js` — author mode re-invokes `decorate` only.
- Do NOT add `addEventListener` to `decorate`. Add it to `wire`.
- Do NOT branch on `isUniversalEditor()` from `decorate` or a marker. UE differences are CSS-driven via `body[data-ue-mode]`.
- When in doubt, re-read [`.cursor/rules/lledsue-complex-blocks.mdc`](../../../.cursor/rules/lledsue-complex-blocks.mdc).

## Required inputs

- **Block name** - lowercase id matching a folder under `blocks/`. If the user is ambiguous, list `blocks/*/` and ask once via `AskQuestion`.
- **Change description** - what they want to change. If they describe a bug ("X is broken"), hand off to `lledsue-fix-block` instead.

## Workflow

```
- [ ] Step 1: Read the existing quintet
- [ ] Step 1.5: Doc-vs-CSS reconciliation (visual / spacing / typography / structural enhancements on blocks that ship a <id>.md)
- [ ] Step 2: Identify the change type (model / DOM / CSS / a11y / add-behavior / mixed)
- [ ] Step 3: Verify contract preservation
- [ ] Step 4: Apply the change
- [ ] Step 5: Re-stage UE instrumentation if DOM changed
- [ ] Step 6: Run npm run build:json (only if _<name>.json changed)
- [ ] Step 6.5: Update test/fixtures/<name>/* if the change is observable
- [ ] Step 7: Run npm run lint
- [ ] Step 8: Confirm + suggest a manual verification path
```

### Step 1: Read the existing quintet

Read all files even if the change seems narrow:

- `blocks/<name>/<name>.js`
- `blocks/<name>/<name>.author.js`
- `blocks/<name>/<name>.author.css`
- `blocks/<name>/<name>.css`
- `blocks/<name>/_<name>.json` (may not exist for `header`/`footer`)
- **If complex block** (named `decorate` + `wire` in `<id>.js`): read every marker block referenced by the parent's filter.

Read [models/_section.json](../../../models/_section.json) only if the change is "make this block droppable in sections" or similar.

Also read the block's `blocks/<name>/<name>.md` if present, and check for a `## Dependents` or `## Depends on` section - these declare cross-block reuse that Step 3 must honor.

### Step 1.5: Doc-vs-CSS reconciliation

**Applies to any visual / spacing / typography / structural enhancement on a block that ships a `<name>.md`.** Skip for pure behavior / model / a11y enhancements  those go straight to Step 2.

The block's own `<name>.md` design-lock table and the shipped CSS are the two sources of truth about intent. When they disagree, the disagreement is often already the seed of the enhancement the user is asking for, or a regression that ships adjacent to the surface you're about to touch. Reconcile now  cheaply  before Step 2 fixes the change's scope.

Workflow:

1. `Read` [`blocks/<name>/<name>.md`](../../../blocks/) and find the "Design lock-in" table (or equivalent design-intent section).
2. Compare each row against the corresponding rule in [`blocks/<name>/<name>.css`](../../../blocks/) (and `<name>.author.css` if the enhancement touches author mode).
3. Flag two failure modes:
   - **Doc says X, CSS says Y.** Contradiction. If the enhancement is in the same surface as the contradiction, decide before Step 2 whether it's in-scope or a separate follow-up. Do NOT silently "harmonize" the CSS to match the doc if the doc is wrong; verify against Figma first per [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) "Past code is not a source of truth on Figma-driven re-visits".
   - **Doc silent, CSS has an un-documented rule.** Weaker signal but worth noting  a hidden zero-out or override may collide with the enhancement.
4. Write a short list of contradictions before touching Step 2. These flow into Step 3 (contract preservation) and Step 8 (verification path).

If the block has no `<name>.md`, skip Step 1.5 and log backfilling the doc as a follow-up per [`.cursor/rules/lledsue-comment-discipline.mdc`](../../../.cursor/rules/lledsue-comment-discipline.mdc).

### Step 2: Identify the change type

Classify the change as one or more of:

- **Model change** - add/modify a field in `_<name>.json`. Goes to Step 4 model branch.
- **Filter change** - allow a new child component. Goes to Step 4 filter branch.
- **DOM change** - JS rewrite or restructure. Goes to Step 4 DOM branch.
- **CSS change** - style tweak. Goes to Step 4 CSS branch.
- **A11y change** - ARIA, focus, keyboard. Goes to Step 4 a11y branch.
- **Add-behavior** - layer open/close / drawer / modal / keyboard onto an existing **static** block (or finish incomplete `wire`). Goes to Step 4 add-behavior branch. See [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) "Behavior layer".

Mixed changes hit multiple branches - that's fine, work through them in order.

**Figma-manifest gate for CSS or mixed-CSS changes.** If the change type is CSS or mixed-CSS AND there is a Figma reference in the request (URL, node-id, pinned frame in [.cursor/figma-references.md](../../figma-references.md)), run [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) FIRST to produce the full manifest (tier inventory, layout sheets, unified DOM, structural cues, width helper, grid-column table, spacing CVars + margin audit, atom CVars, Interaction sheet when interactive, and **required** `a11y-seo-checklist`), then apply the CSS change against that manifest. Exception: pure code-fix CSS changes with no visual delta (e.g. renaming a class without changing values, deleting a dead rule) do not need the manifest. When in doubt, run it  the failure mode is silent value drift, and the manifest step catches it at plan time. See [.cursor/rules/lledsue-atomic-design.mdc](../../rules/lledsue-atomic-design.mdc) "Figma Atomic Extraction", "Figma token extraction (mode-aware)", and "Token-value verification gate" for the discipline this closes.

**Add-behavior gate.** If the change type is **add-behavior**:

1. Run [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) Step 6 (Interaction sheet) when Figma open/closed frames exist; otherwise write the equivalent table from the user's Wire behavior summary.
2. If `decorate` is missing closed-state stamps (`aria-expanded`, hide attrs, `data-action`), complete **Phase A** first (minimal DOM/ARIA only — do not restyle Atomic ownership unless Figma also changed).
3. Then implement **Phase B** `wire` only: toggle the chosen hide mechanism; no DOM rebuild. Convert a decoration-only default export to named `decorate` + `decorateAndWire` if needed; keep `<id>.author.js` on `decorate` only.

### Step 3: Verify contract preservation

Before any edit, check whether the change would break already-authored content:

- **Adding a model field** - safe (authors with old content just have an empty field). Step 6.5 will add a fixture row exercising it.
- **Removing a model field** - **stops the skill**. Ask the user to confirm and warn that any authored content using that field will be silently dropped. On confirmation, also purge any `test/fixtures/<name>/*` entries that exercise the field.
- **Renaming a field** - **stops the skill**. Same risk. Suggest adding the new field and deprecating the old one in a follow-up.
- **Reordering fields** - safe in JSON but disruptive for authors mid-edit; ask first.
- **Changing the block's expected initial DOM structure** (e.g. cards expects `div > div > picture`) - **stops the skill**. Existing pages will render wrong. Ask for explicit confirmation, require a migration plan, AND require updating every fixture under `test/fixtures/<name>/` to match the new structure.
- **The block has a `## Dependents` section in its `<name>.md`** (another block reuses its code - e.g. `accordion` is reused by `faq`) - treat the listed reuse surface as a **public API**. If your change alters a reused export signature/return shape, the produced DOM contract, or a consumed CSS class, **stop**: read every dependent, update each in the **same change**, and re-run their fixtures. Update the ledger tables if the surface changes. See [`.cursor/rules/lledsue-block-tiers.mdc`](../../../.cursor/rules/lledsue-block-tiers.mdc) "Cross-block dependencies (Depends on / Dependents ledger)".
- **The block has a `## Depends on` section** (it reuses another block) - re-verify your enhancement still holds against the current provider, and keep the `## Depends on` table accurate.

If any of the stop conditions trigger, do not proceed without an explicit "yes, do it anyway" from the user.

**Non-goal cosmetic-only check.** If the enhancement plan lists **non-goals** ("no header restructure", "no DOM changes", "no new fields"), walk each one and re-classify:

- **DOM restructure needed** (stays out of scope) - the visible outcome requires new elements, moved elements, changed semantic tags, or new authored markers.
- **Cosmetic-only** (move INTO scope) - the visible outcome can be produced by a CSS-only change on the existing DOM: `border-*`, `padding`, `margin`, `align-self`, `gap`, `background`, `font-*`, `color`.

Cosmetic-only work masquerading as "restructure" is a common cause of "the enhancement PR shipped but the visible outcome is still wrong" complaints  the plan author saw a Figma structural difference and pushed the whole cluster out of scope when a single CSS declaration would have produced the missing visual. Reference miss: `product-feature-tiles` SM parity pass wrote "No changes to the header structure" as a non-goal; the kicker→title divider that was described as out-of-scope turned out to be a one-line `border-block-start` on the title. Discipline lives with [`lledsue-fix-block`](../lledsue-fix-block/SKILL.md) "Non-goal re-classification" - mirror it here.

For every non-goal that survives re-classification as "DOM restructure needed", write one sentence explaining WHY. If you cannot write that sentence, move the item in scope.

### Step 4: Apply the change

#### Model branch - add a field

Append to `models[0].fields` in `_<name>.json`. Never reorder existing fields.

```json
{ "component": "<component>", "name": "<fieldName>", "label": "<Label>", "valueType": "string" }
```

Always include `valueType` for primitive fields - eslint-plugin-xwalk requires it.

**Reject reserved field keys.** Do not introduce a field whose `name` is `name`, `classes`, `id`, `model`, `template`, `path`, or `resourceType` - they collide with JCR / EDS resource properties and silently break the block when authors edit them. If the user asks for a "name" / "id" / "classes" field, propose `label` / `anchorId` / `variant` instead and confirm before writing. Full table with symptoms: [.cursor/rules/lledsue-block-conventions.mdc](../../../.cursor/rules/lledsue-block-conventions.mdc) "Reserved field keys".

If the new field needs to be rendered, also update the JS to read it from the authored DOM (typically the next `div` row or cell, depending on the block's pattern).

#### Filter branch - allow a child

Append the child id to the filter's `components` array in `_<name>.json` (or `models/_section.json` if making the block droppable in sections). Never reorder.

#### DOM branch - restructure or rewrite JS

Mirror the project's existing patterns:

- Sync `decorate` unless you actually need `await`.
- Use `moveInstrumentation` from [scripts/scripts.js](../../../scripts/scripts.js) whenever you create new DOM nodes that replace authored ones. Without it, Universal Editor edits stop persisting.
- Use `createOptimizedPicture` from [scripts/aem.js](../../../scripts/aem.js) for author-uploaded images. **Gate the call on `.svg` sources** — the aem.live optimizer is raster-only, so SVGs must be emitted as a plain `<picture><img src=".../foo.svg">` to avoid the broken `?width=…&format=svg&optimize=medium` URL. Pattern in [`.cursor/rules/lledsue-eds-js-guardrails.mdc`](../../rules/lledsue-eds-js-guardrails.mdc) "SVG bypass"; reference impl in [`blocks/awards/awards.js`](../../../blocks/awards/awards.js).
- Handle missing fields with optional chaining; authors may omit any field.
- Never modify [scripts/aem.js](../../../scripts/aem.js).
- For complex blocks: listeners go in module-private `wire`, not in `decorate` or `<name>.author.js`.

#### CSS branch - style tweak

- Every selector must be scoped to `.<name>` (or the landmark element for `header`/`footer`).
- Mobile-first; canonical breakpoints (768 / 1024 / 1440) for overrides. Don't introduce new breakpoints without user approval.
- **Comments: pointer + labels + directives.** Small label-only comments that name a region or breakpoint for navigation are allowed in `<name>.runtime.css` (`/* LG/XL */`, `/* Feature */`, `/* ---- Feature ---- */`) — a few words, no description. Do **not** add *descriptive* inline `/* ... */` notes (Figma-value callouts, intent notes, trailing `property /* why */` notes); record that rationale in the block's `<name>.md` under `## CSS notes` instead. The stylesheet keeps its top-of-file pointer, functional `stylelint-disable*` directives, and label-only comments. See [`.cursor/rules/lledsue-comment-discipline.mdc`](../../../.cursor/rules/lledsue-comment-discipline.mdc) "Block CSS: pointer + labels + functional directives". If the block you are enhancing still carries legacy descriptive CSS comments, migrate them to `<name>.md` opportunistically as part of this change.
- Consume tokens from `:root` before introducing literals. If a new token is justified, hand off to `lledsue-create-token` first, then return here.
- When pulling token values from Figma, resolve them against **THEME: `LifeLock`** with `get_variable_defs` (not `get_design_context` inline hexes). See [`lledsue-atomic-design`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Figma token extraction (mode-aware)".
- Avoid `.<name>-container` and `.<name>-wrapper` (framework-owned).
- **Author-only chrome goes in `<name>.author.css`, gated by `body[data-ue-mode]`** - never in `<name>.css` unless it also applies on the published site.
- **Short-value config field surfaced as an editable caption?** If the enhancement adds (or re-surfaces) a configuration field whose authored value is expected to be fewer than ~5 words (grid-area name like `L3`, an LCP-hot flag, a short enum/slug), give its editable `<p>` a fixed `200px` box in `<name>.author.css` so Universal Editor's hover-label pill renders above the value instead of wrapping over it and blocking the click: `body[data-ue-mode] .<name> .<name>__area-caption p { flex: 0 0 200px; width: 200px; margin: 0; padding: 0; }`. Widen the value box, never the native UE pill. Full convention + shipped exemplars: [`.cursor/rules/lledsue-block-tiers.mdc`](../../../.cursor/rules/lledsue-block-tiers.mdc) "Short-value config fields get a 200px editable box".

#### A11y branch

- Maintain heading hierarchy.
- Preserve / add `alt` text for images. The hero block has an explicit `imageAlt` field as a model precedent.
- Add ARIA attributes where semantics require it (the header block is the in-repo reference: `aria-expanded`, `aria-controls`, `aria-label`, focus management, Escape handling).
- Ensure focus is visible and keyboard-navigable for any interactive control.
- If the change adds or touches collapse/expand/show/hide/off-screen behavior, content inside the **closed** state must be unreachable by keyboard and screen reader - hide it with `visibility:hidden` / `display:none` / the `hidden` or `inert` attribute, never visual clipping alone (`overflow:hidden`, `max-height:0`, `grid-template-rows:0fr`, `transform`, `opacity:0`). See [`.cursor/rules/lledsue-component-anatomy.mdc`](../../../.cursor/rules/lledsue-component-anatomy.mdc) "Hidden content must be unreachable" and [`.cursor/rules/lledsue-eds-js-guardrails.mdc`](../../../.cursor/rules/lledsue-eds-js-guardrails.mdc) "Hide/show keeps hidden content unreachable"; verify with the focus check in [`.cursor/rules/lledsue-testing.mdc`](../../../.cursor/rules/lledsue-testing.mdc).

#### Add-behavior branch — Phase B (and Phase A stamps if missing)

Use when the user asks to add hide-by-default / open-on-click, a mega-menu, drawer, or popup to a block that already has (or will get) static chrome.

1. **Interaction sheet first** — from figma-to-code Step 6 or a hand-written table with the same columns.
2. **Phase A gap-fill** — if `decorate` lacks closed-state ARIA / hide attrs / `data-action` triggers, add only those stamps (and open-state CSS selectors). Do **not** restyle Atomic layout/tokens unless the enhancement also includes a Figma visual change.
3. **Phase B** — implement module-private `wire`: toggle the chosen hide mechanism (`aria-hidden` | `is-open` | `hidden`); handle dismiss + focus per sheet; WeakSet idempotency. Prefer root `data-action` delegation.
4. **Exports** — named `decorate` + default `decorateAndWire`; `<name>.author.js` imports `decorate` only.
5. **Verify** — closed chrome in author mode (no listeners); open / dismiss / focus on EDS; closed content unreachable (see A11y branch).

Anti-pattern: rewriting the whole block's CSS while "adding a click handler." Behavior is orthogonal to Atomic ownership.

### Step 5: Re-stage UE instrumentation if DOM changed

If you replaced authored DOM nodes, every replacement should have `moveInstrumentation(originalNode, newNode)` called before the original is detached. Verify by re-reading the JS.

### Step 6: Run `npm run build:json`

Only if `_<name>.json`, `models/_section.json`, or any other `_*.json` file changed.

```bash
npm run build:json
```

Re-stage `component-models.json`, `component-definition.json`, `component-filters.json` if you're in a commit flow (the `lledsue-commit-and-pr` skill handles this).

### Step 6.5: Update fixtures if the change is observable

Per the sync contract in [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures":

| Change kind | Fixture action |
|---|---|
| Added a model field that affects rendered DOM | Append a row to `all.html` and to any per-variant page that should exercise it. |
| Added a CSS modifier class (`.<name>--<variant>`) | Add `<variant>.html` (or a section in `all.html`) that triggers the modifier; link it from `index.html`. |
| Added a new variant axis value | Mirror the per-variant page pattern - add `<value>.html` and update `index.html`'s variant list. |
| Removed a model field, modifier, or variant value | Remove the corresponding fixture entries; update `index.html` so dead links don't survive. |
| Pure CSS / a11y / refactor with no observable behavior change | No fixture update. |
| Block has no `test/fixtures/<name>/` folder yet | Stop. Hand off to `lledsue-create-block`'s fixture-creation step (Step 6.5 there) before continuing. |

After fixture edits, re-walk the index page locally to confirm every link resolves.

### Step 7: Run `npm run lint`

```bash
npm run lint
```

Common failures and fixes:

- Missing `valueType` -> add to the model field.
- ESLint `import/no-cycle` between blocks -> if you reused `loadFragment` cross-block, mirror the existing `// eslint-disable-next-line import/no-cycle` comment used in [blocks/fragment/fragment.js](../../../blocks/fragment/fragment.js).
- Stylelint reports unscoped selectors -> prefix with `.<name>`.

### Step 8: Confirm + suggest verification

Print:

```
Enhanced block <name>:
  blocks/<name>/<name>.js        [modified | unchanged]
  blocks/<name>/<name>.author.js [modified | unchanged]
  blocks/<name>/<name>.author.css[modified | unchanged]
  blocks/<name>/<name>.css       [modified | unchanged]
  blocks/<name>/_<name>.json [modified | unchanged]
  models/_section.json      [modified | unchanged]
  test/fixtures/<name>/*    [updated files | unchanged]
Build:json: PASS [if ran]
Lint: PASS
```

Recommend the user verify on the dev server:

```bash
npx -y @adobe/aem-cli up --no-open --forward-browser-logs
# then open http://localhost:4501/<demo-path> and confirm
# also walk http://localhost:4501/test/fixtures/<name>/index for fixture coverage
```

If the dev server is already running (terminal file shows it), point at the existing URL.

## Anti-patterns

- Do **not** remove or rename model fields without an explicit "yes, do it anyway" from the user.
- Do **not** edit the root `component-*.json` files - they are generated.
- Do **not** modify [scripts/aem.js](../../../scripts/aem.js).
- Do **not** silently drop `moveInstrumentation` calls - that breaks Universal Editor authoring.
- Do **not** introduce dependencies (`npm install <thing>`). EDS is no-build, vanilla JS only.
- Do **not** add `console.log` or debugger statements in committed code.
- Do **not** ship an observable change without updating `test/fixtures/<name>/*`. See [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures" sync contract.

## Keep the playbook in sync

If you **change how this skill works** (its workflow, the contract-preservation rules, the commands it runs), update [`docs/component-development-playbook.md`](../../../docs/component-development-playbook.md) in the same change per [`.cursor/rules/lledsue-playbook-maintenance.mdc`](../../../.cursor/rules/lledsue-playbook-maintenance.mdc). A normal run that just enhances a block needs no playbook edit.
