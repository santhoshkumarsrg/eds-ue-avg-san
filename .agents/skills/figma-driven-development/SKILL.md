---
name: figma-driven-development
description: Build AEM Edge Delivery pages/blocks from Figma designs and validate them pixel-perfect against desktop AND mobile breakpoints. Wraps the content-driven-development workflow, extracts original assets/tokens from Figma, then uses the chrome-devtools MCP to compare the rendered page to the designs. Use when a task references Figma, a figma.com URL, a mockup/design, "pixel perfect", or matching a design across desktop and mobile.
license: Apache-2.0
metadata:
  version: "1.0.0"
---

# Figma-Driven Development (FDD)

Build and refine AEM Edge Delivery Services pages/blocks directly from Figma designs, then validate the rendered result is pixel-perfect against both **desktop** and **mobile** breakpoints using the chrome-devtools MCP.

This skill **wraps** the `content-driven-development` (CDD) skill. CDD owns the build loop (dev server, content model, test content, implementation, lint, ship). FDD adds the Figma-specific steps: collecting designs, extracting original assets/tokens, and pixel-perfect visual validation.

**CRITICAL: Do not start implementing until you have BOTH a desktop and a mobile Figma design reference.** If either is missing, ask the user (see Step 1).

## When to Use

- A task references Figma, a `figma.com` URL, a mockup, or a visual design
- The user asks for a "pixel perfect" match, or to match a design on desktop and mobile
- Building or restyling a block/page where a design is the source of truth

## Required Tools

- **Figma MCP** (`plugin-figma-figma` / `user-Figma`): `get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs`, `download_assets`
- **chrome-devtools MCP** (`user-chrome-devtools`): `navigate_page`, `resize_page`, `take_screenshot`, `list_console_messages`, `evaluate_script`
- Always read a tool's descriptor under `mcps/<server>/tools/<tool>.json` before first use.

## Preflight: verify chrome-devtools MCP (do this FIRST)

Pixel-perfect validation depends on the chrome-devtools MCP. Before doing anything else, confirm it is enabled.

1. Check that the `user-chrome-devtools` server is available — e.g. list its tools under `mcps/user-chrome-devtools/tools/` (and confirm `take_screenshot`, `resize_page`, `navigate_page` exist).
2. **If chrome-devtools MCP is available:** proceed to Step 0.
3. **If chrome-devtools MCP is NOT enabled/usable:** STOP and ask the user for confirmation before starting. Use AskQuestion (or ask plainly):

   > "The chrome-devtools MCP isn't usable, so I can't do screenshot-based pixel-perfect validation with it. Do you want me to continue using a different MCP (e.g. another browser/automation MCP) to validate the UI?"

   - If the user names/approves a different validation MCP → use it for Step 7 (resize, screenshot, compare) and continue.
   - If the user declines or no alternative is available → do not start the build loop. Stop and let the user enable chrome-devtools MCP first.

   **Only after this is resolved** (chrome-devtools available, or the user explicitly approves an alternative MCP) start the process below.

## Breakpoints

Match the project's mobile-first breakpoints. Validate at minimum:

| Breakpoint | Width × Height | Source design |
|------------|----------------|---------------|
| Mobile     | 390 × 844      | Mobile Figma frame |
| Desktop    | 1440 × 1024    | Desktop Figma frame |

Also spot-check tablet (768) if the design defines one.

---

## Workflow

### Step 0: Create TodoList

Create a todo list with these tasks (extends the CDD list):

1. Collect desktop + mobile Figma designs (ask if missing)
2. Start dev server (CDD Step 1)
3. Analyze designs + extract tokens/assets from Figma
4. Reuse check: core Franklin component → existing block → Block Collection → custom (see "Reuse before you build")
5. Design content model (CDD Step 3)
6. Identify/create test content (CDD Step 4)
7. Implement (CDD Step 5)
8. Pixel-perfect validation: desktop + mobile vs Figma (iterate)
9. Lint, final validation, ship (CDD Steps 6–8)

### Step 1: Collect Figma Designs (ask if missing)

You need a **node-specific** URL for each breakpoint, e.g. `https://figma.com/design/:fileKey/:name?node-id=:nodeId`.

If desktop and/or mobile designs were **not** provided, ask the user with AskQuestion before doing anything else:

> "To match this pixel-perfect I need the Figma frames for both breakpoints. Please share: (1) the **desktop** Figma URL (node-specific), and (2) the **mobile** Figma URL (node-specific)."

Do not guess node IDs and do not proceed with only one breakpoint. Parse `fileKey` and `nodeId` from each URL (convert `node-id=1-2` → `1:2`).

### Step 2: Start Dev Server

Follow CDD Step 1 (`aem up --no-open --forward-browser-logs`, verify `http://localhost:3000` returns 200).

### Step 3: Analyze Designs + Extract from Figma

For **each** breakpoint frame:

1. **Structure**: `get_metadata` to map sections/child node IDs.
2. **Design + code reference**: `get_design_context` for layout, text, and a screenshot.
3. **Tokens**: `get_variable_defs` to get exact colors, fonts, sizes, spacing (e.g. `Green=#008941`, `Black=#1C222E`, `Grays/Gray 3=#697284`, heading/body font scales). **Map every Figma token to an existing AVG theme token — never eyeball or hardcode hex codes.** The project already ports the AVG design system (colors + typography scale) from `avg/ui.frontend` into `styles/styles.css` `:root`:
   - **Colors** → `var(--avg-…)` (e.g. `--avg-green`, `--avg-alt-green`, `--avg-black`, `--avg-gray3`, `--avg-gray4`, `--avg-white`). The Figma `Green/Black/Gray N` values correspond 1:1 to these.
   - **Typography** → `var(--tp-fs-<name>)` / `var(--tp-lh-<name>)` (e.g. `h1`, `h2`, `body2`). These are responsive (mobile default, desktop overridden at `>= 900px`), so a heading set to `--tp-fs-h2`/`--tp-lh-h2` resizes automatically — don't write per-breakpoint `font-size`.
   - **Block CSS must contain zero raw color codes.** Use `var(--avg-…)`. For semi-transparent brand colors (overlays/shadows) use relative color syntax against a token: `rgb(from var(--avg-black) r g b / 45%)`.
   - If a needed brand value is missing from `:root`, add it there **once** (using the AVG name) and reference it from every block. See [references/avg-theme-tokens.md](references/avg-theme-tokens.md) for the full catalog and the source SCSS files.
4. **Original assets**: prefer the real Figma assets over placeholders. Use `download_assets` on the section node:
   - **Raster photos** (hero/banner) come back under `rawImages`; pick the correct one by dimensions, convert large PNGs to JPEG (`sips -s format jpeg -s formatOptions 80 in.png --out out.jpg`).
   - **Vector illustrations** with a single asset → download the SVG directly.
   - **Multi-part vector** illustrations/icons (no single asset) → re-export the section with `defaultScale: 2`/`3`, then crop the element with Python/Pillow and auto-trim against the section background color.
5. Save assets to the project (`media/` for content imagery, `icons/` for icons) with reasonable sizes (optimize before commit).

Document the per-section spec (colors, fonts, spacing, asset paths) for the implementation step.

Read [references/asset-extraction.md](references/asset-extraction.md) for exact commands and pitfalls.

### Step 4–6: Model, Content, Implement

Run CDD Steps 3–5 (content model → test content → implementation via `building-blocks`). Implement **mobile-first**, then layer desktop via `min-width` media queries, applying the Figma tokens and assets from Step 3. Watch the common pitfalls in [references/asset-extraction.md](references/asset-extraction.md) (SVG `preserveAspectRatio`, fragment `default-content-wrapper` collapsing columns).

#### Reuse before you build (decision ladder)

Always exhaust reuse before creating anything custom. Work down this ladder and stop at the first match:

1. **Core Franklin component / type?** Before creating a custom component or field type, check [references/franklin-components.json](references/franklin-components.json) — the authoritative export of registered `core/franklin/components/*` (everything with `componentGroup: "Franklin"`: `image`, `text`, `title`, `button`, `columns`, `section`, `block`, …). If one fits, use it (see the Button/Columns guidance below).
2. **Existing project block?** Before creating a new block, look in `blocks/` for one that already covers the need (possibly with a new style variation via its `classes` multiselect). Extend/restyle the existing block rather than forking a near-duplicate (e.g. a "media + text" need is just the core `columns` block with a `prose` variation — don't build a bespoke `media-text` block).
3. **AEM Block Collection blueprint?** Before building a genuinely new custom block, check the **AEM Block Collection** at <https://www.aem.live/developer/block-collection> (and Block Party) for a vetted content-structure blueprint (Hero, Columns, Cards, Accordion, Carousel, Tabs, Quote, Embed, Fragment, Table, Video, etc.). Start from its content model instead of inventing one.
4. **Only then** create a custom block — using `core/franklin/components/block/v1/block`, never a made-up resourceType.

#### Prefer core Franklin components over custom markup/code

Before hand-rolling structure (buttons via formatted links, columns via custom split code), check whether a **core Franklin component** already does it (per the ladder above). They give authors first-class, discoverable UI and avoid bespoke decoration logic. Common ones (resourceTypes under `core/franklin/components/*`): `button`, `title`, `text`, `image`, and `columns`.

**Buttons → core Button component.** Prefer `core/franklin/components/button/v1/button` (model: Link / Text / Title / Type=default·primary·secondary) over the formatted-link convention. It renders `<p class="button-container"><a class="button primary">…</a></p>`.

- A core component can only be **inserted into a container** whose filter lists it. `button`/`title`/`text`/`image` are already allowed in `section` and `column`.
- To let authors place a Button **inside a custom block** (e.g. a hero), the block must be a **container**: definition uses `template.filter` (not `model`) and you add a filter like `{ "id": "hero", "components": ["image","title","text","button"] }`. The block's `decorate()` then reads the rendered children (picture → background, headings/paragraphs/buttons → content).
- To brand all buttons in a block (e.g. AVG green), in `decorate()` add your brand class to every `a.button` and normalize the wrapper: `btn.classList.add('avg'); btn.closest('p')?.classList.add('button-wrapper');` (core Button emits `button-container`; the project styles `button-wrapper`). Then style `.<block> a.button.<brand>`.

**Two-column "media + text" → core Columns component.** Prefer `core/franklin/components/columns/v1/columns` over a custom block that splits columns in JS. Author a 2-column Columns block (Image | Text + Button); `column` already allows `image`/`text`/`button`/`title`. Add a style variation via the columns `classes` multiselect (e.g. `prose`, `image-right`) and scope your CSS to `.columns.<variation>` so generic columns are unaffected.

**Fallback (formatted link).** Only when a real Button component isn't viable, EDS auto-decorates a **formatted link alone in its paragraph** (`decorateButtons` in `scripts/scripts.js`): **bold** → `button primary`, *italic* → `button secondary`, ***bold+italic*** → `button accent`. Mock markup: `<p><strong><a href="…">Label</a></strong></p>`.

### Step 7: Pixel-Perfect Validation (iterate)

Use the validation MCP confirmed in Preflight (chrome-devtools, or the alternative the user approved). For **each** breakpoint, compare the rendered page to the Figma frame and fix differences until they match. Loop:

1. `resize_page` to the breakpoint size, then `navigate_page` to the test URL (resize before navigate; re-apply after navigation if the window reset).
2. `take_screenshot` (use `fullPage: true` for whole-page, or capture a specific section) and save to `drafts/tmp/`.
3. Get the matching Figma reference with `get_screenshot` (or reuse Step 3's screenshot) at a comparable size.
4. Diff section-by-section. Check, in order:
   - **Layout/structure** (section order, columns vs stacked, alignment)
   - **Spacing** (padding, gaps, margins)
   - **Images** (correct asset, aspect ratio, not stretched/cropped wrong)
   - **Color** (background, text, buttons, borders — against tokens)
   - **Typography** (family, size, weight, line-height, letter-spacing)
   - **Button sty/icon, links, dividers**
5. When a value looks wrong, confirm with `evaluate_script` (`getComputedStyle`) instead of guessing — selectors silently failing is a common cause.
6. Fix CSS/JS/content, reload, re-screenshot. Repeat until both breakpoints match.
7. `list_console_messages` — resolve real errors (ignore the local-draft Quirks-Mode notice).

Use the checklist in [references/validation-checklist.md](references/validation-checklist.md).

**Done when:** desktop and mobile both visually match their Figma frames and no console errors.

### Step 8: Lint, Final Validation, Ship

Run CDD Steps 6–8. Before finishing, **delete temporary screenshots** written to `drafts/tmp/` (keep only intended test content). Lint only your edited files if the repo-wide lint has unrelated pre-existing failures.

---

## Anti-Patterns to Avoid

- ❌ Implementing with only one breakpoint's design (always get desktop **and** mobile)
- ❌ Recreating illustrations/icons by hand when the original Figma asset can be exported
- ❌ Hand-rolling buttons (formatted links) or column-splitting code when a core Franklin component (`button`, `columns`, …) already does it — prefer core components
- ❌ Creating a custom block/type without first checking `references/franklin-components.json`, existing `blocks/`, and the AEM Block Collection — reuse before you build
- ❌ Forking a near-duplicate block when an existing block + a new style variation (`classes`) would do
- ❌ Eyeballing colors/sizes when `get_variable_defs` provides exact tokens
- ❌ Hardcoding hex/`rgb()` color codes in block CSS — always reference an `--avg-*` token (define it once in `styles/styles.css` `:root` if missing); use `rgb(from var(--avg-…) r g b / N%)` for transparency
- ❌ Writing per-breakpoint `font-size`/`line-height` when an AVG type token (`--tp-fs-*`/`--tp-lh-*`) already encodes the responsive value
- ❌ Declaring "pixel perfect" from the desktop view alone — verify mobile too
- ❌ Leaving `preserveAspectRatio="none"` + `width/height="100%"` on exported SVGs (causes stretching)
- ❌ Committing temporary screenshots from `drafts/tmp/`

## Resources

- [references/avg-theme-tokens.md](references/avg-theme-tokens.md) — AVG color palette + typography scale tokens (ported from `avg/ui.frontend`); map Figma tokens to these and never hardcode colors in block CSS
- [references/franklin-components.json](references/franklin-components.json) — registered `core/franklin/components/*` to reuse before creating a custom type
- [AEM Block Collection](https://www.aem.live/developer/block-collection) — vetted block blueprints to reuse before building a new custom block
- [references/asset-extraction.md](references/asset-extraction.md) — exact Figma asset/token extraction commands and known pitfalls
- [references/validation-checklist.md](references/validation-checklist.md) — per-breakpoint pixel-perfect checklist
- Related skills: `content-driven-development`, `building-blocks`, `analyze-and-plan`, `content-modeling`, `testing-blocks`
