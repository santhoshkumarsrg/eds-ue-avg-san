---
name: lledsue-create-block
description: Scaffold a new AEM EDS block (cell or organism in Atomic 2.0). Creates the two-mode quintet blocks/<name>/{<name>.js,<name>.css,<name>.author.js,<name>.author.css,_<name>.json}, wires the block into the section filter, runs npm run build:json, and lints. Use when the user asks to add a new block, build a new component, or create a card/banner/accordion/carousel/FAQ/etc.
---

# lledsue-create-block

Scaffolds a new EDS block following the patterns already in this repo (cards, columns, hero, fragment). Use for **cells** (2+ molecules, e.g. accordion, breadcrumb, alert) and **organisms** (section blocks, e.g. hero, FAQ, carousel) in Atomic 2.0 terms. For atoms, use `lledsue-create-token` instead.

## Complex-block check (do this FIRST)

Before scaffolding, walk through this checklist. If **any** answer is yes, **stop and route to [`lledsue-create-complex-block`](../lledsue-create-complex-block/SKILL.md)** instead - the file structure, model wiring, and authoring model differ enough to warrant a separate skill.

- Does the block need authored structural markers (region dividers, group dividers, scope-openers)?
- Will it load or adopt other blocks at runtime (`decorateBlock` + `loadBlock` on nested children, or DOM moves to / from `document.body`)?
- Will it clone decorated subtrees (mobile drawer mirroring desktop chrome, etc.)?
- Will it attach document-level listeners (`document.addEventListener('click' | 'keydown' | ...)`)?
- Will it run a `MutationObserver`, `IntersectionObserver`, scroll listener, or other long-lived browser-only behavior?
- Would the decorator otherwise need `if (isUniversalEditor()) return;` to avoid breaking the editor?

Reference complex blocks: `top-nav`, `mega-menu`. Reference rule: [`lledsue-complex-blocks`](../../../.cursor/rules/lledsue-complex-blocks.mdc).

If **no** to all of the above, continue with this skill - the block is a simple block.

## Required inputs

Ask via `AskQuestion` for anything not provided:

- **Title** - PascalCase, used in the picker (e.g. `FAQ`, `ProductBanner`).
- **Block id** - lowercase, kebab-case, becomes the folder + class name (e.g. `faq`, `product-banner`). Must match `^[a-z][a-z0-9-]*$`.
- **Description** - one sentence about the block's purpose, used in the JSON definition.
- **Tier** - `cell` or `organism`. Recorded in the working notes; doesn't change file output but anchors the design conversation.
- **Pattern** - one of:
  - `simple` - single model, no children. Like [blocks/hero/_hero.json](../../../blocks/hero/_hero.json).
  - `filter-item` - parent block holds repeatable items. Like [blocks/cards/_cards.json](../../../blocks/cards/_cards.json).
  - `columns` - layout component using `core/franklin/components/columns/v1/columns`. Advanced; only generate on explicit request.
- **Fields** - list of `{ name, label, component, valueType? }`. Component types in use: `text`, `richtext`, `reference` (image/asset), `aem-content`, `select`, `multiselect`. For `filter-item`, ask for the **item** model fields, not the parent.
- **Droppable in sections** - `yes` (default) or `no`. Yes -> add the block id to `models/_section.json`'s `section` filter `components` array.

Stop and ask if any input is ambiguous. Never invent a block id from thin air.

## Figma-manifest gate (do this BEFORE any CSS)

If this block has a Figma reference  a URL, a node-id, or a pinned frame in [.cursor/figma-references.md](../../figma-references.md)  the **first step is to run [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) and produce the manifest**. Do not write CSS values from prose descriptions, adjacent-block patterns, or memory alone. `lledsue-figma-to-code`'s output (tier inventory, layout sheets, unified DOM, structural cue matrix, width helper, grid-column table, spacing/atom CVars, Interaction sheet when interactive, and **required** `a11y-seo-checklist` from Step 7) is the input to this skill's Steps 3–5. Skipping it is the failure mode documented in [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) "Figma Atomic Extraction", "Behavior layer", and "Figma token extraction (mode-aware)"; the manifest step catches missing tier ownership, child margins, token name-vs-value mismaps, and silent `.grid` gap inheritance at plan time, not at design QA time.

If the block has no Figma reference yet (early prototype, structural scaffold), continue with this skill and revisit `lledsue-figma-to-code` when Figma lands.

## Light interaction (still this skill)

If the block has **light** interaction (accordion-like collapse, single popup) but is **not** complex by the marker / doc-listener / clone criteria above:

- Still use named `decorate` + module-private `wire` + default `decorateAndWire`.
- Follow **Phase A → Phase B** from [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) "Behavior layer": closed-state decorate + CSS first, then `wire` from the Interaction sheet (figma-to-code Step 6) or an equivalent behavior table.
- Pick one hide mechanism: `aria-hidden` | `is-open` | `hidden` (exemplars: `top-nav`, `accordion`, `product-feature-tiles`). Prefer `data-action` delegation.
- True complex cases (markers, document listeners, body-mounted clones) still route to [`lledsue-create-complex-block`](../lledsue-create-complex-block/SKILL.md).

## Workflow

```
- [ ] Step 1: Validate inputs
- [ ] Step 2: Create blocks/<id>/ directory
- [ ] Step 3: Write <id>.js — Phase A decorate (+ wire stub if interactive)
- [ ] Step 3.5: If interactive — Phase B implement wire from Interaction sheet
- [ ] Step 4: Write <id>.author.js + <id>.author.css
- [ ] Step 5: Write <id>.css (consuming the lledsue-figma-to-code manifest, if any; closed + open-state selectors)
- [ ] Step 6: Write _<id>.json
- [ ] Step 7: If droppable, add id to models/_section.json
- [ ] Step 7.5: Create test/fixtures/<id>/ with index.html + all.html + per-variant files
- [ ] Step 7.7: Add id to the correct group's folder-list in models/_component-definition.json
- [ ] Step 8: Run npm run build:json
- [ ] Step 9: Run npm run lint
- [ ] Step 10: Confirm
- [ ] Step 11: Run lledsue-figma-to-code verification loop (pixel-diff gate, mandatory if the block was written against a Figma reference)
```

### Step 1: Validate inputs

- Block id format: `^[a-z][a-z0-9-]*$`.
- `blocks/<id>/` must not already exist - if it does, stop and tell the user to use `lledsue-enhance-block`.
- Title must be PascalCase, max ~32 chars.
- Each field name must be camelCase, unique within the model.
- **No reserved field keys.** Reject `name`, `classes`, `id`, `model`, `template`, `path`, `resourceType` as field keys - they collide with JCR / EDS resource properties and will silently break the block when an author edits them. If the user proposed one of these (commonly: a "name" field for a display label), translate to a safe key automatically: `name` -> `label`, `classes` -> `variant`, `id` -> `anchorId`. Surface the rename in the input echo so the user can confirm. Full table with symptoms: [.cursor/rules/lledsue-block-conventions.mdc](../../../.cursor/rules/lledsue-block-conventions.mdc) "Reserved field keys".

### Step 2: Create the directory

```bash
mkdir -p blocks/<id>
```

### Step 3: Write `blocks/<id>/<id>.js`

This is the **EDS-mode entry** — it runs on `aem up`, preview, and production only. Author mode loads `<id>.author.js` instead.

Use the appropriate skeleton based on the pattern. Keep `decorate` **sync** unless you actually need an `await` (matches cards/columns/hero patterns).

**Simple pattern** - DOM transform only (no behavior):

```js
export default function decorate(block) {
  // 1. Extract config from authored DOM
  // 2. Transform DOM, preserving UE instrumentation
  // Do NOT add listeners here — if the block needs open/close, use decorate + wire below
}
```

**Interactive pattern** (light behavior — Phase A then Phase B):

```js
export function decorate(block) {
  // Phase A: build BEM DOM, stamp closed-state ARIA / hide attrs, data-action on triggers
}

function wire(block) {
  // Phase B: only after Interaction sheet exists — toggle hide-mechanism, focus, dismiss
}

export default function decorateAndWire(block) {
  decorate(block);
  wire(block);
}
```

### Step 3.5: Phase B — `wire` (interactive blocks only)

Skip if decoration-only. Otherwise require an Interaction sheet (figma-to-code Step 6) or equivalent table, then implement `wire` per [`.cursor/rules/lledsue-atomic-design.mdc`](../../rules/lledsue-atomic-design.mdc) "Behavior layer". Verify open / dismiss / focus; author mode must show closed chrome without listeners.

**Filter+item pattern** - mirror cards' approach exactly:

```js
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    ul.append(li);
  });
  block.replaceChildren(ul);
}
```

**If the block uses author-uploaded images**, import and call `createOptimizedPicture`:

```js
import { createOptimizedPicture } from '../../scripts/aem.js';
// ...
block.querySelectorAll('picture > img').forEach((img) => {
  const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
  moveInstrumentation(img, optimized.querySelector('img'));
  img.closest('picture').replaceWith(optimized);
});
```

**SVG bypass** — if authors can upload an `.svg` (logos, awards, partner marks, decorative vectors), gate the optimizer call. aem.live's image optimizer is raster-only; an SVG passed through `createOptimizedPicture` becomes `?width=320&format=svg&optimize=medium` and 404s on the edge. Use the project pattern:

```js
function isSvgSrc(src) {
  try {
    return new URL(src, window.location.href).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return /\.svg(?:$|\?|#)/i.test(src);
  }
}

block.querySelectorAll('picture > img').forEach((authoredImg) => {
  const src = authoredImg.getAttribute('src');
  if (isSvgSrc(src)) {
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = src;
    img.alt = authoredImg.getAttribute('alt') || '';
    img.loading = 'lazy';
    picture.append(img);
    moveInstrumentation(authoredImg, img);
    authoredImg.closest('picture').replaceWith(picture);
    return;
  }
  const optimized = createOptimizedPicture(src, authoredImg.alt, false, [{ width: '750' }]);
  moveInstrumentation(authoredImg, optimized.querySelector('img'));
  authoredImg.closest('picture').replaceWith(optimized);
});
```

Reference implementation: [`blocks/awards/awards.js`](../../../blocks/awards/awards.js) `buildMedia`. The full guardrail (with rationale) lives in [`.cursor/rules/lledsue-eds-js-guardrails.mdc`](../../rules/lledsue-eds-js-guardrails.mdc) under "SVG bypass".

**Async only** when loading a fragment (like header/footer/fragment):

```js
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const fragment = await loadFragment('/<path>');
  // ...
}
```

Hard rules:

- Default export `decorate(block)` for decoration-only blocks, or `decorateAndWire(block)` when the block also wires interactions (export `decorate` as a named export in that case).
- **Interactive blocks:** Phase A first — `decorate` stamps closed-state ARIA / hide attributes and builds full DOM with **no** listeners. Phase B — fill `wire` only after the Interaction sheet exists (see "Light interaction" above). Never put `addEventListener` in `decorate`.
- Always `import` with explicit `.js` extension.
- Use `moveInstrumentation` whenever you create new DOM nodes that replace authored ones - skipping it breaks Universal Editor.
- Handle missing fields with optional chaining; authors may omit any field.
- Do **not** branch on `isUniversalEditor()` — the two-mode boot path gates EDS vs author.

### Step 4: Write `blocks/<id>/<id>.author.js` + `<id>.author.css`

**`<id>.author.js`** — default export `authorize(block)`. For blocks where authors should see decorated chrome:

```js
import decorate from './<id>.js';
// or: import { decorate } from './<id>.js'; when default export is decorateAndWire

export default function authorize(block) {
  decorate(block);
}
```

When the decorated DOM would fight UE click-to-edit, ship a no-op `authorize` and let authors edit raw rows in place.

**`<id>.author.css`** — usually a comment-only stub. Add UE-only chrome here (`body[data-ue-mode]` scope markers, short-value caption boxes). Base styles live in `<id>.css`.

### Step 5: Write `blocks/<id>/<id>.css`

Skeleton (the only prose comment in a block stylesheet is the top-of-file pointer):

```css
/* See ./<id>.md for design notes and rationale. */

.<id> {
  color: var(--ll-color-text-primary);
}

@media (width >= 1024px) {
  .<id> {
    padding-block: var(--ll-space-9);
  }
}
```

Hard rules:

- Every selector must start with `.<id>` (block-scoped). No bare element selectors.
- Do **not** use `.<id>-container` or `.<id>-wrapper` - those are framework-owned (added to the section and the parent div).
- Mobile-first, canonical breakpoints (768 / 1024 / 1440). See [`lledsue-block-conventions`](../../../.cursor/rules/lledsue-block-conventions.mdc).
- Consume design tokens from `:root` in [styles/styles.css](../../../styles/styles.css) before introducing literals. If you need a new token, stop and use `lledsue-create-token` first.
- When pulling token values from Figma, resolve them against **THEME: `LifeLock`** with `get_variable_defs` (not `get_design_context` inline hexes). See [`lledsue-atomic-design`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Figma token extraction (mode-aware)".
- **Comments: pointer + labels + directives.** Keep the top-of-file `/* See ./<id>.md for design notes and rationale. */` pointer, any functional `stylelint-disable*` directives, and small label-only comments that name a region or breakpoint for navigation (`/* LG/XL */`, `/* Feature */`, `/* ---- Feature ---- */`) — a few words, no description. Every descriptive comment — a Figma-value note, an intent note, a trailing `property /* why */` note — goes in the block's `<id>.md` (`## CSS notes`), never inline. See [`lledsue-comment-discipline`](../../../.cursor/rules/lledsue-comment-discipline.mdc) "Block CSS: pointer + labels + functional directives".
- No empty CSS files. If the block needs no styles yet, keep the top-of-file pointer and explain the emptiness in `<id>.md`.

### Step 6: Write `blocks/<id>/_<id>.json`

Three top-level keys: `definitions`, `models`, `filters`. Use `[]` for any that don't apply.

**Simple pattern template:**

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
            "template": {
              "name": "<Title>",
              "model": "<id>"
            }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "<id>",
      "fields": [
        { "component": "<component>", "name": "<fieldName>", "label": "<Field Label>", "valueType": "string" }
      ]
    }
  ],
  "filters": []
}
```

**Filter+item pattern template:**

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
            "template": { "name": "<Title>", "filter": "<id>" }
          }
        }
      }
    },
    {
      "title": "<Item Title>",
      "id": "<itemId>",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/item",
            "template": { "name": "<Item Title>", "model": "<itemId>" }
          }
        }
      }
    }
  ],
  "models": [
    {
      "id": "<itemId>",
      "fields": [
        { "component": "<component>", "name": "<fieldName>", "label": "<Field Label>", "valueType": "string" }
      ]
    }
  ],
  "filters": [
    { "id": "<id>", "components": ["<itemId>"] }
  ]
}
```

Common field shapes:

```json
{ "component": "text", "name": "title", "label": "Title", "valueType": "string" }
{ "component": "richtext", "name": "text", "label": "Text", "valueType": "string" }
{ "component": "reference", "name": "image", "label": "Image", "valueType": "string" }
{ "component": "aem-content", "name": "reference", "label": "Reference" }
{ "component": "select", "name": "variant", "label": "Variant", "options": [{ "name": "Default", "value": "default" }] }
```

Always include `valueType` for primitive fields - eslint-plugin-xwalk flags it otherwise.

**Reserved keys reminder.** A field's `name` is the resource property key, not a label. Do not use `name`, `classes`, `id`, `model`, `template`, `path`, or `resourceType` as a field key. See [.cursor/rules/lledsue-block-conventions.mdc](../../../.cursor/rules/lledsue-block-conventions.mdc) "Reserved field keys" for the full table and symptoms.

### Step 7: Wire into the section filter (if droppable)

Edit [models/_section.json](../../../models/_section.json). Find the filter object with `id: "section"` and append the block id to its `components` array. Keep the array readable; do not reorder existing entries.

Skip this step if the block is meant to be nested inside another block (e.g. an item-only block).

### Step 7.5: Create the static fixture under `test/fixtures/<id>/`

Per the sync contract in [lledsue-testing](../lledsue-testing/SKILL.md) (rule: [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures"), every new block earns a fixture folder.

Minimum two files per block:

- `test/fixtures/<id>/index.html` - overview page that links every variant page with expected class output. Mirrors [test/fixtures/header/index.html](../../../test/fixtures/header/index.html).
- `test/fixtures/<id>/all.html` - every variant rendered on a single page for visual scan / screenshot.

Add per-variant pages (`<variant>.html`) for any variant axis with non-trivial state worth pinning by direct URL.

Template for `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><Title> block - fixture index</title>
  <script type="module" src="/scripts/aem.js"></script>
  <script type="module" src="/scripts/scripts.js"></script>
  <link rel="stylesheet" href="/styles/styles.css">
</head>
<body>
  <header></header>
  <main>
    <div>
      <h1><Title> block fixtures</h1>
      <p>Static HTML pages exercising every variant of <code>blocks/<id></code>. Run the dev server with:</p>
      <pre><code>npx -y @adobe/aem-cli up --no-open --html-folder test/fixtures</code></pre>
      <h2>Variants</h2>
      <ul>
        <li><a href="/test/fixtures/<id>/all">all</a> &mdash; every variant on one page.</li>
        <li><a href="/test/fixtures/<id>/<variant>"><variant></a> &mdash; <one-line description, expected classes>.</li>
      </ul>
    </div>
  </main>
  <footer></footer>
</body>
</html>
```

Template for an authored block fixture (substitute the table-of-divs row count to match the block's model fields):

```html
<div class="<id>">
  <div><div><field 1 value></div></div>
  <div><div><field 2 value></div></div>
</div>
```

Skip this step ONLY for `header` / `footer` chrome blocks (already handled by their own fixture folders) or for item-only blocks that are exclusively rendered inside a parent (the parent's fixture exercises the item).

### Step 7.7: Add the block id to `models/_component-definition.json`

`models/_component-models.json` and `models/_component-filters.json` glob every `../blocks/*/_*.json`, so new blocks are automatically included there. **`models/_component-definition.json` does not** - the file is split into groups (`Default Content`, `Sections`, `Top Nav`, `Footer`, `Product Page`, `Blocks`) and each group's `components` entry is an **explicit brace-list of block folder names**, not a wildcard. A brand-new block that isn't added here will lint fine, build fine, and render fine on the served page - but the Universal Editor picker will never list it, because UE reads `component-definition.json` to populate the picker.

Pick the right group and add the block id inside the brace list (keep it alphabetical to minimize merge conflicts):

- **`Top Nav`** - block only makes sense inside the top-nav chrome (`brand-link`, `mega-menu`, `nav-link` neighbours).
- **`Footer`** - block only makes sense inside the footer chrome.
- **`Product Page`** - block is specific to product landing pages (`product-hero*`, `product-nav`, `product-tile*` neighbours).
- **`Blocks`** - **default for cells and organisms**. This is where the vast majority of general-purpose blocks live (accordion, cards, hero, faq, breadcrumb, ...).

Example (adding `breadcrumb` to the `Blocks` group):

```json
{
  "title": "Blocks",
  "id": "blocks",
  "components": [
    {
      "...": "../blocks/{accordion,arrow-btn,articles,awards,badge,breadcrumb,cards,...}/_*.json#/definitions"
    }
  ]
}
```

Verify after `npm run build:json` (Step 7) with `grep -c '"id": "<id>"' component-definition.json` - a `0` means the manifest edit was skipped.

### Step 8: Run `npm run build:json`

Regenerates `component-models.json`, `component-definition.json`, `component-filters.json` at the repo root. Never edit those files by hand.

```bash
npm run build:json
```

### Step 9: Run `npm run lint`

```bash
npm run lint
```

If it fails, surface the error and offer `npm run lint:fix` for auto-fixable issues. Common failures:

- Missing `valueType` on a model field -> fix in `_<id>.json`.
- Unused import in `<id>.js` -> remove.
- CSS selector not block-scoped -> prefix with `.<id>`.

### Step 10: Confirm

Print a short summary:

```
Created block <id>:
  blocks/<id>/<id>.js
  blocks/<id>/<id>.author.js
  blocks/<id>/<id>.author.css
  blocks/<id>/<id>.css
  blocks/<id>/_<id>.json
  models/_section.json (added "<id>") [if droppable]
  test/fixtures/<id>/index.html
  test/fixtures/<id>/all.html
  test/fixtures/<id>/<variant>.html ... [if any]
  Atomic 2.0 tier: <cell|organism>
  Pattern: <simple|filter-item|columns>
Lint: PASS
```

Tell the user the fixture URL: `http://localhost:4501/test/fixtures/<id>/index`.

**💡 PR Demo URL**: When this block is ready for PR, use the fixture URLs for the demo since the new block has no cloud AEM content yet:
- Primary demo: `https://<branch>--<repo>--<owner>.aem.page/test/fixtures/<id>/all`
- Index: `https://<branch>--<repo>--<owner>.aem.page/test/fixtures/<id>/index`
- Variants: `https://<branch>--<repo>--<owner>.aem.page/test/fixtures/<id>/<variant>`

These fixture URLs work on the preview domain because they're committed code, not CMS content.

### Step 11: Figma verification loop

When the block was written against a Figma reference, run the verification loop from [`lledsue-figma-to-code`](../lledsue-figma-to-code/SKILL.md) "Verification loop" after CSS lands.

## Cross-block reuse (dependency ledger)

If the new block **reuses another block's code** (imports its named exports, materializes its DOM shape, or `loadCSS` for its stylesheet) - as `faq` does with `accordion` - you must record the coupling in **both** directions per [`.cursor/rules/lledsue-block-tiers.mdc`](../../../.cursor/rules/lledsue-block-tiers.mdc) "Cross-block dependencies (Depends on / Dependents ledger)":

- Add a `## Depends on` section to the new block's `blocks/<id>/<id>.md` naming the exact reused surface (JS exports + return shapes, DOM contract, CSS classes) and what to do if each changes.
- Add the reciprocal `## Dependents` section to the provider's `blocks/<provider>/<provider>.md` (create that `<provider>.md` if missing), listing your block and the reused surface, plus a "public reuse surface - do not break silently" list. Add a JSDoc note to each reused export in the provider flagging it as public.
- Scope any CSS override of the provider's internals under a class your block owns (e.g. `.faq__list .accordion__icon`), and document it as intentional coupling. Never reach into another block's internals from an unscoped selector.
- Reuse code, not the provider's `_<provider>.json` model - define your own so the provider's model can evolve independently.

## Anti-patterns

- Do **not** edit the root `component-models.json`, `component-definition.json`, `component-filters.json`.
- Do **not** skip the `models/_component-definition.json` group edit (Step 6.7). The block will build, lint, and render fine but never appear in the Universal Editor picker. Verify with `grep -c '"id": "<id>"' component-definition.json`.
- Do **not** reuse another block's exports / DOM / CSS without recording it in the `## Depends on` / `## Dependents` ledger (both `<id>.md` files). Undocumented coupling breaks silently when the provider changes.
- Do **not** modify [scripts/aem.js](../../../scripts/aem.js).
- Do **not** create `.<id>-container` or `.<id>-wrapper` CSS classes.
- Do **not** skip `moveInstrumentation` when restructuring authored DOM.
- Do **not** invent breakpoints other than `900px` without explicit user approval.
- Do **not** ship a new block without `test/fixtures/<id>/index.html` + `all.html`. The fixture is the visible regression surface for this block; see [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures".
- Do **not** put block fixtures under `drafts/`. `drafts/` is for ad-hoc authored mockups; keeper fixtures live under `test/fixtures/<id>/`.
- Do **not** use a reserved field key as a model field's `name` - they collide with JCR / EDS resource properties. See [.cursor/rules/lledsue-block-conventions.mdc](../../../.cursor/rules/lledsue-block-conventions.mdc) "Reserved field keys".

## Keep the playbook in sync

This skill owns topics summarized in [`docs/component-development-playbook.md`](../../../docs/component-development-playbook.md) (the block file set, the dev loop, the scaffolding commands). If you **change how this skill works** - its workflow, the files it scaffolds, the commands it runs, or the conventions it enforces - update the playbook in the same change per [`.cursor/rules/lledsue-playbook-maintenance.mdc`](../../../.cursor/rules/lledsue-playbook-maintenance.mdc). A normal run that just produces a block per the existing conventions needs no playbook edit.
