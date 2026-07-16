# EDS + Universal Editor Development Guide

How-to guide for common development tasks in this project (Edge Delivery Services
with AEM Universal Editor authoring, a.k.a. "xwalk"). All examples reference real
code in this repository.

## Table of Contents

1. [How authoring definitions are organized](#1-how-authoring-definitions-are-organized)
2. [Adding UE authoring fields for blocks](#2-adding-ue-authoring-fields-for-blocks)
3. [Adding UE authoring fields for the page (page properties)](#3-adding-ue-authoring-fields-for-the-page-page-properties)
4. [Creating normal (simple) blocks](#4-creating-normal-simple-blocks)
5. [Creating container blocks](#5-creating-container-blocks)
6. [Allowing blocks to be added to a page in UE](#6-allowing-blocks-to-be-added-to-a-page-in-ue)
7. [Custom styling for sections](#7-custom-styling-for-sections)
8. [Customizing the header and footer](#8-customizing-the-header-and-footer)
9. [Error page content (404 and 500)](#9-error-page-content-404-and-500)
10. [Analytics in EDS](#10-analytics-in-eds)
11. [Sitemap and robots.txt](#11-sitemap-and-robotstxt)
12. [Other patterns used in this project](#12-other-patterns-used-in-this-project)
13. [Bulk metadata and `<html lang>` inheritance](#13-bulk-metadata-and-html-lang-inheritance)

---



## 1. How authoring definitions are organized

Universal Editor reads three aggregated JSON files at the repo root. **Never edit
these by hand** — they are generated:


| Generated file              | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `component-definition.json` | Which components exist (grouped in the UE component picker) |
| `component-models.json`     | The authoring dialog (fields) for each component            |
| `component-filters.json`    | Which components are allowed inside which containers        |


The sources are partial files, merged by `npm run build:json`
(see `package.json`, uses `merge-json-cli`):

- `models/_page.json`, `models/_section.json`, `models/_text.json`, etc. — page,
section and default-content models
- `blocks/{name}/_{name}.json` — one partial per block, containing that block's
`definitions`, `models` and `filters`
- `models/_component-definition.json`, `models/_component-models.json`,
`models/_component-filters.json` — the merge manifests that include all of the
above via `"..."` references (e.g. `"../blocks/*/_*.json#/models"`)

**Workflow after any model change:**

```bash
npm run build:json   # regenerate the three aggregated files
npm run lint         # eslint-plugin-xwalk validates model best practices
```

Commit both the partial and the regenerated aggregated files.

## 2. Adding UE authoring fields for blocks

Each block's dialog is defined in its `models` array in `blocks/{name}/_{name}.json`.
Example from `blocks/hero/_hero.json`:

```json
{
  "id": "hero",
  "fields": [
    { "component": "reference", "name": "image", "label": "Background Image", "multi": false },
    { "component": "text", "valueType": "string", "name": "imageAlt", "label": "Image Alt Text" },
    { "component": "text", "valueType": "string", "name": "heading", "label": "Heading" },
    { "component": "aem-content", "name": "link", "label": "Button Link" },
    { "component": "text", "valueType": "string", "name": "linkText", "label": "Button Label" }
  ]
}
```

Commonly used field components:


| Component                                   | Use for                      | Example in project                |
| ------------------------------------------- | ---------------------------- | --------------------------------- |
| `text`                                      | Single-line strings          | `heading` in hero                 |
| `text` + `multi: true`                      | String lists                 | `keywords` in `models/_page.json` |
| `richtext`                                  | Formatted HTML content       | `features` in pricing             |
| `reference`                                 | Asset picker (images)        | `image` in hero                   |
| `aem-content`                               | Internal page/content picker | `link` in hero                    |
| `select` / `multiselect`                    | Fixed option lists           | section `style`                   |
| `boolean`, `number`, `date-time`, `aem-tag` | As named                     | —                                 |


Conventions and gotchas:

- Field `name` determines the order/position of the value in the rendered block
row. The rendered HTML puts each field's value in a `<div>` inside the block —
your `decorate()` in `{name}.js` reads them positionally, so **field order is a
contract**. Changing field order or removing fields can break existing pages.
- Pairs like `image`/`imageAlt` and `link`/`linkText` are automatically combined
by EDS into a single `<img alt>` / `<a>` respectively (suffix convention).
- Use `description` liberally — it renders as help text for authors (see
`blocks/pricing/_pricing.json` for good examples, e.g. explaining the `{buy_link}`
placeholder behavior on `buyLabel`).
- Fields that should not display but drive behavior can be rendered and then hidden
by the block JS (e.g. pricing's `sku` and `campaignCode` become `data-*`
attributes).

After editing, run `npm run build:json && npm run lint`.

## 3. Adding UE authoring fields for the page (page properties)

Page properties live in `models/_page.json` under the `page-metadata` model. The
project currently exposes Title (`jcr:title`), Description (`jcr:description`) and
Keywords. To add a property, append a field:

```json
{
  "component": "text",
  "valueType": "string",
  "name": "author",
  "label": "Author Name"
}
```

- The `name` becomes a `<meta>` tag in the rendered head, readable at runtime via
`getMetadata('author')` from `scripts/aem.js`.
- Use `og:` / `twitter:` prefixed names for social meta tags.
- Two special metadata names are consumed by our code: `nav` and `footer`
(see [section 8](#8-customizing-the-header-and-footer)).
- Rebuild with `npm run build:json` afterwards.

For properties applied across many pages at once (whole locale subtrees, folder
sections, etc.), use a bulk `metadata` sheet instead of per-page authoring —
see [section 13](#13-bulk-metadata-and-html-lang-inheritance) for the AEM/UE-specific
authoring steps and a worked `lang` (`<html lang>`) example.

### What EDS renders into `<head>` automatically

Before adding anything, know what you get for free. The EDS delivery tier
renders these into every page head from the page's title, description, and
first image — verified against this site's preview host:

```html
<link rel="canonical" href="https://main--eds-ue-avg-san--santhoshkumarsrg.aem.page/">
<meta property="og:title" content="…">
<meta property="og:description" content="…">
<meta property="og:url" content="…">
<meta property="og:image" content="…/media_…png?width=1200&format=pjpg&optimize=medium">
<meta property="og:image:secure_url" content="…">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="…">
<meta name="twitter:description" content="…">
<meta name="twitter:image" content="…">
```

Any of these can be **overridden per page** by a metadata property of the same
name (`canonical`, `og:image`, `twitter:card`, …) — add the field to
`models/_page.json` or set it via bulk metadata. Setting a property to an empty
string removes the tag (e.g. `Canonical: ""` removes the canonical link).

### Three ways to add `<head>` content

1. **Page metadata (per page, author-controlled).** Every field in the
  `page-metadata` model becomes a `<meta name="…" content="…">` tag (or
   overrides one of the automatic tags above). Use this for anything that
   varies by page: `robots`, `og:image` overrides, `google-site-verification`,
   custom taxonomy values.
2. `head.html` **(global, static).** Its contents are injected verbatim into
  every page's head at render time. This is where the CSP meta, viewport,
   `aem.js`/`scripts.js` module scripts and `styles.css` link live. Add global,
   never-changing tags here (favicons, preconnect/dns-prefetch hints, font
   preloads). Keep it minimal — it has no templating, runs no logic, and
   everything in it blocks or competes with LCP.
3. **Runtime injection from JS (dynamic).** Anything conditional gets appended
  to `document.head` from `scripts/scripts.js` (or a block) in the right
   loading phase. This is how JSON-LD, hreflang links, or per-environment tags
   are done:

```js
function addJsonLd(data) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.append(script);
}
```



### Adding content to `<body>`

There is no `body.html` equivalent — the body is the authored content. The
hooks, in order of preference:

- **Authored sections/blocks** — the normal path for anything visible.
- **Auto-blocks** — `buildAutoBlocks()` in `scripts/scripts.js` (currently a
TODO stub) is the designated hook for synthesizing blocks from page context,
e.g. building a hero from the first H1 + image, or injecting a breadcrumb on
every page without authors placing it.
- **Fragments** — reusable authored content loaded into any page via the
`fragment` block or `loadFragment()` (this is how header/footer work).
- **Direct DOM injection** — for non-content elements like a consent banner
mount point or a chat widget container, prepend/append to `document.body`
from the lazy or delayed phase:

```js
// scripts/delayed.js — e.g. consent banner mount point
const mount = document.createElement('div');
mount.id = 'consent-banner';
document.body.append(mount);
```

**`<noscript>` cannot be added this way** — see the next subsection.

### Rendering `<noscript>` content (normal and GTM)

**Bottom line: you cannot add `<noscript>` to regular EDS pages.** A normal
page's `<body>` is generated server-side by the aem.live backend from authored
content — there is no `body.html` template in the repo, so there is no place to
put body-level noscript markup (text, `<iframe>`, `<img>`, etc.) on delivered
content pages. The repo's only static injection point is `head.html`, and a
head-level noscript may contain **only** `link`/`style`/`meta` — not text or
flow content. So body noscript content is possible **only** on the static HTML
files this repo owns and fully controls (`404.html`, or a `/no-js.html` you
commit), or by injecting at a BYO CDN edge. Everything below explains why and
what to do instead.

**How the element actually works.** The HTML parser handles `<noscript>`
differently depending on whether scripting is on when the page is *parsed*
(HTML spec / MDN):

- **JS enabled** → children are parsed as **raw text**. They never become
  elements, so nothing loads or renders. This is also why *injecting* a
  noscript from JS is doubly pointless: the injection needs JS, and even once
  in the DOM the content stays inert.
- **JS disabled** → children are parsed as **real HTML**. This is the only
  case where the content renders — and it requires the markup to already be in
  the HTML the server sent.
- **In `<head>`**, a noscript may validly contain only `link`, `style`, and
  `meta`. Flow content (`iframe`, `img`, `p`, …) belongs in body-level
  noscripts.

**What EDS gives you to work with.** The only static injection point into
every page's initial HTML is `head.html`; there is no `body.html`. And this
project's pages require JS to display at all — `styles/styles.css` sets
`body { display: none }` until `scripts.js` adds `.appear`. That yields these
legitimate patterns, all `head.html`-based and spec-valid:

```html
<!-- 1. un-hide content for no-JS visitors (undecorated but readable) -->
<noscript><style>body { display: block; }</style></noscript>

<!-- 2. no-JS-only stylesheet, e.g. to hide JS-dependent UI shells -->
<noscript><link rel="stylesheet" href="/styles/no-js.css"></noscript>

<!-- 3. redirect no-JS visitors to a static fallback page -->
<noscript><meta http-equiv="refresh" content="0; url=/no-js.html"></noscript>
```

Pattern 3 is the escape hatch for *body-level* noscript needs: `/no-js.html`
is a static file committed to the repo (served like `404.html`), so it can
validly contain a visible "please enable JavaScript" message, alternative
content, and any tracking pixels — no parser tricks required.

**GTM's noscript, specifically.** Know what it actually buys you before
working to replicate it. The `ns.html` iframe runs **no JavaScript**: there is
no dataLayer, no variables, no triggers beyond page-view, and the standard
GA4/Analytics tags do not function. The **only** tag type that fires is a
Custom Image tag — a pixel GET request whose URL you must build by hand
(e.g. a GA4 Measurement Protocol URL). In practice its 2026 audience is not
users (JS-off browsing is statistically zero) but SEO/audit tools, some of
which flag a GTM install as incomplete without it.

Options for EDS, ranked:

1. **Skip it** (recommended). The site doesn't render without JS, so there is
   no no-JS user journey to measure. CDN request logs already count those
   hits.
2. **Skip GTM, keep a pixel.** If you want a no-JS pageview beacon, a plain
   image pixel does exactly what GTM's noscript would, without the iframe
   indirection — put it on the `/no-js.html` fallback page (pattern 3), or
   accept invalid-but-working head placement (see 4).
3. **Full fidelity via the fallback page.** Put Google's verbatim snippet
   (`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX" …></iframe></noscript>`)
   immediately after `<body>` on `/no-js.html` and on the static error pages
   (`404.html`) — the only EDS-owned files with an authorable `<body>`.
4. **Head placement — works but invalid.** If an audit tool insists the GTM
   noscript exist on every page, placing it in `head.html` does function:
   with JS on it's inert text; with JS off the parser hits the illegal
   `iframe`, force-closes `<head>`, and hoists the iframe into the body, where
   it loads. The costs: an HTML validation error on every page, and any head
   tags after it get dumped into the body during no-JS parsing — so if you do
   this, make it the **last** thing in `head.html`.
5. **BYO CDN edge injection.** On the production domain, injecting the snippet
   right after `<body>` at the CDN is the only way to replicate Google's
   recommended placement on regular pages with valid HTML.

**Testing**: DevTools → Command palette → "Disable JavaScript", then reload
and view the DOM. Remember the parser decision is made at page load — toggling
JS without reloading changes nothing.



### Parity check against the `~/avast` AEM project

The avast repo builds its head server-side in HTL
(`ui.apps/.../components/page/head.html` + `customheaderlibs.html`, backed by
`PropertiesOverrideModel.java`). Everything it renders has an EDS equivalent:


| avast (AEM Sites / HTL)                          | EDS equivalent                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `<title>` + brand slug suffix                    | Automatic from Title metadata; add the suffix in the authored title or via bulk metadata                                   |
| `description`, `keywords` meta                   | Already in `models/_page.json`                                                                                             |
| `robots` meta (`page.robotsTags`)                | `robots` metadata property (already captured by our `helix-query.yaml` index)                                              |
| Canonical link (vanity/variant-aware)            | Automatic canonical; override per page with a `canonical` metadata property                                                |
| `og:image` override (`dnt_ogImage`)              | Automatic from first image; override with an `og:image` metadata field (use a `reference` component)                       |
| `twitter:*` tags                                 | Automatic (`twitter:card`, `title`, `description`, `image`)                                                                |
| `google-site-verification` list                  | Metadata field, or a static tag in `head.html` if site-wide                                                                |
| Schema markup list (`ld+json` scripts)           | Page-based via metadata or client-side injection — see below                                                               |
| hreflang alternate links (`getAlternativeLinks`) | Preferred in EDS via sitemap hreflang config (`helix-sitemap.yaml` languages), not head links; can also be injected via JS |
| Preconnect/dns-prefetch (Pluto service)          | Static `<link rel="preconnect">` tags in `head.html`                                                                       |
| Per-language font preloads                       | `head.html` preloads + `styles/fonts.css` (this project loads fonts via `loadFonts()` in `scripts.js`)                     |
| Inlined critical CSS/JS clientlibs               | `styles/styles.css` loaded in head + eager phase; EDS's three-phase loading replaces the clientlib split                   |
| dataLayer init + GTM snippets, Cheq consent      | `scripts/delayed.js` (see [section 10](#10-analytics-in-eds))                                                              |
| GTM `<noscript>` body iframe                     | See "Rendering `<noscript>` content" above — skip it, use a static fallback page, or CDN edge injection                    |


**Schema markup (JSON-LD)** deserves detail since avast authors a list of
schema blobs per page. EDS supports both documented approaches
([https://www.aem.live/docs/schema-structured-data](https://www.aem.live/docs/schema-structured-data)):

- **Page-based**: store the JSON-LD in page metadata so it is present in the
first-pass HTML crawl — best for product/offer pages. Add a `json-ld` style
field to `models/_page.json` (e.g. a `text`/`richtext` field holding the
JSON, or a `select` of predefined schema types) and render it in head.
- **Block-based**: generate the JSON-LD client-side from content already on the
page (FAQ, reviews, product cards) — a block's `decorate()` builds the object
and appends the `application/ld+json` script. Zero author effort, but relies
on crawlers executing JavaScript.

Bottom line: **everything the avast head does is achievable in this EDS
project** — most of it (canonical, og/twitter, robots) is automatic rather than
custom Java models, and the rest maps to metadata fields, `head.html`, or
phase-appropriate JS injection.

## 4. Creating normal (simple) blocks

A "normal" block is a single component with one model and no children.
`blocks/hero/` is the reference example.

**Files** (per block, in `blocks/{name}/`):

- `_{name}.json` — definition + model (+ empty `filters: []`)
- `{name}.js` — exports `default async function decorate(block)`
- `{name}.css` — styles, every selector scoped to `.{name}`

**Definition** — note the `resourceType` for a simple block:

```json
{
  "definitions": [
    {
      "title": "Hero",
      "id": "hero",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Hero", "model": "hero" }
          }
        }
      }
    }
  ]
}
```

**Decoration** — the backend delivers the block as rows/cells of `<div>`s (one row
per model in simple blocks, one cell per field). `decorate(block)` transforms that
DOM into the final markup. Inspect the delivered HTML first:

```bash
curl http://localhost:3000/path/to/page.plain.html
```

**Rules:**

- Handle missing fields gracefully — authors may leave fields empty.
- Don't use `.{name}-container` / `.{name}-wrapper` class names (reserved for the
section wrappers EDS generates).
- Register the block in the section filter so authors can add it
(see [section 6](#6-allowing-blocks-to-be-added-to-a-page-in-ue)).



## 5. Creating container blocks

A container block has child items that authors add/remove/reorder individually in
UE (e.g. one card, one tab, one pricing plan). `blocks/pricing/` and `blocks/tabs/`
are the reference examples.

Three things distinguish a container from a simple block:

**a) Two definitions** — the parent uses `.../block/v1/block` and references a
filter; each child uses `.../block/v1/block/item`:

```json
{
  "definitions": [
    {
      "title": "Tabs", "id": "tabs",
      "plugins": { "xwalk": { "page": {
        "resourceType": "core/franklin/components/block/v1/block",
        "template": { "name": "Tabs", "model": "tabs", "filter": "tabs" }
      }}}
    },
    {
      "title": "Tab", "id": "tab",
      "plugins": { "xwalk": { "page": {
        "resourceType": "core/franklin/components/block/v1/block/item",
        "template": { "name": "Tab", "model": "tab" }
      }}}
    }
  ]
}
```

**b) A filter naming the allowed children** — this is what makes the "+" button in
UE offer child items inside the block:

```json
{
  "filters": [
    { "id": "tabs", "components": ["tab"] }
  ]
}
```

**c)** `moveInstrumentation` **when restructuring the DOM** — each child renders as one
row (`<div>`) in the block carrying `data-aue-*` attributes that make it selectable
and editable in UE. If `decorate()` replaces or moves those elements, the
instrumentation attributes must move with them, otherwise in-context editing
breaks. See `blocks/cards/cards.js`:

```js
import { moveInstrumentation } from '../../scripts/scripts.js';

[...block.children].forEach((row) => {
  const li = document.createElement('li');
  moveInstrumentation(row, li);           // keep row editable in UE
  while (row.firstElementChild) li.append(row.firstElementChild);
  ul.append(li);
});
```

The same applies to images replaced with `createOptimizedPicture` — move the
instrumentation from the old `<img>` to the new one.

The parent model can be empty (`tabs`) or hold block-level fields (`pricing` has
`features` and `footer` alongside its `pricing-plan` children). Mixed content in
one block works: block-level field rows come first, then one row per child item.

### Reusing default content (Title, Text, Image, Button) inside a container

The `columns` block lets authors compose the **existing default-content
components** (`title`, `text`, `image`, `button`, `icon-button`) inside each
column, writing no new models (`blocks/columns/_columns.json`):

```json
"filters": [
  { "id": "columns", "components": ["column"] },
  { "id": "column", "components": ["text", "image", "button", "icon-button", "title"] }
]
```

**Important — this works only for the columns component, not for generic
block items.** `columns` uses the dedicated `core/franklin/components/columns/v1/columns`
resource type, whose `column` cells are rendered as UE **containers**
(`data-aue-type="container"`), which is what makes a `data-aue-filter` take
effect. A `core/franklin/components/block/v1/block/item` (an ordinary container
item such as a `card`, `step`, `pricing-plan`, or `tab`) is rendered as a
**component/leaf** (`data-aue-type="component"`), and a component ignores
`data-aue-filter`. Putting a child filter on a `block/item` therefore does
**not** let authors add components inside it — the "+" never appears.

The default-content components are defined once in `models/_title.json`,
`_text.json`, `_image.json`, `_button.json` — referencing their ids in a
filter is all the "reuse" needed; never duplicate their models. Global
decorators still apply to composed content: `decorateButtons` turns
bold/italic links into buttons, `decorateIcons` resolves `:iconname:`
references, so it behaves exactly as it does in a plain section.

### Single-level nesting and the fragment pattern

**EDS crosswalk supports only a single level of nesting.** A block
(`block/v1/block`) can contain items (`block/item`), but those items cannot
themselves contain arbitrary components or blocks. See the Adobe community
thread [Using sections metadata to implement multiple levels of nesting](https://experienceleaguecommunities.adobe.com/adobe-experience-manager-edge-delivery-services-13/using-sections-metadata-to-implement-multiple-level-of-nesting-146859),
which reaches the same conclusion and recommends the fragment workaround below.

When a container item needs to hold rich, arbitrary block content (e.g. a tab
that should contain any blocks), reference a **fragment** — a normal EDS page
that can itself contain any blocks — and render it into the item at decorate
time with `loadFragment`. This is the same mechanism `header`/`footer` use.

The `tabs` block in this project implements exactly this: each `tab` item has a
`label` (drives the tab button) plus an `aem-content` reference to a fragment
page (`blocks/tabs/_tabs.json`):

```json
{
  "definitions": [
    {
      "title": "Tabs", "id": "tabs",
      "plugins": { "xwalk": { "page": {
        "resourceType": "core/franklin/components/block/v1/block",
        "template": { "name": "Tabs", "model": "tabs", "filter": "tabs" }
      }}}
    },
    {
      "title": "Tab", "id": "tab",
      "plugins": { "xwalk": { "page": {
        "resourceType": "core/franklin/components/block/v1/block/item",
        "template": { "name": "Tab", "model": "tab" }
      }}}
    }
  ],
  "models": [
    { "id": "tabs", "fields": [] },
    {
      "id": "tab",
      "fields": [
        { "component": "text", "valueType": "string", "name": "label", "label": "Tab Label" },
        { "component": "aem-content", "name": "fragment", "label": "Panel Content (Fragment)" }
      ]
    }
  ],
  "filters": [
    { "id": "tabs", "components": ["tab"] }
  ]
}
```

The decorator reads each tab's fragment reference and loads it into the panel
(`blocks/tabs/tabs.js`):

```js
import { loadFragment } from '../fragment/fragment.js';

const link = refCell.querySelector('a');
const path = link ? link.getAttribute('href') : refCell.textContent.trim();
const fragment = await loadFragment(path);
if (fragment) panel.append(...fragment.childNodes);
```

`loadFragment` fetches the referenced page's `.plain.html`, decorates it
(blocks and all) and returns its content, so the panel renders whatever blocks
the fragment contains.

Notes:

- There is **no addressable "block resource"** in EDS — blocks only exist
inside a document. The unit you reference is always a page/fragment; the blocks
come from the blocks placed on that page.
- Constrain the picker to a fragments folder with the `aem-content`
`validation.rootPath` (e.g. `"/content/eds-ue-avg-san/fragments"`) so authors
pick from the right place.
- Build tab order synchronously before awaiting the fragment loads, otherwise
tabs can reorder as fragments resolve at different times.
- Preserve UE instrumentation with `moveInstrumentation` (row → panel, label
cell → button) so each tab stays selectable and its `label` + `fragment`
fields open in the property panel.
- `aem-content-fragment` (structured Content Fragment) and
`aem-experience-fragment` (Experience Fragment) are different pickers — they
render structured/XF content, not EDS blocks. Use a plain page reference when
you want EDS blocks in the item.



## 6. Allowing blocks to be added to a page in UE

Two places control availability:

**a) The component picker groups** — `models/_component-definition.json` defines
three groups (Default Content, Sections, Blocks). The Blocks group auto-includes
every `blocks/*/_*.json#/definitions`, so a new block appears automatically after
`npm run build:json`. No edit needed here for a standard block.

**b) The section filter** — `models/_section.json` → `filters[0].components` is
the allow-list of what can be inserted into a section. **This is the step people
forget.** Add the block id here:

```json
{
  "id": "section",
  "components": [
    "text", "image", "button", "icon-button", "title",
    "hero", "product-hero", "pricing", "feature-bar", "steps",
    "awards", "tabs", "carousel", "promo", "cards", "columns", "fragment",
    "my-new-block"
  ]
}
```

Additionally, `models/_component-filters.json` defines the `main` filter (which
only allows `section`), so pages are always composed of sections containing blocks.

Header and footer are deliberately **not** in the section filter — they are loaded
automatically by `scripts/aem.js` and authored as fragments, not placed on pages.

Rebuild (`npm run build:json`) and reload the Universal Editor after changing
filters.

## 7. Custom styling for sections

Sections get authorable styles via the **Style multiselect** on the section model
(`models/_section.json`). Each option's `value` becomes a CSS class on the
`.section` element:

```json
{
  "component": "multiselect",
  "name": "style",
  "label": "Style",
  "options": [
    { "name": "Highlight", "value": "highlight" },
    { "name": "AVG Grey", "value": "avg-grey" },
    { "name": "Dark", "value": "dark" },
    { "name": "Hero", "value": "hero" },
    { "name": "Centered", "value": "centered" },
    { "name": "Blue Background", "value": "bg-blue" },
    { "name": "Grey Background", "value": "bg-grey" }
  ]
}
```

The matching CSS lives in `styles/styles.css` under the `/* section metadata */`
comment, scoped as `main .section.{value}`:

```css
main .section.dark {
  margin: 0;
  padding: 56px 0;
  background-color: var(--avg-black);
  color: var(--avg-white);
}
```

**To add a new section style:**

1. Add an option to the `style` multiselect in `models/_section.json`.
2. Add `main .section.{value} { … }` rules in `styles/styles.css`.
3. `npm run build:json && npm run lint`.

Styles are multiselect, so they compose — this project pairs `bg-blue`/`bg-grey`
with `centered`, and uses modifier chains like `.bait.bait-dark`. Because sections
render before blocks load, section styles in `styles.css` are safe for LCP; put
heavy below-the-fold styling in `styles/lazy-styles.css`.

The section model also has a `name` field — purely an authoring aid (the label in
the UE content tree), no runtime effect.

## 8. Customizing the header and footer

Header and footer are blocks (`blocks/header/`, `blocks/footer/`) that are **not
authored on each page**. `loadHeader`/`loadFooter` (called from
`scripts/scripts.js` in the lazy phase) inject them into the empty `<header>` and
`<footer>` elements, and each block loads its content as a **fragment**:

```12:19:blocks/header/header.js
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
```

- **Content**: authors edit the `/nav` and `/footer` pages in AEM. Locally, static
fixtures exist at `drafts/nav.plain.html` and `drafts/footer.plain.html`.
- **Per-page override**: set a `nav` or `footer` page property (metadata) pointing
to an alternative fragment path — useful for campaign pages or locale variants.
- **Structure contract (header)**: the nav fragment's first three sections map to
`nav-brand`, `nav-sections`, `nav-tools`. The header JS adds the mobile
hamburger, dropdown behavior, and keyboard/escape handling.
- **Structure contract (footer)**: `blocks/footer/footer.js` picks pieces out of
the fragment by shape rather than position — the AVG/Gen logos by `src`,
region/account by the `.footer-region`/`.footer-account` classes, legal text by
a copyright regex, links from the `<ul>` — then rebuilds a four-row layout
(brand+tools / Gen line / legal / links).

To change header/footer **layout or behavior**, edit the block JS/CSS. To change
**content**, edit the `/nav` or `/footer` pages (or the draft fixtures locally).

### Different header/footer per page group

Yes — this is directly supported, because the fragment path is resolved from
the `nav`/`footer` **metadata** at runtime. Say group1 pages should use
header1/footer1 and group2 pages header2/footer2. Author the variants as
ordinary fragment pages (`/fragments/nav-group1`, `/fragments/footer-group1`,
`/fragments/nav-group2`, …), then map pages to them by one of:

1. **Bulk metadata by path pattern (recommended for groups).** One row per
  group in the metadata sheet — no per-page work, and moving a page into the
   folder picks up the right chrome automatically:

  | URL          | Nav                     | Footer                     |
  | ------------ | ----------------------- | -------------------------- |
  | `/group1/**` | `/fragments/nav-group1` | `/fragments/footer-group1` |
  | `/group2/**` | `/fragments/nav-group2` | `/fragments/footer-group2` |

2. **Per-page page properties.** Add `nav` and `footer` fields to
  `models/_page.json` so authors can override the fragments on individual
   pages (campaign landing pages, minimal-chrome checkout pages, etc.). This
   wins over the bulk rule for that page.
3. **Path convention in code.** If groups always align with URL structure, skip
  metadata entirely and derive the path in `blocks/header/header.js`:

```js
const navMeta = getMetadata('nav');
const group = window.location.pathname.startsWith('/group2/') ? '/fragments/nav-group2' : '/nav';
const navPath = navMeta ? new URL(navMeta, window.location).pathname : group;
```

No changes are needed in the header/footer blocks for options 1 and 2 — the
existing `getMetadata('nav')`/`getMetadata('footer')` resolution already
handles any fragment path, falling back to `/nav` and `/footer`. Each fragment
must follow the block's structure contract described above (three nav sections;
the footer's recognizable pieces).

## 9. Error page content (404 and 500)



### 404

`404.html` at the repo root is a standalone static page served for unresolved
paths. It is self-contained (EDS does not decorate it through content), but it
reuses the site chrome:

- Loads `styles/styles.css`, `lazy-styles.css` and `scripts/scripts.js`, and has
empty `<header>`/`<footer>` elements, so the real nav and footer render on it.
- Sets `window.isErrorPage = true` / `window.errorCode = '404'` for scripts that
need to know.
- Reports the 404 to RUM: `sampleRUM('404', { source: document.referrer })`.
- Adds a "Go back" button dynamically when the referrer is same-origin, alongside
the static "Go home" button.

To customize the 404, edit `404.html` directly (markup and the inline `<style>`
block). Keep it lightweight — it should not depend on authored content, since it
also renders when the content backend can't resolve anything.

**Author-editable 404 content**: if authors need to control the 404 message
(or you need language-specific versions), load a fragment into the error page
instead of hardcoding the markup. Documented pattern
([https://www.aem.live/docs/error-pages](https://www.aem.live/docs/error-pages)): in `scripts/scripts.js`, before
`decorateMain` in `loadEager`, replace the section content with a fragment
block when `window.isErrorPage` is set:

```js
import { buildBlock } from './aem.js';

function loadErrorPage(main) {
  if (window.errorCode === '404') {
    const fragmentLink = document.createElement('a');
    fragmentLink.href = '/fragments/404';
    fragmentLink.textContent = '/fragments/404';
    const fragment = buildBlock('fragment', [[fragmentLink]]);
    const section = main.querySelector('.section');
    if (section) section.replaceChildren(fragment);
  }
}
```



### 500 / server errors

EDS has no `500.html` convention — only `404.html` is special-cased by the
delivery tier, and genuine 5xx responses from the platform are rare and served
before your code runs. What you can and should do:

1. **Make the error page generic.** `404.html` already sets
  `window.errorCode`; extend the fragment approach above to pick content per
   code (`/fragments/404`, `/fragments/500`, with a generic fallback), so one
   error page file serves any error state:

```js
function loadErrorPage(main) {
  const known = ['404', '500'];
  const code = known.includes(window.errorCode) ? window.errorCode : '500';
  const fragmentLink = document.createElement('a');
  fragmentLink.href = `/fragments/${code}`;
  // … build the fragment block as above
}
```

1. **BYO CDN error mapping (production).** When the production domain sits
  behind your own CDN (Akamai/CloudFront/Fastly, as avg.com does), configure
   the CDN to serve a custom error object for origin 5xx responses. Point it at
   a copy of the error page (a static `500.html` committed to the repo is
   served like any other code file, e.g.
   `https://{host}/500.html`) with `window.errorCode = '500'` set.
2. **Handle API failures in blocks, not error pages.** A failing backend call
  should degrade the block, not the page. The pricing block is the in-project
   example: when the pricing API is unreachable, every `{price}` token still
   resolves to a fallback (`X.XX`, `#` for buy links) so the page stays usable.
   Reserve full error pages for cases where no content can render at all.



## 10. Analytics in EDS

**Built-in: Operational Telemetry / RUM.** `scripts/aem.js` ships `sampleRUM`,
which samples real-user monitoring data (Core Web Vitals, page views, errors)
with no setup. Data is viewable via aem.live tooling. Custom checkpoints can be
fired from anywhere:

```js
import { sampleRUM } from './aem.js';
sampleRUM('formsubmit', { source: '.newsletter-form' });
```

The 404 page already fires a `404` checkpoint (see `404.html`).

**Third-party analytics (Adobe Analytics/WebSDK, GTM, etc.) go in the delayed
phase.** `scripts/scripts.js` imports `scripts/delayed.js` three seconds after the
lazy phase completes — this is the designated place for martech so it cannot hurt
LCP/TBT:

```js
// scripts/delayed.js
// add delayed functionality here
```

Pattern for adding a tag manager or analytics library:

```js
// scripts/delayed.js
function loadScript(src, attrs = {}) {
  const script = document.createElement('script');
  script.src = src;
  Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
  document.head.append(script);
  return new Promise((res, rej) => { script.onload = res; script.onerror = rej; });
}

await loadScript('https://assets.adobedtm.com/.../launch-xxxx.min.js', { async: '' });
```

Guidelines:

- Never load analytics in the eager phase; the 100 Lighthouse target
([https://www.aem.live/developer/keeping-it-100](https://www.aem.live/developer/keeping-it-100)) depends on it.
- Use per-environment config from `scripts/env.js` (see
[section 12](#12-other-patterns-used-in-this-project)) to switch between dev/stage/prod report suites
or containers.
- Note the CSP in `head.html` (`script-src 'nonce-aem' 'strict-dynamic' …`) —
scripts injected from a nonce'd module script are trusted via `strict-dynamic`.
- For click/interaction tracking without a vendor, prefer `sampleRUM` custom
checkpoints; they're free and privacy-friendly.



### Replicating the avast AEM analytics stack in EDS

The avast traditional AEM project builds its analytics server-side: HTL templates
(`components/page/analytics.html`, `head.html`, `noscript.html`) plus Sling
models (`AvastAnalytics.java`, `AnalyticsUtilImpl.java`) render the data layer
and vendor tags into the page. Every piece has a client-side EDS equivalent:


| avast (AEM Sites)                                                                                                                                        | EDS equivalent                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data layer objects (`window.nortonAnalytics`, `window.sdl`, `window.dataLayer`) rendered by HTL from Sling models                                        | Build the same objects in JS from URL, metadata and `env.js` (pattern below)                                                                                               |
| Adobe Launch embed URL from OSGi config per runmode, publish-only                                                                                        | Launch URL per environment in `scripts/env.js` `OVERRIDES`, loaded from `delayed.js`; skip on `localhost`                                                                  |
| Analytics dimensions from page properties (`dnt_siteSection`, `dnt_pageName`, `dnt_lineOfBusiness`, `dnt_pageType`, `dnt_contentTitle`) with inheritance | Page metadata fields in `models/_page.json` read via `getMetadata()`; folder-level "inheritance" via bulk metadata path patterns (`/security/** → Site Section: security`) |
| Sections derived from content path depth (`getAbsoluteParent(4/5)`)                                                                                      | Derive from `window.location.pathname` segments — same data, no JCR needed                                                                                                 |
| `screen_name` as `locale | path` built from locale root                                                                                                  | String-build from the URL: first path segment is the locale (same convention `pricing-api.js` already uses)                                                                |
| `environment: prod/dev` from run modes                                                                                                                   | `env.js` already resolves `qa`/`stage`/`live` from the hostname                                                                                                            |
| GTM snippets (dual containers, feature-flag gated)                                                                                                       | `loadScript` GTM from `delayed.js`; gate per page with a metadata flag instead of OSGi feature flags                                                                       |
| GTM `<noscript>` iframe in body (`noscript.html`)                                                                                                        | Only fires Custom Image tags anyway — skip it, put it on a static `/no-js.html` fallback page, or inject at the BYO CDN edge (see "Rendering `<noscript>` content" in [section 3](#3-adding-ue-authoring-fields-for-the-page-page-properties)) |
| Cheq consent bootstrap script in head                                                                                                                    | Load the consent script **first** in `delayed.js`, before other vendor tags                                                                                                |
| Adobe Target pre-hiding snippet (body opacity 0, 3s timeout)                                                                                             | See the Target caveat below                                                                                                                                                |
| No tracking on legal template pages                                                                                                                      | Check a metadata flag (e.g. `analytics: off` via bulk metadata on `/legal/**`) at the top of `delayed.js` and return early                                                 |
| Variant experiments (`?variant=` remaps `page_name`/`screen_name`)                                                                                       | Read `new URLSearchParams(window.location.search)` when building the data layer                                                                                            |


The whole stack lands in `scripts/delayed.js`, which is currently an empty stub. Skeleton mirroring the avast traditional AEM behavior:

```js
// scripts/delayed.js
import { getMetadata } from './aem.js';
import env from './env.js';

if (getMetadata('analytics') !== 'off') {           // legal-page style opt-out
  const [locale] = window.location.pathname.split('/').filter(Boolean);
  const segments = window.location.pathname.split('/').filter(Boolean);
  const pageName = segments.at(-1) || 'index';

  window.dataLayer = window.dataLayer || [];
  window.nortonAnalytics = {
    site_language: locale?.split('-')[0] || 'en',
    site_country: locale?.split('-')[1] || 'ww',
    site_section: getMetadata('site-section') || segments[1] || 'avg.com',
    site_sub_section: getMetadata('site-sub-section') || segments[2] || 'na',
    page_name: getMetadata('page-name') || pageName,
    screen_name: `${locale} | ${segments.join('/')}`,
    content_title: getMetadata('content-title') || document.title,
    content_format: 'html',
    content_type: 'page',
    environment: env.name === 'live' ? 'prod' : 'dev',
  };

  // consent first, then tag manager / Launch
  await loadScript(env.consentScriptUrl);
  await loadScript(env.adobeLaunchUrl, { async: '' });
}
```

(`loadScript` is the helper from the pattern above; `env.name`,
`env.consentScriptUrl` and `env.adobeLaunchUrl` are new keys to add to
`DEFAULTS`/`OVERRIDES` in `scripts/env.js`.)

To make the authored dimensions available, add the corresponding fields to the
`page-metadata` model in `models/_page.json` (`site-section`,
`site-sub-section`, `page-name`, `content-title`, plus `select` fields for
`page-type`/`line-of-business` if needed) — exactly the same authoring surface
as the avast page dialog, minus the Java.

**Adobe Target caveat.** The pre-hiding snippet avast uses (hide `<body>`
until Target decides, 3s timeout) is fundamentally at odds with EDS's LCP-first
loading — putting it in `head.html` would sacrifice the Lighthouse 100 target
on every page for a capability few pages use. Prefer EDS-native experimentation
([https://www.aem.live/developer/experimentation](https://www.aem.live/developer/experimentation)) which works with the eager
phase instead of against it; if Target is mandatory, load WebSDK/Target in
`delayed.js` and accept that personalization applies after initial render
(async, no pre-hiding), or confine a head-based snippet to the specific
campaign pages that need it via a metadata flag.

## 11. Sitemap and robots.txt

### What lives in the code repo vs what EDS generates

The sitemap and robots.txt are **config-in, files-out**: you commit a few small
config/static files to the repo, and EDS generates the actual sitemap XML at
publish time. No code runs at request time.

**Committed to the repo (four files):**

| File | What it is |
| --- | --- |
| `helix-query.yaml` | Defines the query index(es) EDS builds from published pages |
| `helix-sitemap.yaml` | Maps those indexes to sitemap files + the hreflang graph |
| `sitemap-index.xml` | Static index listing every generated locale sitemap — **you author this by hand**, EDS does not auto-build an index for a manual sitemap config |
| `robots.txt` | Points crawlers at the sitemap index (production domain only) |

**Generated by EDS (never committed):**

| Generated at publish | From |
| --- | --- |
| `/query-index.json` (per locale) | `helix-query.yaml` |
| `/sitemap-<locale>.xml` | `helix-sitemap.yaml` + the query indexes |

So the answer to "do both `robots.txt` and `sitemap-index.xml` go in the repo?"
is **yes** — both are hand-authored files kept at the repo root, next to the two
`helix-*.yaml` config files. The per-locale `sitemap-*.xml` files are the only
sitemap artifacts that are generated rather than committed.

This project is a **multilingual site across 38 locales** (`en-ww`, `de-de`,
`fr-fr`, `ja-jp`, …) mirroring the live `www.avg.com` sitemap.

### The config files

`helix-query.yaml` — one query index per locale; capturing the `robots` meta so
`noindex` pages can be excluded from the sitemap:

```yaml
indices:
  en-ww:
    include: ['/en-ww/**']
    exclude: ['/**.json']
    target: /en-ww/query-index.json
    properties:
      robots:
        select: head > meta[name="robots"]
        value: attribute(el, "content")
  # …one block per locale…
```

`helix-sitemap.yaml` — one sitemap per locale; EDS emits each
`sitemap-<locale>.xml` and auto-generates the `<xhtml:link rel="alternate"
hreflang>` graph for every URL. The `alternate: /de-de/{path}` mechanic means
EDS matches pages that share a slug across locales (`/en-ww/trademarks` ↔
`/de-de/trademarks`) and links them automatically, with an `x-default` pointing
at the `default` locale — **no per-page configuration**:

```yaml
sitemaps:
  avg:
    default: en-ww
    lastmod: YYYY-MM-DD
    languages:
      en-ww: { source: /en-ww/query-index.json, destination: /sitemap-en-ww.xml, hreflang: en, alternate: /en-ww/{path} }
      de-ch: { source: /de-ch/query-index.json, destination: /sitemap-de-ch.xml, hreflang: de-ch, alternate: /de-ch/{path} }
      # …one block per locale…
```

`sitemap-index.xml` — the committed index; `<loc>` values are the `destination:`
paths on the production host (EDS serves the generated sitemaps over HTTP; you
do not ship `.gz` files):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.avg.com/sitemap-en-ww.xml</loc></sitemap>
  <sitemap><loc>https://www.avg.com/sitemap-de-ch.xml</loc></sitemap>
  <!-- …one line per locale… -->
</sitemapindex>
```

`robots.txt` — points crawlers at the index (not individual locale files):

```
User-agent: *
Allow: /

Sitemap: https://www.avg.com/sitemap-index.xml
```

For robots.txt in a code-repo (non-repoless) site like this one, committing the
file at the repo root is the mechanism; repoless/multi-site setups use the
[config service](https://www.aem.live/docs/config-service-setup#update-robotstxt)
instead. Either way it **only takes effect on the production domain** — see the
preview-host note below.

### Maintaining it

- `cdn.prod.host` must be set to `www.avg.com` so generated `<loc>` URLs use the
production domain.
- Changes take effect on the next publish; re-publish pages so the indexes
rebuild. Verify with `curl https://{host}/sitemap-en-ww.xml`.

### robots meta and preview hosts

- **No robots meta tag renders by default — that's correct.** EDS only emits
`<meta name="robots">` when a `robots` metadata property is set; no tag means
the crawler default `index, follow`.
- **To `noindex` a page**, add the `robots` field to the `page-metadata` model
(already in `models/_page.json`) and set it in page properties, or apply a bulk
metadata rule to a path group (e.g. `/fragments/** → noindex`). Because
`helix-query.yaml` indexes the `robots` meta, those pages also drop out of the
sitemap.
- **`*.aem.page` / `*.aem.live` are blocked at the HTTP layer** — every response
carries `x-robots-tag: noindex, nofollow` and a deny-all `robots.txt`, so your
committed `robots.txt` and any `noindex` meta only take effect on the production
domain. Don't add `Disallow` rules "for development".
- To **remove** an already-indexed page, keep crawling allowed and use
`robots: noindex` — a `Disallow` blocks the crawler from ever seeing the
`noindex`, making removal impossible.



## 12. Other patterns used in this project

Things implemented here that go beyond the boilerplate:

**Environment config —** `scripts/env.js`**.** EDS has no build step, so there are no
build-time environment variables. `env.js` resolves the environment from the
hostname (`main--…`/production domains → `live`, `stage--…` → `stage`, everything
else including localhost → `qa`) and exposes a merged `DEFAULTS + OVERRIDES[env]`
object. Add any per-environment value (API bases, analytics IDs) there and
`import env from './env.js'`.

**Live pricing —** `scripts/pricing-api.js` **+ the pricing block.** Pricing Plan
items carry hidden `data-sku`/`data-campaign` attributes (authored via model
fields). The module fetches the pricelist for the locale (derived from the first
URL path segment, e.g. `/en-ww/…`), and resolves `{sale_price}`-style tokens in
text and the `{buy_link}` token in buy buttons, with guaranteed fallbacks so raw
tokens never render. It's triggered from the pricing block's `decorate` (lazy
phase), not `delayed.js`, so the price shimmer resolves sooner. Design notes in
`docs/pricing-fetch-approaches.md` and `docs/pricing-eds-json-crawl-discovery.md`.

**Content-driven development —** `drafts/`**.** Static test content
(`*.plain.html` full aem-markup fixtures, plus `*-authoring.md` notes describing
how authors should build the page in UE) lives in `drafts/`. Start the dev server
with the folder mounted to work without authored CMS content:

```bash
npx @adobe/aem-cli up --no-open --forward-browser-logs --html-folder drafts
```

(`npm run dev` runs `aem up` with system CA support for corporate networks.)

**Universal Editor support scripts.** `scripts/editor-support.js` and
`scripts/editor-support-rte.js` enhance WYSIWYG editing (rich text decoration,
re-decoration after edits). They only load inside UE; you rarely touch them, but
they are why `moveInstrumentation` matters in block code.

**Buttons by authoring convention.** `decorateButtons` in `scripts/scripts.js`
only turns links into buttons when the author formats them: **bold** link →
`.button.primary`, *italic* → `.button.secondary`, bold+italic → `.button.accent`.
Plain links stay links. There is also a dedicated `icon-button` block for
image-adorned CTAs.

**Three-phase loading.** `scripts/scripts.js` orchestrates eager (decorate +
first section, fonts on desktop), lazy (remaining sections, header, footer,
`lazy-styles.css`), and delayed (`delayed.js` after 3s). Respect the phases when
adding functionality: LCP-critical work in eager, everything else lazy or delayed.

**Multi-field UE support.** `xwalk.json` enables the `multi-field` public flag,
allowing `multi: true` model fields (used by `keywords`).

**Serving hygiene.** `.hlxignore` keeps non-runtime files off the public site:
dotfiles, all `*.md` (including this guide and everything in `docs/`), tests,
`package.json`, and the `_*` partial model files. Anything not listed there is
served publicly — remember this is all client-side code on the open web.

## 13. Bulk metadata and `<html lang>` inheritance

Traditional AEM has an inheritance concept: set a property (e.g. language) on
a parent page and child pages inherit it, with the option to reset it on a
subtree. EDS has no page-tree inheritance engine — the equivalent is the
**bulk metadata sheet**: one `URL` pattern + property table, evaluated
top-to-bottom, published as `/metadata.json`. Broad rows set the "inherited"
default; narrower rows placed below override it for a subtree. This is a
delivery-layer feature, so it works the same whether the content source is
Document Authoring, Google Drive/SharePoint, **or AEM + Universal Editor** —
only the authoring mechanics differ (see below).

Reference: [aem.live — Bulk Metadata](https://www.aem.live/developer/bulk-metadata).

### Bulk metadata — general steps

1. **Create the sheet** — one worksheet, first column `URL`, one column per
  metadata property (column names are lower-cased in the rendered HTML):

  | URL | theme | robots | og:image |
  | --- | --- | --- | --- |
  | `/**` | | | `https://www.avg.com/default-og.png` |
  | `/blog/**` | `blog` | | |
  | `/legal/**` | | `noindex` | |

2. **Order matters.** The sheet is evaluated top-to-bottom; put the site-wide
  `/**` row first, then increasingly specific rows below — later matching rows
   win for overlapping paths.
3. **Empty vs `""`.** An empty cell means "don't touch this property here"; an
  explicit `""` value means "remove/blank this property for this path" (e.g.
   clearing an inherited `canonical`).
4. **Preview and publish the sheet itself** — like content, the sheet must be
  previewed/published before `/metadata.json` picks up changes.
5. **Precedence**: page-level metadata block (or, in UE, a page-property field)
  always wins over the bulk sheet. Use the sheet for the default/section-wide
   value and a per-page field only for the rare one-off exception.
6. **Multiple sheets** (optional): if metadata is split across teams, configure
  the merge order via the config service:

  ```bash
  curl -X POST https://admin.hlx.page/config/{org}/sites/{site}/metadata.json \
    -H 'content-type: application/json' \
    -H 'x-auth-token: {your-auth-token}' \
    --data '{"source": ["/metadata.json", "/metadata-2nd.json"]}'
  ```

### AEM + Universal Editor authoring steps (this project's content source)

The sheet format above is identical — what's different is how you create and
publish it, since there's no Google Sheet/Excel file to drop in a folder.
Reference: [aem.live — Managing tabular data with AEM authoring as your content source](https://www.aem.live/docs/authoring-tabular-data).

1. In the **AEM Sites console**, create a new content item using the
  **Spreadsheet** template (same wizard used for redirects/placeholders).
2. In the **Properties** tab, add a column per metadata property you need
  (`lang`, `theme`, `robots`, …) plus the `URL` column, then fill in rows using
   the ordering rule above.
3. Map it to `/metadata.json` in the project's **`paths.json`**:

  ```json
  {
    "mappings": [
      "/content/<site-name>/:/",
      "/content/<site-name>/metadata:/metadata.json"
    ]
  }
  ```

4. **Quick Publish** the spreadsheet from the Sites console — same as
  publishing a page; nothing shows up on `.aem.page`/`.aem.live` until you do.
5. Verify with `curl https://{host}/metadata.json` (spreadsheet-JSON shape:
  `{ "total": n, "data": [ { "URL": "...", ... }, ... ] }`).

You can also expose any of these properties as a **page-property field** in
`models/_page.json` (the `page-metadata` model) so authors can override the
bulk value for a single page from Universal Editor — page metadata always
wins over the sheet.

### This project's metadata sheet (current working example)

The sheet is column-based and can be maintained as an AEM Spreadsheet or a
committed CSV mapped to `/metadata.json`; the first column is `url`, the rest
are property names. The current in-project sheet sets three properties across
three URL patterns:

```csv
url,lang,robots,og:image
/**,en-ww,,https://main--eds-ue-avg-san--santhoshkumarsrg.aem.live/media_117f0743f115663cfa8e4553e1de8529a9b7ca052.svg
/santhosh-test/fragments/**,,"noindex, nofollow",
/fr/fr/**,fr-fr,,
```

Read top-to-bottom, that resolves to:

| URL pattern | Effect |
| --- | --- |
| `/**` | Site-wide default: `lang` `en-ww` → `<html lang="en-ww">`; a default `og:image` (an absolute `.aem.live` media URL). No `robots` value = the crawler default `index, follow`. |
| `/santhosh-test/fragments/**` | Fragment pages get `robots` `noindex, nofollow` so they are neither indexed nor crawled (and drop out of the sitemap). `lang`/`og:image` cells are empty, so they inherit the `/**` values. |
| `/fr/fr/**` | The French locale subtree overrides `lang` to `fr-fr` → `<html lang="fr-fr">`; `robots`/`og:image` inherit from `/**`. |

Points this example illustrates:

- **Empty cell = inherit** the value from the broader (`/**`) row; it does not
  reset it. Use an explicit `""` only when you want to *remove* an inherited
  value.
- **`lang` needs the client-side wiring** described below — the sheet alone
  produces `<meta name="lang">`, not `<html lang>`.
- **`robots` empty means `index, follow`** — only fill it in to restrict a
  subtree. On `*.aem.page`/`*.aem.live` the platform forces `noindex` anyway,
  so this only bites on the production domain.
- **`og:image` must be an absolute, publicly fetchable URL** — social crawlers
  fetch it server-side with no JS and no AEM auth, and a value typed into a
  sheet cell is emitted verbatim (the EDS media pipeline only optimizes images
  that appear *in page content*, not sheet values). Reference either a
  published `.aem.live` media URL (as above) or, for a DAM asset, its Dynamic
  Media (OpenAPI) delivery URL
  (`https://delivery-p{prog}-e{env}.adobeaemcloud.com/adobe/assets/{assetId}/as/{seoName}.jpg?width=1200`) —
  never a raw `/content/dam/…` path. Prefer the `image` property (it populates
  `og:image`, `og:image:secure_url` *and* `twitter:image`); a bare `og:image`
  column sets only that one tag.

### Worked example: `<html lang>` inheritance with a subtree reset

This reproduces the traditional-AEM scenario: most pages under a locale
inherit that locale's language, but one subtree resets it.

**How `<html lang>` is set in EDS.** This is the important gotcha: EDS does
**not** map any metadata property to the `<html lang>` attribute. A `lang`
column in the sheet is treated like any other property and only emits a
`<meta name="lang" content="…">` tag — the `<html lang>` attribute is left
untouched by the delivery tier (the delivered `<html>` has no `lang` at all).
Setting `<html lang>` is therefore a **client-side** job: `scripts/scripts.js`
reads the `lang` metadata and applies it. There is no tree-based inheritance;
the bulk sheet's path patterns are what simulate it, and the JS just consumes
the resolved value for the current page.

Given a traditional-AEM tree like `/content/avg/ww/en`, `/content/avg/es/es`,
and `/content/avg/sa/ar` (with `/content/avg/sa/ar/smb` reset to English), the
equivalent bulk metadata sheet — matched against the **public URL path**, not
the JCR path — is:

| URL | lang |
| --- | --- |
| `/**` | `en` |
| `/es-es/**` | `es-es` |
| `/ar-sa/**` | `ar-sa` |
| `/ar-sa/smb` | `en` |
| `/ar-sa/smb/**` | `en` |

- Everything under `/ar-sa/**` inherits `ar-sa`.
- `/ar-sa/smb` and everything under it resets to `en`, because those rows are
  **below** (and therefore override) the broader `/ar-sa/**` row. Both the
  exact `/ar-sa/smb` row and the `/ar-sa/smb/**` row are needed — `**` doesn't
  reliably also match the folder root itself.
- A one-off page can still override its locale's default via the `lang`
  page-property field in `models/_page.json`, which beats the sheet.

**The project-specific fix this required.** `scripts/scripts.js` used to
hardcode the language on every page load, ignoring metadata entirely:

```js
// before — hardcoded, ignored the lang metadata
document.documentElement.lang = 'en';
```

It now reads the resolved `lang` metadata (from the page or the bulk sheet),
applies it to `<html lang>`, and removes the redundant `<meta name="lang">`
tag EDS emits for that property (the `lang` property exists only to drive the
attribute — the meta tag itself is non-standard and unwanted):

```130:137:scripts/scripts.js
async function loadEager(doc) {
  // drive <html lang> from the `lang` metadata (page or bulk sheet), defaulting
  // to 'en'. the `lang` property is only used for this — remove the redundant
  // <meta name="lang"> tag it produces so it doesn't leak into the head.
  const lang = getMetadata('lang');
  document.documentElement.lang = lang || 'en';
  document.head.querySelector('meta[name="lang"]')?.remove();
  decorateTemplateAndTheme();
```

(`getMetadata` is imported from `scripts/aem.js`.) A `lang` field was also
added to the `page-metadata` model (`models/_page.json`) for the per-page
override case, and the aggregated model/definition/filter JSON was rebuilt
(`npm run build:json`).

**RTL note.** `ar-sa` also implies right-to-left layout. `lang` only drives the
`lang` attribute; pair it with a `dir="rtl"` rule (either a second bulk-sheet
column consumed by a small head/JS snippet, or a CSS `:lang(ar)` selector) if
the design needs mirrored layout — that's a separate concern from the language
tag itself.