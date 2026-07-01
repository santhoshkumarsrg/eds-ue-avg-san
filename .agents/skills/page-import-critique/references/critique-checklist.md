# Migration Critique Checklist (original vs migrated)

Run this for **each** breakpoint (mobile 360×844 and desktop 1600×900; add tablet 768×1024 if the original has a distinct tablet layout). Desktop styles start at `992px` (AVG `lg`); mobile & tablet share the base below `992px`. Compare the local `localhost:3000` render to the ORIGINAL page.

## Capture per breakpoint

```
# Original reference
resize_page(width, height)
navigate_page("<ORIGINAL_URL>")            # dismiss consent/cookie banners first
take_screenshot(fullPage: true, filePath: "drafts/tmp/orig-<bp>.png")

# Local migrated render
resize_page(width, height)
navigate_page("<LOCAL_URL>")               # e.g. http://localhost:3000/<path>
take_screenshot(fullPage: true, filePath: "drafts/tmp/render-<bp>.png")
```

## Compare, section by section

```
- [ ] Content parity: every section/heading/paragraph/CTA/image in the original is present, once, in order
- [ ] No dropped content and no duplicated content
- [ ] Section order matches the original
- [ ] Layout per section (columns vs stacked, image side, alignment)
- [ ] Spacing: section padding, inter-element gaps, margins
- [ ] Images: correct asset, correct aspect ratio (not stretched/squished), placeholders replaced
- [ ] Background colors match (mapped to project tokens)
- [ ] Text colors match (headings vs body vs muted)
- [ ] Typography: font-family, size, weight, line-height
- [ ] Buttons: bg color, text color, radius, icon, size
- [ ] Links: color, underline
- [ ] Dividers/borders: color, thickness
```

## Confirm suspicious values (don't guess)

```
evaluate_script(() => {
  const el = document.querySelector('<selector>');
  const cs = getComputedStyle(el);
  return { color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
           lineHeight: cs.lineHeight, flexDirection: cs.flexDirection,
           padding: cs.padding };
})
```

A frequent root cause of "wrong color/size" is a CSS selector that silently doesn't match, or a block whose expected content structure differs from what the import produced. Verify the computed style AND the actual DOM before changing values.

## Fidelity intent

A canonical `page-import` rewrites to standard EDS blocks — aim for **content/structure parity**, not byte-for-byte visual identity. Flag real design regressions; don't chase differences that come from intentionally using a standard Block Collection model. If a difference might be acceptable, ask the user. (For design-preserving conversions, use `snowflake` instead.)

## Console

```
list_console_messages()
```

Resolve real errors. The local-draft "Quirks Mode" notice is expected and won't occur on the real EDS page.

## Finish

```
- [ ] Desktop matches the original (content parity + no unexplained regressions)
- [ ] Mobile matches the original
- [ ] No console errors
- [ ] Temporary screenshots in drafts/tmp/ deleted (orig-*.png, render-*.png)
- [ ] Lint passes on edited files
```
