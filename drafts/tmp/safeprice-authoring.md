# Authoring the "AVG SafePrice" page in Universal Editor

This guide explains how to recreate the page rendered by
`/drafts/tmp/safeprice.plain.html` from scratch in the Universal Editor (UE).

The page itself is made of **4 sections**, plus page-level **metadata**. The
**header** and **footer** are not on the page — they are separate **fragment
pages** (`/drafts/nav` and `/drafts/footer`) that the page pulls in via
metadata; authoring them is covered in sections 5 and 6.

Build the page top to bottom in the order below. Each section is added from the
Content Tree (left rail) using **Insert section**, and blocks/components are
added inside a section with the **+** button or via the **Insert** dialog.

---

## 0. Page Metadata (page properties)

These values control the `<head>`, the navigation, and the footer fragment.
Set them in the page **Properties** / page-level metadata, not as on-page
content.

| Field  | Value          | Purpose                              |
| ------ | -------------- | ------------------------------------ |
| title  | `AVG SafePrice`| Browser tab + SEO title              |
| nav    | `/drafts/nav`  | Path to the navigation fragment      |
| footer | `/drafts/footer`| Path to the footer fragment         |

---

## 1. Hero section

Add a **Hero** block to the first section. The Hero is a **simple block** — when
you select it, its **Properties** panel shows these built-in fields (no child
components to add). Fill them in:

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| Background Image | upload/select `safeprice-hero.jpg`             |
| Image Alt Text   | `Woman shopping online with AVG SafePrice`     |
| Heading          | `AVG SafePrice`                                |
| Subheading       | `Let the best online shopping deals find you`  |
| Button Link      | `https://chrome.google.com/webstore`           |
| Button Label     | `Add to Chrome`                                |

> The block JS renders the image as the full-bleed background (with a dark
> overlay), the Heading as an **H1**, the Subheading as the subtitle, and turns
> the link into the green AVG CTA with the Chrome icon — so you only author the
> raw content. There are no child components or styles to set on the Hero.

---

## 2. "SafePrice is more than a shopping add-on" — Columns (Prose)

Add a **Columns** block. In the block's model set:

- **Style**: select **Prose** (this is the `prose` variation).
- **Columns**: `2`
- **Rows**: `1`

Then fill the two columns:

**Column 1 (left) — Image**
- Image: `safeprice-illustration.svg`
- Alt text: `Shopping categories connected to SafePrice`

**Column 2 (right) — Text / Title**
- Title (**H2**): `SafePrice is more than a shopping add-on.`
- Text (rich text): `Used by more than **3 million people worldwide**, our
  add-on helps you shop with confidence by guiding you to **30,000+ verified
  stores**.`
  - Bold the phrases `3 million people worldwide` and `30,000+ verified stores`.

---

## 3. "Shop smarter, without interruptions" — section + Cards (Icons)

This is its own section with a grey background and a Cards block.

### Section settings
- **Style**: select **AVG Grey** (applies the `avg-grey` section style).

### Default content (above the cards)
- Title (**H2**): `Shop smarter, without interruptions`
- Text: `AVG SafePrice helps you discover relevant offers and information while
  you browse, without disrupting your shopping experience.`

### Cards block
Add a **Cards** block and set:
- **Style**: select **Icons** (the `icons` variation).

Add **3 Card** items. Each Card has an **Image** field and a **Text**
(rich text) field:

| Card | Image (icon)          | Text                                                                                                   |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | `feature-money.png`   | **H3** `Shop without interruptions` + `Browse offers and information without leaving the page you're on.` |
| 2    | `feature-tag.png`     | **H3** `Find deals and coupons` + `Save money with coupons and special offers on plane tickets, hotels, electronics, clothes, and more.` |
| 3    | `feature-basket.png`  | **H3** `Shop at the right stores` + `Buy from reputable online shops to protect yourself from fake websites and online fraud.` |

> Leave the icon image **alt text empty** — these are decorative icons.

---

## 4. "One add-on for all your shopping needs" — Columns (Prose, Image Right)

Add another **Columns** block. In the block's model set:

- **Style**: select both **Prose** and **Image Right** (multi-select →
  `prose image-right`). Image Right flips the layout so the image sits on the
  right on desktop.
- **Columns**: `2`
- **Rows**: `1`

**Column 1 — Image**
- Image: `safeprice-steps.png`
- Alt text: `People searching for the best prices`

**Column 2 — Text / Title / Button (Icons) / Support line**

Add these components **inside** the second column, in this order:

1. Title (**H2**): `One add-on for all your shopping needs`
2. Text: `Using SafePrice couldn't be easier:`
3. Bulleted list (rich text):
   - `Simply go to your favourite online shop or travel site`
   - `Pick the item you want to buy`
   - `We'll automatically scan the Internet to find the best prices for you`
4. **Button (Icons)** component — insert it from the **+** menu inside the column
   (it's the custom `icon-button` block, allowed inside Columns), and place it
   **above** the support line below. In its **Properties** panel set:

   | Field             | Value                                  |
   | ----------------- | -------------------------------------- |
   | Text              | `Add to Chrome`                        |
   | Link              | `https://chrome.google.com/webstore`   |
   | Title             | `Add to Chrome`                        |
   | Type              | **Primary**                            |
   | Button Image (Left) | select/upload `chrome.svg`           |
   | Button Image (Right) | leave empty                         |

   > In the editor the icon-button renders as a real block with the left image
   > **inside** the button. On the **published site** (preview/live) the Edge
   > Delivery pipeline flattens any block nested inside a Columns column into
   > plain content — the button and the icon arrive as separate elements. The
   > Columns prose block detects this and pulls the icon back into the green AVG
   > button automatically, so author and live render the same. (This is why a
   > nested block can't be styled by its own `icon-button.css` on the live site;
   > the styling/merge lives in the Columns block instead.)
5. Text (support line): `Problems with the addon? Visit our Support Center.`
   - Link the words **Visit our Support Center** to:
     `https://support.avg.com/SupportArticleView?l=en&urlName=AVG-SafePrice-Frequently-Asked-Questions&q=Safeprice&supportType=home`

---

## 5. Header / navigation (`/drafts/nav` fragment)

The header is **not** authored on the SafePrice page. It is a separate
**fragment page** at `/drafts/nav`, pulled in because page metadata sets
`nav = /drafts/nav`. The `header` block loads this fragment and maps its first
three sections to **brand → sections → tools** (in that order). Author the nav
page as **default content** (no blocks) split into 3 sections:

### Section 1 — Brand (logo)
- Add an **Image**: `avg-logo.svg`, alt text `AVG` (width 98 × height 40).
- Make the image a **link** to `/` (the home page).

### Section 2 — Nav links (becomes the menu)
- Add a **bulleted list**. Any top-level item that contains a nested list
  automatically renders as a **dropdown** (`nav-drop`).
- `Products` (top-level item, with a nested list):
  - `Internet Security` → `https://www.avg.com/en-ww/internet-security`
  - `SafePrice` → `https://www.avg.com/en-ww/safeprice`

### Section 3 — Tools
- Add a **link**: `MyAccount` → `https://myaccount.avg.com/`

> Section order is what assigns brand/sections/tools, so keep these three
> sections in the order above. The hamburger toggle for mobile is added
> automatically by the block.

---

## 6. Footer (`/drafts/footer` fragment)

The footer is also a separate **fragment page** at `/drafts/footer`, referenced
because page metadata sets `footer = /drafts/footer`. The `footer` block reads
the fragment and re-arranges the pieces into 4 rows regardless of how you wrap
them, but author them as **default content** in this logical order:

### Row 1 — Brand + region/account
- **AVG logo** image: `avg-logo.svg`, alt `AVG` (98 × 40).
- **Region** paragraph (`footer-region`): a link `United States` →
  `https://www.avg.com/en-ww/change-region`, preceded by the `flag-us.svg`
  icon (empty alt, 24 × 24).
- **Account** paragraph (`footer-account`): link `Log in to AVG MyAccount` →
  `https://myaccount.avg.com/`.

### Row 2 — Gen brand line
- **Gen logo** image: `gen-logo.svg`, alt `Gen` (41 × 16).
- Paragraph: `AVG is part of Gen - a global company with a family of trusted
  brands.`

### Row 3 — Legal copyright
- A single paragraph with the full legal/copyright text (the block detects it
  by the words "copyright"/"trademark"):
  `Copyright © 2026 Gen Digital Inc. All rights reserved. …Other names may be
  trademarks of their respective owners.`

### Row 4 — Footer links
- A **bulleted list** of links:
  - `About Gen` → `https://www.gendigital.com/about`
  - `Newsroom` → `https://www.gendigital.com/newsroom`
  - `Careers` → `https://www.gendigital.com/careers`
  - `Legal` → `https://www.avg.com/en-ww/legal`
  - `Privacy` → `https://www.avg.com/en-ww/privacy`
  - `Security` → `https://www.avg.com/en-ww/security`
  - `Accessibility` → `https://www.avg.com/en-ww/accessibility`
  - `Cookie settings` → `#`
  - `Your privacy choices` → `https://www.avg.com/en-ww/privacy`
  - `Imprint` → `https://www.avg.com/en-ww/imprint`

> **Why "© 2021 Adobe" shows in the screenshots:** that is the default
> boilerplate footer. It appears whenever the page's `footer` metadata is not
> pointing at `/drafts/footer` (or that fragment hasn't been previewed yet).
> Once the fragment exists and the metadata is set, the AVG/Gen footer above
> replaces it.
>
> The `footer-region` and `footer-account` classes are how the block tells the
> two top-right paragraphs apart. In a hand-authored draft HTML they are set
> directly; when authoring the fragment in UE, keep them as the first two
> paragraphs next to the AVG logo so the block places them correctly.

---

## Quick reference — block ➜ Style mapping

| Section | Block                          | Style selection (model) |
| ------- | ------------------------------ | ----------------------- |
| 1       | Hero                           | —                       |
| 2       | Columns                        | `Prose`                 |
| 3       | (section) + Cards              | Section: `AVG Grey`; Cards: `Icons` |
| 4       | Columns + **Button (Icons)**   | Columns: `Prose`, `Image Right`; Button: `Primary` |
| Header  | nav fragment      | `/drafts/nav` (default content, 3 sections) |
| Footer  | footer fragment   | `/drafts/footer` (default content, 4 rows)  |

## Authoring tips

- **Order matters for container blocks.** For the **Columns** and **Cards**
  blocks, UE renders child components in the order you add them, so follow the
  per-block order above. The **Hero** is a simple block with fixed fields, so
  order doesn't apply there — just fill in the fields.
- **Headings.** Hero uses **H1**; both Columns sections use **H2**; cards use
  **H3**. Keep this hierarchy for accessibility/SEO.
- **Buttons with icons.** Use the **Button (Icons)** component (`icon-button`)
  whenever a CTA needs a left/right image (e.g. the Chrome logo). It can be
  inserted directly inside a **Columns** column. Leave the icon **alt text
  empty** — the label already conveys the action.
- **Images.** Author-uploaded images are auto-optimized by Edge Delivery, so
  upload the source asset and let the platform handle responsive variants.
  SVGs (the illustration) are served as-is.
- **Preview** with the AEM Sidekick, then verify the rendered output matches
  `safeprice.plain.html`.
