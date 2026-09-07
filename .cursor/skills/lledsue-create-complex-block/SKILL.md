---
name: lledsue-create-complex-block
description: Scaffold a new AEM EDS complex block - one that needs authored structural markers, document-level listeners, observers, drawer cloning, or other browser-only behavior. Creates the two-mode quintet (<id>.js with decorate/wire + <id>.css + <id>.author.{js,css} + JSON), at least one marker block quintet, wires both into filters, regenerates aggregate JSONs, and creates fixtures. Use when the user wants a top-nav, mega-menu, tabs, accordion-with-many-panels, sticky carousel, or similar component whose wiring cannot live in decoration alone.
---

# lledsue-create-complex-block

Scaffolds a new EDS complex block following the [`lledsue-complex-blocks`](../../rules/lledsue-complex-blocks.mdc) rule. Use this skill when the new block meets any of the **complex criteria** below. For everything else, use [`lledsue-create-block`](../lledsue-create-block/SKILL.md).

## When to use this skill

The block is **complex** if any of these are true:

- It needs authored structural markers (scope-openers like Region, Group, Promo-block).
- It loads or adopts other blocks at runtime (`decorateBlock` + `loadBlock`, or DOM moves to/from `document.body`).
- It clones decorated subtrees (mobile drawer mirroring desktop chrome, etc.).
- It attaches document-level listeners (`document.addEventListener('click' | 'keydown' | ...)`).
- It runs a `MutationObserver`, `IntersectionObserver`, scroll listener, or other long-lived browser-only behavior.
- It would otherwise need `if (isUniversalEditor()) return;` in its main decorator.

If **none** of these are true, route to [`lledsue-create-block`](../lledsue-create-block/SKILL.md) instead.

## Required inputs

Ask via `AskQuestion` for anything not provided:

- **Title** - PascalCase, used in the picker (e.g. `Top Nav`, `Mega Menu`).
- **Block id** - lowercase, kebab-case, becomes the folder + class name (e.g. `top-nav`, `mega-menu`). Must match `^[a-z][a-z0-9-]*$`.
- **Description** - one sentence about the block's purpose, used in the JSON definition and the rule cross-reference.
- **Markers** - list of structural marker types this block needs. For each marker:
  - **Marker id** - lowercase, kebab-case (e.g. `top-nav-region-marker`, `menu-group-marker`). Convention: `<parent-id>-<scope>-marker`.
  - **Marker scope field** - the select field that distinguishes variants of this marker (e.g. `position` with options `left / center / right`). Leave blank for markers with no variants (e.g. a `promo-cards-marker` is a singleton scope-opener).
  - **Terminator classes** - which other marker types end this marker's scope. Default: same-kind markers only.
- **Content items** - list of authored content types the parent accepts (e.g. for top-nav: Brand, Mega Menu Trigger, Action, Burger). Each earns its own quintet with `block/v1/block/item` resourceType.
- **Wire behavior summary** - one paragraph describing what module-private `wire(block)` in `<id>.js` will own (e.g. "open/close mega-menu flyouts on click, toggle mobile drawer, mirror desktop content into mobile drawer subpanels, attach a MutationObserver against the nearest sticky-container for variant swaps"). Prefer an **Interaction sheet** table from [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) Step 6 when Figma exists; the prose summary must still map 1:1 to that sheet.
- **Droppable in sections** - `yes` (default) or `no`. Yes -> add the parent block id and each marker id to `models/_section.json`'s `section` filter `components` array.

Stop and ask if any input is ambiguous. Never invent a block id from thin air. **Markers ARE droppable at section level per project convention** (so authors can use them as page-level structural dividers in the future), but they only "activate" inside their parent block's filter.

## Figma-manifest gate (do this BEFORE any CSS)

If this block has a Figma reference  a URL, a node-id, or a pinned frame in [.cursor/figma-references.md](../../figma-references.md)  the **first step is to run [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) and produce the manifest** for the parent AND for every marker / content item that has visual chrome. Include **Step 6 Interaction sheet** for drawers / mega-menus / modals / click behavior and the **required Step 7 `a11y-seo-checklist`**. `decorate` does the DOM transform (Phase A); the manifest tells you which spacing / gap / radius / color tokens `<id>.css` should emit, which ARIA/heading decisions Phase A stamps, and how `wire` (Phase B) should toggle state. Do not write CSS values from prose, adjacent-block patterns, or memory alone.

This gate lives here (before Step 1) rather than inside Step 1 because complex blocks tend to have multiple sibling folders (parent + N markers + M content items) each with their own visual chrome, and running the manifest step for each up front prevents scrambling mid-scaffold. The manifest step catches missing tier ownership, child margins, token name-vs-value mismaps, and silent `.grid` gap inheritance at plan time  see [.cursor/rules/lledsue-atomic-design.mdc](../../rules/lledsue-atomic-design.mdc) "Figma Atomic Extraction", "Behavior layer", and "Figma token extraction (mode-aware)" for the failure mode this closes.

## Two-phase build (static first, then wire)

Complex blocks **must** follow [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) "Behavior layer":

| Phase | When | Deliverables | Forbidden |
|---|---|---|---|
| **A — Static** | Before any `wire` body | `decorate` + closed-state ARIA (`aria-expanded="false"`, panel closed via chosen hide mechanism) + CSS for default + open-state *selectors* + fixtures showing default chrome | `addEventListener`, observers, open/close JS |
| **B — Behavior** | Only after Phase A lands and Interaction sheet (or Wire behavior summary table) exists | module-private `wire` that toggles attributes/classes from the sheet; verify open / dismiss / focus | re-parsing authored DOM; rebuilding decorated structure; inventing a fourth hide mechanism |

Anti-pattern: implementing open/close CSS/JS before closed-state `decorate` lands.

## Workflow

```
- [ ] Step 1: Validate inputs + confirm complex criteria
- [ ] Step 2: Create directories (parent + each marker + each content item)
- [ ] Step 3A (Phase A): Write parent decorate + CSS + closed ARIA + author quintet pieces (no wire body yet, or wire stub only)
- [ ] Step 3B (Phase B): Implement wire from Interaction sheet / Wire behavior summary; default export decorateAndWire
- [ ] Step 4: Write each marker quintet
- [ ] Step 5: Write each content item quintet (or extend _<id>.json with item definitions if items have no own folder)
- [ ] Step 6: Wire markers + parent + items into models/_section.json (if droppable)
- [ ] Step 7: Wire the parent's filter to allow markers + content items
- [ ] Step 8: Add the parent's block-folder list to models/_component-definition.json (the Top Nav / Blocks group, depending on family)
- [ ] Step 9: Create test/fixtures/<id>/ (parent variants) and test/fixtures/<marker-id>/ (UE-pill verification)
- [ ] Step 10: Run npm run build:json
- [ ] Step 11: Run npm run lint
- [ ] Step 12: Confirm (Phase A closed chrome + Phase B open/dismiss/focus vs Interaction sheet)
```

### Step 1: Validate inputs + confirm complex criteria

- Block id format: `^[a-z][a-z0-9-]*$`.
- `blocks/<id>/` must not already exist.
- Each marker id must match `^[a-z][a-z0-9-]*-marker$` (forces the convention).
- Walk the "complex criteria" checklist with the user and confirm at least one item applies. If none do, stop and route to `lledsue-create-block`.
- No reserved field keys (`name`, `classes`, `id`, `model`, `template`, `path`, `resourceType`) on ANY model in this scaffold. See [.cursor/rules/lledsue-block-conventions.mdc](../../../.cursor/rules/lledsue-block-conventions.mdc) "Reserved field keys".

### Step 2: Create directories

```bash
mkdir -p blocks/<id>
mkdir -p blocks/<marker-id>           # for each marker
mkdir -p blocks/<content-item-id>     # for each content item (when it earns its own folder)
mkdir -p test/fixtures/<id>
mkdir -p test/fixtures/<marker-id>    # for each marker
```

### Step 3A: Write the parent quintet — Phase A (static)

Ship `decorate`, closed-state stamps, and CSS first. Leave `wire` empty (or a no-op with a TODO pointing at the Interaction sheet) until Step 3B.

#### `blocks/<id>/<id>.js` (EDS-mode entry)

```js
import { moveInstrumentation } from '../../scripts/scripts.js';
import { annotate as annotateRegion, collectScope as collectRegion }
  from '../<id>-region-marker/<id>-region-marker.js';

function parseBlock(block) {
  const markers = [...block.querySelectorAll(':scope > .<id>-region-marker')];
  markers.forEach(annotateRegion);
  return markers.map(collectRegion);
}

function buildRegions(scopes) {
  const root = document.createElement('div');
  root.className = '<id>';
  scopes.forEach((scope) => {
    // build each region's DOM from scope.content
    // moveInstrumentation(originalEl, newEl) on every relocation
  });
  return root;
}

export function decorate(block) {
  const scopes = parseBlock(block);
  const root = buildRegions(scopes);
  block.replaceChildren(...root.children);
}

function wire(block) {
  // Phase B only — fill in Step 3B from Interaction sheet
}

export default function decorateAndWire(block) {
  decorate(block);
  wire(block);
}
```

Hard rules for `decorate` (Phase A):

- No `addEventListener` calls. None.
- No `MutationObserver`, `IntersectionObserver`, `setTimeout`, `setInterval`.
- No `document.body` writes.
- No `decorateBlock` + `loadBlock` on nested children. Import nested block build helpers as named exports when needed.
- May `await` ONLY for legitimate async (fragment loads, etc.). Default to sync.
- Stamp closed-state ARIA / attributes that match the Interaction sheet `default-state` and `hide-mechanism` (`aria-expanded="false"`, `aria-hidden="true"` / `hidden` / no `is-open`).
- Prefer `data-action` on triggers so Phase B can use root delegation.

Hard rules for `wire` (Phase B — implement in Step 3B, not here):

- Does NOT re-parse authored DOM. Stamp structural data as `data-*` in `decorate` if `wire` needs it.
- Does NOT rebuild DOM that `decorate` already produced.
- Use module-local WeakSet for idempotency.
- Only toggles the hide-mechanism + focus/dismiss rules from the Interaction sheet.

### Step 3B: Phase B — implement `wire` from the Interaction sheet

**Gate:** Interaction sheet from `lledsue-figma-to-code` Step 6, or an equivalent Wire behavior summary table with the same columns (`trigger`, `panel`, `default-state`, `open-on`, `dismiss`, `hide-mechanism`, `focus`, `scope`). Do **not** write `wire` until that table exists.

1. Map each sheet row to handlers (`openMegaMenu`, `closeDrawer`, etc.) using the chosen hide mechanism only.
2. Prefer one delegated `click` listener on the block root reading `data-action`.
3. Add document-level listeners only when `scope` says so (outside-click, Escape).
4. Verify against the sheet: open, each dismiss path, focus move/return. Author mode must still show closed chrome without running `wire`.

#### `blocks/<id>/<id>.author.js`

```js
import { decorate } from './<id>.js';

export default function authorize(block) {
  decorate(block);
}
```

#### `blocks/<id>/<id>.author.css`

Comment-only stub unless UE-specific chrome is needed.

#### `blocks/<id>/<id>.css`

Standard block CSS (see [`lledsue-block-conventions`](../../../.cursor/rules/lledsue-block-conventions.mdc)). Mobile-first, canonical breakpoints (`768` / `1024` / `1440`), scoped to `.<id>`. When pulling token values from Figma, resolve them against **THEME: `LifeLock`** with `get_variable_defs` (not `get_design_context` inline hexes) - see [`lledsue-atomic-design`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Figma token extraction (mode-aware)".

#### `blocks/<id>/_<id>.json`

Parent definition + filter referencing all markers + all content items:

```json
{
  "definitions": [
    {
      "title": "<Title>",
      "id": "<id>",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "<Title>", "model": "<id>", "filter": "<id>" }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "<id>",
      "fields": [
        { "component": "select", "name": "theme", "label": "Theme", "valueType": "string", "value": "light", "options": [
          { "name": "Light", "value": "light" }
        ]}
      ]
    }
  ],
  "filters": [
    {
      "id": "<id>",
      "components": [
        "<id>-region-marker",
        "<content-item-1-id>",
        "<content-item-2-id>"
      ]
    }
  ]
}
```

### Step 4: Write each marker quintet

Per marker (e.g. `<id>-region-marker`), ship `<marker-id>.js`, `<marker-id>.author.js`, `<marker-id>.author.css`, `<marker-id>.css`, `_<marker-id>.json`.

#### `blocks/<marker-id>/<marker-id>.js`

```js
/*
 * <Marker Title> — smart-marker block for the <id> parent.
 * See .cursor/rules/lledsue-complex-blocks.mdc.
 */

const KIND = '<marker-id>';
const VALID_VALUES = new Set([/* scope values */]);
const DEFAULT_VALUE = '<default>';

const TERMINATOR_CLASSES = [KIND];

function isTerminator(el) {
  return TERMINATOR_CLASSES.some((cls) => el.classList.contains(cls));
}

export function annotate(markerEl) {
  const raw = markerEl.children[0]?.textContent?.trim() ?? '';
  const value = VALID_VALUES.has(raw) ? raw : DEFAULT_VALUE;
  markerEl.dataset.scope = value;
  markerEl.classList.add(`${KIND}--${value}`);
}

export function collectScope(markerEl) {
  const content = [];
  let sibling = markerEl.nextElementSibling;
  while (sibling && !isTerminator(sibling)) {
    content.push(sibling);
    sibling = sibling.nextElementSibling;
  }
  return { scope: markerEl.dataset.scope ?? DEFAULT_VALUE, content };
}

export default function decorate(block) {
  annotate(block);
}
```

#### `blocks/<marker-id>/<marker-id>.author.js`

```js
import decorate from './<marker-id>.js';

export default function authorize(block) {
  decorate(block);
}
```

#### `blocks/<marker-id>/<marker-id>.author.css`

Comment-only stub unless UE chrome is needed beyond the marker pill CSS.

#### `blocks/<marker-id>/<marker-id>.css`

```css
.<marker-id> { display: none; }

body[data-ue-mode] .<marker-id> {
  display: block;
  margin: 8px 0;
  padding: 4px 12px;
  background: var(--ll-color-bg-tint-warning);
  border: 1px dashed var(--ll-color-status-warning);
  color: var(--ll-color-text-primary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

body[data-ue-mode] .<marker-id>--<scope-1>::before { content: 'Marker — <Scope 1>'; }
body[data-ue-mode] .<marker-id>--<scope-2>::before { content: 'Marker — <Scope 2>'; }
```

#### `blocks/<marker-id>/_<marker-id>.json`

```json
{
  "definitions": [
    {
      "title": "<Marker Title>",
      "id": "<marker-id>",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block/item",
            "template": { "name": "<Marker Title>", "model": "<marker-id>" }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "<marker-id>",
      "fields": [
        {
          "component": "select",
          "valueType": "string",
          "name": "<scope-field-name>",
          "label": "<Scope label>",
          "description": "Opens a scope for the <parent>. Sibling content items after this marker belong here until the next <marker> marker.",
          "value": "<default>",
          "options": [
            { "name": "<Scope 1 label>", "value": "<scope-1>" },
            { "name": "<Scope 2 label>", "value": "<scope-2>" }
          ]
        }
      ]
    }
  ],
  "filters": []
}
```

### Step 5: Write each content item quintet

Each content item ships the two-mode quintet (`<item-id>.{js,css,author.js,author.css,_<item-id>.json}`) following [`lledsue-create-block`](../lledsue-create-block/SKILL.md), with `resourceType: core/franklin/components/block/v1/block/item`.

Content item `decorate` runs at standard EDS decoration time but the parent's `decorate` is what actually positions it into the rendered chrome. Two options:

- **(a) Item self-renders.** Item `decorate` builds its own DOM (with `moveInstrumentation`), and the parent's `decorate` relocates the rendered element into the right region.
- **(b) Parent renders item.** Item `decorate` is a no-op; the parent's `decorate` reads the item's authored rows and builds the rendered DOM itself.

Default to **(a)** for items that have a meaningful standalone visual (Brand, CTA, Action). Default to **(b)** for items whose visual is region-dependent (e.g. a Mega Menu Trigger that becomes a button on desktop and a row on mobile).

### Step 6: Wire into `models/_section.json` (if droppable)

Add the parent block id AND each marker id to the `section` filter `components` array. Keep the array readable; do not reorder existing entries.

### Step 7: Parent filter wiring

The parent's `_<id>.json` filter must list every marker id AND every content item id it accepts. Without these entries, the UE picker won't show them as valid drops inside the parent.

### Step 8: Component-definition glob

`models/_component-definition.json` uses explicit folder allowlists per group (Top Nav, Geo Demo, Blocks). Add the new parent folder + each new marker / content item folder to the appropriate group's glob:

```json
{
  "...": "../blocks/{<id>,<marker-id>,<content-item-id>,...}/_*.json#/definitions"
}
```

Without this step, the new components won't appear in the aggregated `component-definition.json` and UE won't show them in the picker - even though the model JSON and filter JSON pick them up via wildcard.

### Step 9: Create fixtures

Per [`lledsue-testing`](../../../.cursor/rules/lledsue-testing.mdc) sync contract:

#### Marker fixtures

For each marker, create `test/fixtures/<marker-id>/index.html` + `all.html`. The `all.html` MUST include a "simulate UE mode" toggle button so the labeled pill is verifiable without opening the actual editor:

```html
<button type="button"
  onclick="document.body.toggleAttribute('data-ue-mode'); this.textContent = document.body.hasAttribute('data-ue-mode') ? 'Disable UE-mode simulation' : 'Enable UE-mode simulation';">
  Enable UE-mode simulation
</button>
```

See [`test/fixtures/markers/all.html`](../../../test/fixtures/markers/all.html) for the reference.

#### Parent fixtures

For the parent complex block: `test/fixtures/<id>/index.html` + `all.html` + per-variant pages. Include at least one fixture for each:

- Each marker scope (one fixture per region/group variant).
- Orphan content item before any marker (verifies warning behavior).
- Two consecutive markers of the same kind (verifies first-wins-warn).
- Each content item type's rendered output inside the parent.

### Step 10: Run `npm run build:json`

```bash
npm run build:json
```

Regenerates the three aggregate JSONs at the repo root.

### Step 11: Run `npm run lint`

```bash
npm run lint
```

Fix issues. Common failures specific to complex blocks:

- `addEventListener` inside `decorate` → move to module-private `wire`.
- `authorize` calling `wire` → author mode must call `decorate` only.
- Missing `valueType` on a marker's select field → add `"valueType": "string"`.
- CSS selector outside the block's own class → prefix with `.<id>` or `.<marker-id>`.

### Step 12: Confirm

Print a short summary:

```
Created complex block <id>:
  blocks/<id>/<id>.js              [decorate + wire]
  blocks/<id>/<id>.author.js
  blocks/<id>/<id>.author.css
  blocks/<id>/<id>.css
  blocks/<id>/_<id>.json
  blocks/<marker-id>/...            (× N markers, full quintet each)
  blocks/<content-item-id>/...      (× N content items, full quintet each)
  models/_section.json              [+ <id>, + each marker id, if droppable]
  models/_component-definition.json [+ each new folder in the group glob]
  test/fixtures/<id>/...
  test/fixtures/<marker-id>/...     (× N markers)
Lint: PASS
```

Tell the user the fixture URLs:
- Parent: `http://localhost:4501/test/fixtures/<id>/index`
- Each marker: `http://localhost:4501/test/fixtures/<marker-id>/index`

**💡 PR Demo URLs**: When this complex block is ready for PR, use the fixture URLs for the demo since the new block has no cloud AEM content yet:
- Primary demo: `https://<branch>--<repo>--<owner>.aem.page/test/fixtures/<id>/all`
- Marker demos: `https://<branch>--<repo>--<owner>.aem.page/test/fixtures/<marker-id>/all`

These fixture URLs work on the preview domain because they're committed code, not CMS content.

## Anti-patterns

- Do **not** implement open/close `wire` (Phase B) before Phase A closed-state `decorate` + CSS lands. Static first, then Behavior — see [`.cursor/rules/lledsue-atomic-design.mdc`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Behavior layer".
- Do **not** write `wire` without an Interaction sheet (or equivalent Wire behavior summary table).
- Do **not** add `if (isUniversalEditor()) return;` early returns to `decorate`. Author mode loads `<id>.author.js`, which calls `decorate` without `wire`.
- Do **not** call `wire` from `<id>.author.js`.
- Do **not** create a shared `blocks/marker/` block with a polymorphic `kind` select. Per-parent marker blocks only.
- Do **not** add `addEventListener` to a marker's `decorate` or to the parent's `decorate`. All listeners belong in module-private `wire`.
- Do **not** call `decorateBlock` + `loadBlock` on nested children from `decorate`. If a nested block's rendering is needed inline, import its build helper as a named export (refactor the nested block to export one if needed).
- Do **not** ship a complex block without the marker fixture's "simulate UE mode" button. Reviewers must be able to verify the pill without opening UE.
- Do **not** skip the `models/_component-definition.json` glob update. The block will silently not appear in the UE picker otherwise.
- Do **not** reuse another block's exports / DOM shape / CSS classes without recording the coupling in both directions - a `## Depends on` section in this block's `<id>.md` and the reciprocal `## Dependents` section in the provider's `<id>.md`. See [`.cursor/rules/lledsue-block-tiers.mdc`](../../../.cursor/rules/lledsue-block-tiers.mdc) "Cross-block dependencies (Depends on / Dependents ledger)".

## See also

- [`.cursor/rules/lledsue-complex-blocks.mdc`](../../../.cursor/rules/lledsue-complex-blocks.mdc) - the full rule this skill scaffolds against.
- [`.cursor/rules/lledsue-building-blocks.mdc`](../../../.cursor/rules/lledsue-building-blocks.mdc) - the simple-block contract (parseBlock / buildRegions / decorate still applies inside `decorate`).
- [`.cursor/rules/lledsue-eds-js-guardrails.mdc`](../../../.cursor/rules/lledsue-eds-js-guardrails.mdc) - JS prohibitions; `wire` is EDS-mode-only by construction.
- [`blocks/top-nav-region-marker/`](../../../blocks/top-nav-region-marker/) - reference marker implementation.
- [`test/fixtures/markers/`](../../../test/fixtures/markers/) - reference marker fixture with the UE-mode toggle button.

## Keep the playbook in sync

This skill owns the complex-block path summarized in [`docs/component-development-playbook.md`](../../../docs/component-development-playbook.md) (when a block counts as complex, the decorate/wire split). If you **change how this skill works** - the complex criteria, the decorate/wire contract, or the marker scaffold - update the playbook in the same change per [`.cursor/rules/lledsue-playbook-maintenance.mdc`](../../../.cursor/rules/lledsue-playbook-maintenance.mdc). A normal run that just scaffolds a complex block needs no playbook edit.
