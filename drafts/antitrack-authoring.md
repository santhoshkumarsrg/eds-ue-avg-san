# Authoring the "AVG Product" (antitrack) page in Universal Editor

This guide explains how to recreate the page rendered by
`/drafts/antitrack.plain.html` from scratch in the Universal Editor (UE).

The page is a long product landing page made of **15 sections** plus page-level
**metadata**. Build it top to bottom in the order below. Each section is added
from the Content Tree (left rail) using **Insert section**; blocks and default
content are added inside a section with the **+** button / **Insert** dialog.

Most blocks on this page are **container blocks**: you add the block, then add
child items (Card, Step, Award, Slide, Tab, Feature, Pricing Plan…) inside it.
The placeholder copy below is Lorem ipsum — swap in the real content.

---

## Section styles (reference)

Section styles are set on the **section** (Content Tree ➜ select section ➜
**Style**). The picker offers:

| Label            | Class      |
| ---------------- | ---------- |
| Highlight        | `highlight`|
| AVG Grey         | `avg-grey` |
| Dark             | `dark`     |
| Hero             | `hero`     |
| Centered         | `centered` |
| Blue Background  | `bg-blue`  |
| Grey Background  | `bg-grey`  |

> **Note on `bait` styles.** Sections 5–9 use `bait`, `bait-blue`, and
> `bait-dark`. These styles exist in `styles/styles.css` but are **not** in the
> Style picker yet. To author them in UE you must add them to the `style`
> options in `models/_section.json` (then `npm run build:json`). Until then they
> can only be applied in local mock HTML.

---

## 0. Page Metadata (page properties)

Set these in the page **Properties** / page-level metadata (not as on-page
content):

| Field  | Value              | Purpose                          |
| ------ | ------------------ | -------------------------------- |
| title  | `AVG Product Name` | Browser tab + SEO title          |
| nav    | `/drafts/nav`      | Path to the navigation fragment  |
| footer | `/drafts/footer`   | Path to the footer fragment      |

---

## 1. Hero section — Product Hero + Pricing + Feature Bar

**Section Style:** `Hero`

This is the biggest section. It stacks four things: the Product Hero, a Pricing
panel, a small "also available" line, and a Feature Bar.

### 1a. Product Hero block

**Product Hero** is a container block (child components: Image, Title, Text,
Button). Add these children **in order**:

1. **Text** (eyebrow): `AVG Product Name` — prefix with the `shield-check.svg` icon.
2. **Title** (**H1**): `Lorem ipsum dolor sit amet`
3. **Text** (intro): `Quisque at lorem et augue finibus viverra eu vel urna. Nunc eget sem ut dui sodales venenatis at et quam. Quisque vitae libero urna.`
4. **Text** (rating row): `AVG` logo + **Excellent** + `stars.svg` + `15,354 reviews on Trustpilot`
5. **Button**: `Free download` linking to the download URL (prefix with `windows.svg`).

### 1b. Pricing block

**Pricing** is a container block with **two block-level rich-text fields** plus
one **Pricing Plan** child per device tier. Every part of a plan card is its own
field, so the whole card is authorable in UE.

Block-level fields (set on the Pricing block itself):

| Field       | Value                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| Features    | Paragraph `Lorem ipsum dolor sit amet consectetur adipiscing elit`, a 4-item bullet list `Duis laoreet nibh vel tincidunt tristique.`, and a `See all features` link |
| Footer Line | `Try it free for XY days` (linked) + ` (No credit card needed)`                        |

Add **2 Pricing Plan** items with these discrete fields:

| Field           | Plan 1                                | Plan 2                                          |
| --------------- | ------------------------------------- | ----------------------------------------------- |
| Device Tier     | `1 device`                            | `10 devices`                                    |
| Platform Icon   | `windows-dark.svg`                    | `platforms.svg`                                 |
| Save Badge      | `Save {discount}`                     | `Save {discount}`                                |
| Was / Intro Price | `{strike_price}` (strike-through) ` {sale_price}/first yr` | same                        |
| Works-out Label | `It works out as`                     | `It works out as`                                |
| Price Currency  | *(leave empty)*                       | *(leave empty)*                                  |
| Price Amount    | `{monthly_price}`                     | `{monthly_price}`                                |
| Price Period    | `/month`                              | `/month`                                         |
| Buy Link        | `{buy_link}` (or a static checkout URL) | `{buy_link}` (or a static checkout URL)        |
| Buy Label       | `Buy now`                             | `Buy now`                                        |
| Fine Print      | `Savings compared to renewal price {strike_price}/year. Subscription details` | same     |
| SKU (internal id) | `AGDI-00-001-12`                    | `AGDI-00-010-12`                                 |
| Campaign Code   | `WD-HOLIDAYPROMO21`                   | `WD-HOLIDAYPROMO21`                              |

> **Was / Intro Price** and **Fine Print** are rich text — use the editor's
> strike-through on the renewal price, and link `Subscription details` if needed.
> The block renders the plans side by side (features column on the left) and the
> **Footer Line** as a full-width row beneath them.

#### Live pricing (SKU + Campaign Code)

**SKU** and **Campaign Code** are hidden — they render only as `data-sku` /
`data-campaign` attributes on the plan, never as visible text. When a **SKU** is
set, `scripts/pricing-api.js` (triggered when the block is decorated) calls the
pricing API (`platform=web`, locale from the URL, `campaign`, `internalIds=<sku>`)
and swaps these placeholder tokens wherever they appear in the plan:

| Token              | Replaced with (API field)               |
| ------------------ | --------------------------------------- |
| `{strike_price}`   | `priceFormatted`                        |
| `{sale_price}`     | `realPriceFormatted`                    |
| `{monthly_price}`  | `realPriceRoundedPerMonthFormatted`     |
| `{monthly_strike}` | `priceRoundedPerMonthFormatted`         |
| `{future_price}`   | `futureRealPriceFormatted`              |
| `{future_strike}`  | `futurePriceFormatted`                  |
| `{discount}`       | `discountPercentFormatted` (else `discountFormatted`) |
| `{buy_link}`       | `link` (set as the buy button's href)   |

Author the plain token in any price field, e.g. **Was / Intro Price** =
`{strike_price} {sale_price}`, **Save Badge** = `Save {discount}`, **Price
Amount** = `{monthly_price}`. Set **Buy Link** to `{buy_link}` to use the live
checkout URL from the API.

Notes:
- The API's formatted values **already include the currency symbol** (e.g.
  `$7.50`), so do **not** add a separate `$` — leave the **Price Currency**
  field empty when using a token.
- Every known text token is always resolved. If the API is unreachable or a
  field is missing, price tokens fall back to `X.XX` and `{buy_link}` falls back
  to `#` (so a raw `{token}` is never shown).

### 1c. "Also available" line (default content)

Add a **Text** paragraph directly in the section (below the Pricing block):
`Also available for XX, YY, and ZZ` + `guarantee.svg` icon + `30-day money-back guarantee`.

### 1d. Feature Bar block

**Feature Bar** is a container block with a block-level **Intro Tab** text field
and one **Feature** child per item.

- **Intro Tab** (block field): `Join millions of others and get AVG Internet Security to help:`

Add **4 Feature** items (each has an **Icon** + **Label**):

| # | Icon              | Label (bold)                          |
| - | ----------------- | ------------------------------------- |
| 1 | `fb-malware.svg`  | `Stop viruses and malware`            |
| 2 | `fb-scam.svg`     | `Block scam sites and emails`         |
| 3 | `fb-identity.svg` | `Protect yourself from identity theft`|
| 4 | `fb-payment.svg`  | `Make online payments safely`         |

---

## 2. "Lorem ipsum" — Centered intro + Cards (Boxed)

**Section Style:** `Centered`

### Default content (above the cards)
- Eyebrow **Text**: `shield-check.svg` icon + `AVG Product Name`
- Title (**H2**): `Lorem ipsum dolor sit amet`
- **Text**: `Integer viverra nisl est, at commodo metus sodales et. …`

### Cards block
Add a **Cards** block, set **Style** = **Boxed**. Add **4 Card** items:

- Each Card: **Image** = `ico-circle.svg`; **Text** = **H3** `Lorem ipsum dolor sit amet, consectetur adipiscing elit` + paragraph `Duis laoreet nibh vel tincidunt tristique. Donec molestie scelerisque rutrum. Vestibulum eget rhoncus quam.`

---

## 3. Cards (Icons) grid

**Section Style:** `Centered`

Add a **Cards** block, set **Style** = **Icons**. Add **5 Card** items:

- Each Card: **Image** = `ico-circle.svg`; **Text** = **H3** `Lorem ipsum dolor sit amet, consectetur` (heading only, no body copy).

---

## 4. Product screenshot

**Section Style:** `Centered`

Add a single **Image** as default content: `laptop.svg` (alt `Product interface preview`). The centered style renders it as a large device screenshot.

---

## 5–9. Alternating feature "bait" rows — Columns (Prose)

Sections 5 through 9 are all the same **Columns** block with the **Prose** style,
alternating image side, over the tinted "bait" backgrounds.

For each: add a **Columns** block and set **Style** as noted below. Fill:

- **Column 1 — Image**: `image-placeholder.png`
- **Column 2 — Text**:
  - Title (**H2**): `Lorem ipsum dolor sit amet`
  - **Text**: `Quisque at lorem et augue finibus viverra eu vel urna. …`
  - Bullet list (3×): `Duis laoreet nibh vel tincidunt tristique.`

| Section | Columns Style          | Section Style        |
| ------- | ---------------------- | -------------------- |
| 5       | `Prose`, `Image Right` | `bait`, `bait-blue`  |
| 6       | `Prose`                | `bait`, `bait-blue`  |
| 7       | `Prose`, `Image Right` | `bait`               |
| 8       | `Prose`                | `bait`               |
| 9       | `Prose`, `Image Right` | `bait`, `bait-dark`  |

> See the `bait` note at the top — these section styles need to be added to the
> section model before they appear in the UE Style picker.

---

## 10. "How it works" — Steps

**Section Style:** `Centered`

- Title (**H2**): `Lorem ipsum dolor sit amet`
- Add a **Steps** block with **3 Step** items. Each Step has an **Icon** + **Text**:
  - Icon: `ico-circle.svg`
  - Text: **H3** `Lorem ipsum dolor sit amet, consectetur` + paragraph `Duis laoreet nibh vel tincidunt tristique. Donec molestie scelerisque rutrum.`

---

## 11. "World-class protection" — Awards + Testimonials

**Section Style:** `Centered`, `Blue Background`

### Default content
- **Image**: `trophy.svg`
- Title (**H2**): `World-class protection`
- **Text**: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. …`

### Awards block
Add an **Awards** block with **3 Award** items. Each: **Logo** = `award-logo.svg`;
**Year + Name** = `2023` + **Lorem Ipsum Dolor**.

### More default content
- Subheading (**H3**): `Trusted by experts, enjoyed by consumers`
- **Text**: `Each month, we stop over 1.5 billion cyberattacks all around the globe …`

### Cards (Testimonial)
Add a **Cards** block, **Style** = **Testimonial**, with **3 Card** items. Each:
- **Image**: `award-logo.svg`
- **Text**: quote paragraph `Lorem ipsum dolor sit amet, consectetur adipiscing elit. …` + a stars line (`stars.svg`, alt `5 out of 5`).

---

## 12. Second CTA — Product name + Pricing (repeat)

**Section Style:** `Centered`

- Title (**H2**): `shield-check.svg` icon + `AVG Product Name`
- **Text**: `Aliquam tincidunt erat in erat vehicula, ut imperdiet diam porta. …`
- **Button** (AVG): `Free download` (prefix `windows.svg`) — this is the green/AVG CTA button.
- Add a **Pricing** block identical to **1b** (Features + two Pricing Plans + trial footer).
- **Text**: `Also available for XX, YY, and ZZ`

---

## 13. FAQ — Tabs

**Section Style:** `Centered`, `Grey Background`

- Title (**H2**): `You may still be wondering...`
- Add a **Tabs** block with **3 Tab** items. Each Tab has a **Tab Label** + **Panel Content** (rich text). The panel is a heading + an accordion list (`<li>` question with a nested answer):

| Tab | Label                 | Panel content (H3 + question/answer list)                              |
| --- | --------------------- | ---------------------------------------------------------------------- |
| 1   | `FAQs`                | 8× `Lorem ipsum … elit?` questions, each with an answer paragraph      |
| 2   | `How to install`      | 3 install steps, each with an expanded detail line                     |
| 3   | `System requirements` | Windows / macOS / Android+iOS requirements, each with a detail line    |

- Below the tabs add a **Text** (support line): `Visit our Support Center for more FAQs.` (link **Support Center**).

---

## 14. Cross-sell — Promo

**Section Style:** `Dark`

- Title (**H2**): `You might also be interested in...`
- **Text**: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. …`
- Add a **Promo** block with **3 Promo Card** items. Each card **Text** (rich text) contains:
  - `shield-check.svg` icon
  - **H3** `Lorem ipsum`
  - platform icons line (`platforms.svg`)
  - paragraph `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
  - link `Learn more`

---

## 15. Articles — Carousel

**Section Style:** `Dark`

Add a **Carousel** block. The **first Slide** is the header (title + "see all"
link); the remaining slides are article cards.

- **Slide 1 (header)**: **H2** `Lorem ipsum dolor sit amet` + link `See all articles`
- **Slides 2–6 (articles)** — each Slide: **Image** = `image-placeholder.png`;
  **Text** = **H3** `Lorem ipsum dolor sit amet, consectetur adipiscing elit` +
  paragraph `Duis laoreet nibh vel tincidunt tristique. …` + link `Lorem ipsum`.

---

## Quick reference — section ➜ block ➜ style

| # | Section Style          | Block(s)                                   | Block style     |
| - | ---------------------- | ------------------------------------------ | --------------- |
| 1 | Hero                   | Product Hero, Pricing, Feature Bar         | —               |
| 2 | Centered               | Cards                                      | Boxed           |
| 3 | Centered               | Cards                                      | Icons           |
| 4 | Centered               | (Image)                                    | —               |
| 5 | bait, bait-blue        | Columns                                    | Prose, Image Right |
| 6 | bait, bait-blue        | Columns                                    | Prose           |
| 7 | bait                   | Columns                                    | Prose, Image Right |
| 8 | bait                   | Columns                                    | Prose           |
| 9 | bait, bait-dark        | Columns                                    | Prose, Image Right |
| 10| Centered               | Steps                                      | —               |
| 11| Centered, bg-blue      | Awards, Cards                              | Cards: Testimonial |
| 12| Centered               | Pricing (+ AVG button)                     | —               |
| 13| Centered, bg-grey      | Tabs                                       | —               |
| 14| Dark                   | Promo                                      | —               |
| 15| Dark                   | Carousel                                   | —               |

## Authoring tips

- **Container blocks first, items second.** Add the parent block (Cards, Steps,
  Awards, Promo, Carousel, Tabs, Pricing, Feature Bar), then add its child items
  in the order you want them to appear.
- **Icons vs. uploaded images.** The small UI icons (`shield-check.svg`,
  `windows.svg`, `stars.svg`, `platforms.svg`, feature-bar icons, `ico-circle.svg`)
  are project SVGs served as-is. Author-uploaded photos (`image-placeholder.png`,
  hero art) are auto-optimized by Edge Delivery.
- **Headings.** Product Hero uses **H1**; section titles use **H2**; card/step/
  promo/slide titles use **H3**. Keep the hierarchy for accessibility/SEO.
- **Decorative icon alt text** should be empty (`alt=""`); descriptive icons
  (ratings, platforms) keep meaningful alt text.
- **Preview** with the AEM Sidekick, then verify the rendered output matches
  `/drafts/antitrack`.
