---
name: lledsue-create-token
description: Add a design token (Atomic 2.0 atom) as a CSS custom property in styles/styles.css. Use when the user asks to add a color, spacing, motion, breakpoint, font-size, shadow, opacity, border, or grid token. Refuses to create one-off block-scoped variables - those belong inside the block's CSS.
---

# lledsue-create-token

Adds a design token to the global `:root` in [styles/styles.css](../../../styles/styles.css). In Atomic 2.0 terms, **only foundational styles are atoms** - if a value is shared across components, it belongs here. If it's used by a single block, it belongs inside that block's CSS, not as a token. `styles.css` is the single render-blocking stylesheet shipped first-in-head, so `var(--ll-*)` references resolve in every mode (Author UE, EDS, Runtime) - see [.cursor/rules/lledsue-block-tiers.mdc](../../../.cursor/rules/lledsue-block-tiers.mdc).

## Allowed atom categories

Match Atomic 2.0 exactly:

- `border`
- `breakpoints`
- `color`
- `grids`
- `motion`
- `opacity`
- `shadows`
- `spacing`
- `text` (fonts and font-sizes)

Refuse anything outside this list and ask the user to reframe.

## Required inputs

Ask via `AskQuestion` for anything not provided:

- **Category** - one of the nine above.
- **Name** - kebab-case, no `--` prefix (the skill adds it). Should follow the existing convention:
  - Color: `--<role>-color` (e.g. `--accent-color`, `--surface-color`).
  - Font family: `--<role>-font-family` (e.g. `--mono-font-family`).
  - Font size: `--<scale>-font-size-<size>` (e.g. `--body-font-size-l`, `--heading-font-size-m`).
  - Spacing: `--space-<scale>` (e.g. `--space-s`, `--space-m`).
  - Motion: `--motion-<role>` (e.g. `--motion-fast`).
  - Shadow: `--shadow-<role>` (e.g. `--shadow-card`).
  - Opacity / border / grid: `--<role>-<descriptor>`.
- **Value** - any valid CSS value. If sourced from Figma, resolve it against **THEME: `LifeLock`** using `get_variable_defs` (the authoritative, mode-aware source) - never copy an inline hex from `get_design_context`, which can bake a value from the wrong variable mode. See [`lledsue-atomic-design`](../../../.cursor/rules/lledsue-atomic-design.mdc) "Figma token extraction (mode-aware)".
- **Desktop override** - optional. If provided, added to the existing `@media (width >= 900px) { :root { ... } }` block.
- **Dark-mode override** - optional. If provided, added to a `@media (prefers-color-scheme: dark) { :root { ... } }` block (creating it if it doesn't exist).

## When to refuse

- The token would be used by exactly one block. Suggest a block-scoped CSS custom property declared inside that block's `.css` file instead.
- A token with the same name already exists with a different value. Ask the user whether to rename, replace, or pick a different value.
- The user is trying to add a breakpoint other than `900px`. The project standardizes on a single `min-width: 900px` breakpoint; ask for confirmation before adding `600px` or `1200px` (AGENTS.md mentions them but they are not currently used).

## Workflow

```
- [ ] Step 1: Validate inputs and uniqueness
- [ ] Step 2: Locate the right insertion point in :root
- [ ] Step 3: Insert the token
- [ ] Step 4: Add desktop override (if provided)
- [ ] Step 5: Add dark-mode override (if provided)
- [ ] Step 5.5: Append a swatch entry to test/fixtures/tokens/<category>/index.html
- [ ] Step 6: Run npm run lint
- [ ] Step 7: Confirm
```

### Step 1: Validate

- Read [styles/styles.css](../../../styles/styles.css) and search for `--<name>:`. If found, follow the "token already exists" branch above.
- Confirm the value is syntactically valid CSS (e.g. color values parse, units present on lengths).

### Step 2: Locate the insertion point

Tokens are grouped by category in `:root`. Find the existing block of variables with the same category and insert next to them. Existing groupings to look for (anchor by surrounding tokens):

- Colors: cluster around `--background-color`, `--text-color`, `--link-color`.
- Body fonts: cluster around `--body-font-family`, `--body-font-size-m`.
- Heading fonts: cluster around `--heading-font-family`, `--heading-font-size-xxl`.
- Layout: cluster around `--nav-height`.

If a category doesn't exist yet (e.g. no shadows defined), create a new group at the end of `:root` with a single-line comment marking the category, e.g. `/* shadows */`.

### Step 3: Insert the token

```css
:root {
  /* ... existing tokens ... */
  --<name>: <value>;
}
```

Two-space indentation, semicolon terminator, no trailing whitespace.

### Step 4: Per-breakpoint override

If the user provided one, insert into the matching canonical-breakpoint `@media (width >= 768|1024|1440px) { :root { ... } }` block already present in [styles/styles.css](../../../styles/styles.css) (used for the `--ll-grid-*` semantic aliases today). Do **not** create a non-canonical breakpoint - the project enforces 768 / 1024 / 1440 via the `plugin/canonical-breakpoints` Stylelint rule.

### Step 5: Dark-mode override

If the user provided one and a `@media (prefers-color-scheme: dark)` block exists, extend it. Otherwise create one at the end of [styles/styles.css](../../../styles/styles.css).

### Step 5.5: Append a swatch to the token fixture

Per the sync contract in [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures", every new token earns a swatch entry under `test/fixtures/tokens/<category>/index.html`.

Locate the right category page (create it if it doesn't exist yet — the eight atom categories are `color`, `spacing`, `motion`, `shadows`, `opacity`, `border`, `breakpoints`, `grids`, `text`). Append an entry following the category's documented swatch shape:

**Color** — append to the swatch grid:

```html
<div class="swatch">
  <span class="swatch__chip" style="background: var(--<name>);"></span>
  <code class="swatch__name">--<name></code>
  <code class="swatch__value">#xxxxxx</code>
</div>
```

**Spacing** — append a row to the scale demo:

```html
<div class="scale-row">
  <span class="scale-row__bar" style="inline-size: var(--<name>);"></span>
  <code class="scale-row__name">--<name></code>
  <code class="scale-row__value">Npx</code>
</div>
```

**Motion** — append a transition demo:

```html
<div class="motion-row">
  <button type="button" class="motion-row__demo" style="transition: transform var(--<name>);">Hover me</button>
  <code class="motion-row__name">--<name></code>
</div>
```

**Shadows** — append a card sample:

```html
<div class="shadow-card" style="box-shadow: var(--<name>);">
  <code>--<name></code>
</div>
```

**Opacity** — append a swatch with the value applied:

```html
<div class="opacity-row" style="opacity: var(--<name>);">
  <code>--<name></code>
</div>
```

**Border / breakpoints / grids / text** — follow the documented swatch shape in the existing category fixture, or seed one when adding the first token in a new category.

If the category fixture doesn't exist yet, create `test/fixtures/tokens/<category>/index.html` with the documented page skeleton (header, brief description, and the swatch container).

### Step 6: Run `npm run lint`

```bash
npm run lint
```

Stylelint will catch invalid values, duplicate properties, and ordering issues. Fix or surface errors.

### Step 7: Confirm

Print:

```
Added token --<name>: <value> (<category>)
  styles/styles.css :root [+ per-breakpoint override / + dark-mode override]
  test/fixtures/tokens/<category>/index.html (appended swatch)
Lint: PASS
```

Recommend any blocks that should be migrated from a literal to the new token, but do **not** migrate them in this skill - that's `lledsue-enhance-block`.

## Anti-patterns

- Do **not** add tokens anywhere except [styles/styles.css](../../../styles/styles.css). Not in `lazy-styles.css`, not in block CSS.
- Do **not** introduce a new breakpoint silently.
- Do **not** rename existing tokens. That breaks consumers across the codebase; use a separate refactor for that.
- Do **not** delete or reorder existing tokens.
- Do **not** ship a new token without appending a swatch to `test/fixtures/tokens/<category>/index.html`. The fixture is the visible regression surface for the token ladder; see [.cursor/rules/lledsue-testing.mdc](../../../.cursor/rules/lledsue-testing.mdc) "Static fixtures".

## Keep the playbook in sync

This skill owns the token-tier story summarized in [`docs/component-development-playbook.md`](../../../docs/component-development-playbook.md) (atom tier, `--ds-*`/`--ll-*`/`--<abbr>-*` vocabulary, canonical breakpoints). If you **change how this skill works** - the token tiers, the categories, or where tokens are declared - update the playbook in the same change per [`.cursor/rules/lledsue-playbook-maintenance.mdc`](../../../.cursor/rules/lledsue-playbook-maintenance.mdc). A normal run that just adds a token needs no playbook edit.
