# AVG Theme Tokens

The project reuses the AVG brand theme (design tokens + typography scale) ported from the
AVG `ui.frontend` design system into native CSS custom properties.

- **Source of truth:** `avg/ui.frontend/src/main/webpack/theme/css/variables/_colors.scss`
  and `…/_typo-vars.scss` (Sass `$variables`).
- **Where they live in this project:** `styles/styles.css` `:root` (mobile-first defaults),
  with the desktop typography values overridden inside the existing
  `@media (width >= 992px) { :root { … } }` block.
- **Rule:** never hardcode a hex/`rgb()` color in a block CSS file. Reference a token
  (`var(--avg-…)`). For semi-transparent brand colors (overlays, shadows) use relative color
  syntax against a token, e.g. `rgb(from var(--avg-black) r g b / 45%)` — no raw hex.

> Note: the AVG design system switches its type scale at `lg = 992px`. This project's token
> override matches it (`@media (width >= 992px)`), consistent with the blocks' own media
> queries. The token *values* are identical to AVG's.

## Color tokens (`--avg-*`)

Mirror the AVG SCSS names with an `--avg-` prefix.

| Token | Hex | AVG `$name` |
|-------|-----|-------------|
| `--avg-green` | `#008941` | `$green` (primary CTA) |
| `--avg-alt-green` | `#00783b` | `$alt-green` (CTA hover) |
| `--avg-green-inverse` | `#24aa63` | `$green-inverse` |
| `--avg-pale-green` | `#d1edde` | `$pale-green` |
| `--avg-faint-green` | `#e6f4ed` | `$faint-green` |
| `--avg-off-white-green` | `#f2faf6` | `$off-white-green` |
| `--avg-bright-green` | `#9ae437` | `$bright-green` |
| `--avg-blue` | `#2276d9` | `$blue` |
| `--avg-alt-blue` | `#1d67bf` | `$alt-blue` (text links) |
| `--avg-blue-inverse` | `#4d99f0` | `$blue-inverse` |
| `--avg-mid-blue` | `#93c1f5` | `$mid-blue` |
| `--avg-light-blue` | `#b6d5f7` | `$light-blue` |
| `--avg-pale-blue` | `#d9e8fa` | `$pale-blue` |
| `--avg-faint-blue` | `#ebf4ff` | `$faint-blue` |
| `--avg-off-white-blue` | `#f2f8ff` | `$off-white-blue` |
| `--avg-red` | `#db3559` | `$red` |
| `--avg-red-hover` | `#bd3352` | `$red-hover` |
| `--avg-yellow` | `#ffb600` | `$yellow` |
| `--avg-pale-yellow` | `#ffe29e` | `$pale-yellow` |
| `--avg-faint-yellow` | `#fff2d4` | `$faint-yellow` |
| `--avg-off-white-yellow` | `#fff9ed` | `$off-white-yellow` |
| `--avg-black` | `#1c222e` | `$black` (primary ink) |
| `--avg-gray1` | `#2b323f` | `$gray1` |
| `--avg-gray2` | `#3a4252` | `$gray2` |
| `--avg-gray3` | `#697284` | `$gray3` (muted body copy) |
| `--avg-gray4` | `#9aa3b5` | `$gray4` (footer copy) |
| `--avg-gray5` | `#ced4e0` | `$gray5` (borders, hover) |
| `--avg-gray6` | `#e4e8f0` | `$gray6` |
| `--avg-gray7` | `#edf0f7` | `$gray7` |
| `--avg-gray8` | `#f7f9fc` | `$gray8` |
| `--avg-white` | `#fff` | `$white` |

## Typography scale (`--tp-fs-*`, `--tp-lh-*`, `--tp-ls-*`)

Responsive font-size / line-height / letter-spacing tokens. Mobile values are the `:root`
defaults; desktop values come from the `@media (width >= 992px)` override. Apply the pair that
matches the element's role; the value is automatically responsive:

```css
.my-block h2 {
  font-size: var(--tp-fs-h2);
  line-height: var(--tp-lh-h2);
}
```

| Token group | Mobile (fs/lh) | Desktop (fs/lh) | Typical use |
|-------------|----------------|-----------------|-------------|
| `h1` | 42 / 54 | 56 / 72 | hero headline |
| `h2` | 34 / 44 | 46 / 60 | section heading |
| `h3` | 26 / 34 | 34 / 44 | sub-section |
| `h4` | 21 / 27 | 28 / 36 | |
| `h5` | 18 / 24 | 24 / 32 | |
| `h6` | 16 / 20 | 20 / 26 | card heading |
| `h7` | 14 / 18 | 16 / 22 | |
| `body1` | 18 / 24 | 20 / 26 | lead text |
| `body2` | 16 / 22 | 18 / 24 | hero subtitle, prose body |
| `body3` | 14 / 20 | 16 / 22 | secondary body |
| `body4` | 12 / 18 | 14 / 20 | fine print |
| `body5` | 11 / 16 | 12 / 18 | legal |
| `button-l` | 16 / 20 / 0.8px | 20 / 24 / 1px | large CTA (incl. `--tp-ls-button-l`) |
| `button-m` | 14 / 16 / 0.6px | 16 / 20 / 0.8px | medium CTA (incl. `--tp-ls-button-m`) |

Headings are weight `900` (Roboto Black); taglines/buttons are weight `700`. The full AVG scale
also defines `h0`, `tagline-*`, `button-s` and `monospace` — add them to `:root` when a design
actually needs them.

## How blocks consume these

- **hero** — `h1` → `--tp-fs-h1`/`--tp-lh-h1`; subtitle → `body2`; CTA → `--avg-green` /
  `--avg-alt-green` (hover) on `--avg-white`; overlay/shadows via `rgb(from var(--avg-black) …)`.
- **columns `.prose`** — `h2` → `--tp-fs-h2`; body → `body2`; muted copy → `--avg-gray3`; ink →
  `--avg-black`; checkmark + CTA → `--avg-green`; footnote link → `--avg-alt-blue`.
- **cards `.icons`** — heading ink → `--avg-black`; body → `--avg-gray3`; card border →
  `--avg-gray5`.
- **footer** — background → `--avg-black`; copy → `--avg-gray4`; dividers → `--avg-gray3`;
  hover → `--avg-gray5` / `--avg-white`.

When `get_variable_defs` returns a Figma color/size, map it to the matching token above instead
of writing a literal value. If a brand value is missing from `:root`, add it there (once) and
reference it everywhere.
