# Figma Asset & Token Extraction

Concrete commands and pitfalls for pulling original assets and design tokens out of Figma for an AEM Edge Delivery project.

## Parse the URL

`https://figma.com/design/:fileKey/:name?node-id=1-2` → `fileKey = :fileKey`, `nodeId = 1:2` (convert `-` to `:`).
For `.../design/:fileKey/branch/:branchKey/...` use `branchKey` as the fileKey.

## Tokens (colors, type, spacing)

```
get_variable_defs(fileKey, nodeId)
```

Returns named variables, e.g. `Green=#008941`, `Black=#1C222E`, `Grays/Gray 3=#697284`,
`White=#FFFFFF`, plus font tokens like `Headings/H2=Roboto Black 46/60` and effects
(button drop-shadows). Map these onto the project's CSS variables/values. Do not invent hex codes.

## Structure

```
get_metadata(fileKey, nodeId)   # section/child node ids, sizes, positions
get_design_context(fileKey, nodeId)  # layout + text + reference code + screenshot
```

`get_metadata` on a component instance may not expand children; in that case use
`download_assets` on the section node and/or `get_design_context` to discover assets.

## Assets

### download_assets

```
download_assets(fileKey, nodeId)                       # node export + rawImages[]
download_assets(fileKey, nodeId, defaultFormat="svg")  # vector export
download_assets(fileKey, nodeId, defaultFormat="png", defaultScale=3)  # hi-res raster
```

- `export` = a render of the whole node (includes text/background — not isolated).
- `rawImages` = original uploaded source images (photos) found in the subtree.
- Nested instance-child IDs (`I123:4;...`) are NOT addressable; only plain `\d+:\d+` IDs work.

### Raster photo (hero/banner)

Download all `rawImages`, identify the right one by dimensions, then convert/optimize:

```bash
curl -sL "<asset-url>" -o /tmp/hero.png
sips -g pixelWidth -g pixelHeight /tmp/hero.png
sips -s format jpeg -s formatOptions 80 /tmp/hero.png --out media/hero.jpg
```

If the design's overlay is baked into the exported image, do not also add a heavy CSS
overlay (double-darkening). Add only a light overlay/text-shadow for legibility.

### Single-asset vector illustration

If `get_design_context` exposes one asset for the illustration, download it as SVG and use directly.

### Multi-part vector (illustration/icons with no single asset)

Re-export the parent section at scale 2–3, then crop + auto-trim with Pillow:

```bash
python3 -m venv /tmp/venv-img && /tmp/venv-img/bin/pip install Pillow
/tmp/venv-img/bin/python - <<'PY'
from PIL import Image, ImageChops
im = Image.open('/tmp/section-2x.png').convert('RGB')
# crop the element's column using Figma layout math (x0..x1 * scale), then trim:
c = im.crop((x0, 0, x1, im.height))
bg = Image.new('RGB', c.size, (247,249,252))  # section background color
bbox = ImageChops.difference(c, bg).getbbox()
pad = 8
c.crop((bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, bbox[3]+pad)).save('out.png')
PY
```

`sips` only center-crops (no offset) — use Pillow for precise offset crops.
When the element's background equals the section background, the trimmed PNG blends seamlessly.

## Pitfalls

### SVG stretching

Figma-exported SVGs often have `preserveAspectRatio="none" width="100%" height="100%"`,
which stretches the art to fill any box. Fix the root element to keep aspect ratio:

```diff
- <svg preserveAspectRatio="none" width="100%" height="100%" ... viewBox="0 0 548 274">
+ <svg width="548" height="274" viewBox="0 0 548 274" ...>
```

Then CSS `width:100%; height:auto` scales it proportionally.

### Fragment columns collapse into default-content-wrapper

In EDS, loose (non-block) content in a fragment section is grouped into a single
`.default-content-wrapper`. Column `<div>`s authored in the fragment do NOT survive as
separate flex children, so layouts stack unexpectedly. Don't iterate `row.children`;
instead query the fragment for the pieces you need and assemble the structure in JS:

```js
const logo = fragment.querySelector('img[src*="avg-logo"]')?.closest('picture');
const region = fragment.querySelector('.footer-region');
const list = fragment.querySelector('ul');
// build your own .footer-top / .footer-gen / ... from these pieces
```

### Optimize for SVG in block JS

`createOptimizedPicture` mangles SVG URLs. Skip optimization for `.svg` sources:

```js
if (!img || /\.svg($|\?)/i.test(img.src)) return;
```
