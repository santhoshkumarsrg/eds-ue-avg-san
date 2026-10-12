# Authoring the Comparison Table

The **Comparison Table** block shows products as columns and features as rows,
with a tick, cross or short text in each cell. The block itself only says
*which* products and features to show. The names, descriptions and tick/cross
values live in one shared **data workbook** per locale, so every table on the
site stays consistent and is updated in one place.

Local test page: `/drafts/tmp/comparison-table` (data in
`/drafts/comparison/en/data.json` and `/drafts/comparison/en-in/data.json`).

---

## 1. The data workbook

Create one DA sheet per locale at `/{locale}/comparison/data` (for example
`/en/comparison/data`, `/en-in/comparison/data`). Each workbook has these tabs
(tab names are lowercase). Preview/publish the sheet after editing it.

### `features`

| Column | Meaning |
|---|---|
| `id` | Stable slug, e.g. `scam-guardian`. Never rename it once used. |
| `category` | Category id, e.g. `protection` (used by `category:` and the `categories` option). |
| `headline` | Feature name shown in the row. |
| `short-description` | One-line description. |
| `long-description` | Longer copy, shown in the info tooltip by default. |
| `icon` | Optional icon URL (shown when a table asks for it with `(icon)`). |
| `icon-mobile` | Reserved. |
| `platforms` | `pc`, `mac`, `android`, `ios`, comma separated. Empty means all platforms. The row is hidden for visitors on other platforms. |
| `notes` | Internal notes, never shown. |

### `products`

| Column | Meaning |
|---|---|
| `id` | Stable slug, e.g. `ultimate`. |
| `name` | Column title. |
| `subtitle` | Small line under the name (hidden on mobile). |
| `icon` | Product icon URL. |
| `url` | Product page. Makes the name a link and is the fallback button URL. |
| `platforms` | Supported platforms (informational). |
| `type` | `product` (default), `competitor` or `generic`, e.g. "Incognito mode". Only `product` columns get a fallback button. |
| `sku` | Reserved for pricing. |

### `matrix`

One row per feature, one column per product id:

| feature | internet-security | antitrack | ultimate | incognito |
|---|---|---|---|---|
| antivirus | yes | | yes | |
| antitrack-browser | | yes | yes | yes: Limited* |

Cell values:

| Value | Renders |
|---|---|
| *(blank)* or `no` | ✗ not included |
| `yes` | ✓ |
| `yes: <text>` | ✓ with text underneath |
| `partial: <text>` | – partial mark with text |
| `text: <text>` | text only |

Anything else is shown as ✗ and reported as an authoring issue.

Text cells (`headline`, descriptions, `name`, `subtitle` and matrix text) may
use `<strong>`, `<em>`, `<a href>`, `<br>`, `<sup>` and `<sub>`. All other
markup is removed.

### Optional tabs

- `categories`: `id | title`, the display title for each category.
- `strings`: `key | value`, translated screen-reader labels. Keys are
  `included`, `not-included`, `partial`, `more-info` and `features-header`.

### Localization

A locale workbook only needs the rows it changes. The block also loads the
fallback workbook (`/en/comparison/data`) and merges by `id`:

- In `features`, `products`, `categories` and `strings`, empty locale cells keep
  the fallback value, so translating only `headline` is fine.
- `matrix` rows are replaced as a whole, because an empty cell means ✗.
- Rows that exist only in the fallback are still available.

Page metadata can change the defaults:

| Metadata | Default | Purpose |
|---|---|---|
| `comparison-data` | `/{locale}/comparison/data` | Workbook path; `{locale}` is the page's URL locale. |
| `comparison-fallback-locale` | `en` | Locale used for missing rows. |

---

## 2. The block in da.live

Insert a two-column table. The first row is the block name (merge both cells),
with options in brackets if needed. Every following row is **key | value**. All
rows are optional except **Products**.

| Comparison Table |  |
|---|---|
| Heading | `Compare AVG plans` (format it as Heading 2 or 3) |
| Products | `internet-security, secure-vpn, antitrack, **ultimate**` |
| Highlight | `ultimate` |
| Labels | `ultimate: Best value` |
| Features | `category: protection`, `secure-vpn`, `antitrack-*`, `tuneup` (one per line, bullets or commas) |
| CTA | One link per product, in product order |
| Note | `*Prices and features vary by platform.` |
| Data | `/en/comparison/data` (only to override the default workbook) |

- **Products**: ids in column order. Making an id **bold** highlights that
  column, the same as listing it under **Highlight**.
- **Features**: ids in row order.
  - `category: <id>` adds every feature in that category, in sheet order.
  - `<prefix>*` adds every feature whose id starts with the prefix.
  - `<id> (New, icon)` adds a "New" badge and/or shows the feature icon.
- **CTA**: the first link goes to the first product, and so on. A `product`
  column without a link uses its sheet `url` with the first link's label.

The **heading** can also be authored as a single-cell row containing a heading.

### Options (variants)

Add these only when you need something other than the default look (full
header, centred, filled highlight, headline with info tooltip):

| Option | Effect |
|---|---|
| `simple` | Product header shows the name only (no icon or subtitle). |
| `left` | Left-aligned headers and cells. |
| `highlight-border` | Highlighted column gets an outline instead of a fill. |
| `categories` | Groups feature rows under category headings. |
| `short-desc` | Feature rows show the short description. |
| `long-desc` | Feature rows show the long description (no tooltip). |
| `headline-short` | Headline with the short description underneath. |
| `headline-long` | Headline with the long description underneath (no tooltip). |

Example: `Comparison Table (categories, highlight-border)`.

---

## 3. The block in Universal Editor

Add **Comparison Table** to a section. It is a key-value block, so every field
is edited in the properties panel:

| Field | Same as da.live row |
|---|---|
| Options | variants above (pick at most one "Feature text" option) |
| Heading | Heading |
| Products | Products (comma separated; use *Highlighted Product* to highlight) |
| Highlighted Product | Highlight |
| Product Labels | Labels |
| Features | Features |
| Buttons | CTA |
| Note | Note |
| Data Source | Data |

---

## 4. Checking your work

- On preview (`*.aem.page`), localhost and Universal Editor, problems are
  listed in a dashed box above the table. Examples are unknown ids, empty
  categories, features without a matrix row, and invalid matrix values. The box
  never appears on the live site, but the same messages are logged to the
  browser console.
- Add `?platform=pc|mac|android|ios` to the URL to preview what visitors on
  that platform see.
- The table is built in the browser when it scrolls near the viewport, so its
  text is not part of the initial HTML.
