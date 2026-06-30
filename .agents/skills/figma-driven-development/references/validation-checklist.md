# Pixel-Perfect Validation Checklist

Run this for **each** breakpoint (mobile 390×844 and desktop 1440×1024; add tablet 768 if designed). Compare the chrome-devtools screenshot to the matching Figma frame.

## Setup per breakpoint

```
resize_page(width, height)
navigate_page("http://localhost:3000/<test-url>")   # re-resize if the window reset
take_screenshot(fullPage: true, filePath: "drafts/tmp/render-<bp>.png")
get_screenshot(fileKey, nodeId, maxDimension: ...)   # Figma reference for this breakpoint
```

## Compare, section by section

```
- [ ] Section order matches the design
- [ ] Layout per section (columns vs stacked, image side, alignment)
- [ ] Spacing: section padding, inter-element gaps, margins
- [ ] Images: correct asset, correct aspect ratio (not stretched/squished), correct crop
- [ ] Background colors match tokens
- [ ] Text colors match tokens (headings vs body vs muted)
- [ ] Typography: font-family, size, weight, line-height, letter-spacing
- [ ] Buttons: bg color, text color, radius, icon, size, shadow
- [ ] Links: color, underline, hover
- [ ] Dividers/borders: color, thickness
- [ ] Number of CTAs/elements matches the design (don't add/remove vs Figma)
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

A frequent root cause of "wrong color/size" is a CSS selector that silently doesn't match
(e.g. expecting a direct child that is actually nested). Verify the computed style and the
actual DOM structure before changing values.

## Console

```
list_console_messages()
```

Resolve real errors. The local-draft "Quirks Mode" notice is expected and won't occur on the
real EDS page.

## Finish

```
- [ ] Desktop matches its Figma frame
- [ ] Mobile matches its Figma frame
- [ ] No console errors
- [ ] Temporary screenshots in drafts/tmp/ deleted
- [ ] Lint passes on edited files
```
