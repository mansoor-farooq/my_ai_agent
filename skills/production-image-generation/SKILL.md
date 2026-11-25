---
name: production-image-generation
description: Use when creating, editing, sourcing, or composing product images, website banners, mobile hero artwork, or other visual assets from references.
---

# Reference-First Image Workflow

Make the intended image clear before doing expensive visual work. Preserve approved logos and exact text with local assets and code. A prompt is not an image: report the file that was actually delivered.

## Intent, provenance and inspiration gate

Before touching an image tool, classify the request into exactly one primary intent:

1. **Exact source reuse** — the user owns or explicitly authorizes the supplied/public source asset. Fetch the page once, identify the actual loaded image, preserve its provenance and use it locally.
2. **Inspired original** — the user wants a public design as inspiration. Study layout, hierarchy, palette, spacing, crop behavior and interaction cues, then create an original composition with local assets. Do not download or repackage another party's logo, product photography, copy or artwork as if it were ours.
3. **New decorative generation** — no approved source exists and a generated background/illustration is genuinely needed. Generate only the decorative layer; keep brand, product, prices and legal copy in local code/assets.

The user request is the acceptance contract. Extract the exact brand spelling, words, exclusions, target surface, aspect ratio, desired visual traits and what must remain unchanged. If the request is ambiguous, make a short brief and ask one focused question; do not invent copy or silently substitute a similar brand. Public visibility is not proof of reuse rights. Record source URL, ownership/authorization status, local asset path and hash; if authorization is unclear, use inspiration-only mode and state that boundary.

Standard-quality gate for every accepted asset:

- use an explicit canvas/aspect ratio and crop-safe zones for the real device or viewport;
- keep logos, product packs and readable text as approved local layers, not hallucinated pixels;
- preserve contrast, legibility, semantic alt text and responsive behavior;
- keep source/reference, generated artwork and accepted composition as separate files;
- inspect the actual rendered output once at target size and reject clipping, invented labels, watermarks, distorted products or unexpected branding.

## Fast decision order

Choose the first path that satisfies the request:

1. **Reuse an existing approved asset.** If the user says copy/use the banner from their own public site, inspect the page and its loaded image assets, save the actual source image into the project's existing asset folder, and use it locally. Do not regenerate a source banner that already exists. Record its source URL and local path. Respect the user's brand-name and legal copy constraints exactly.
2. **Compose exact layouts locally.** For banners, menus, cards and promotional art with exact copy, logo, prices or product labels, use approved local assets and code. In a web project, use `tools/image-asset-workflow.mjs` to produce a deterministic SVG or PNG. In Flutter, prefer `Stack`/`Row`/`Column`, `Text`, `Image.asset` and existing theme tokens so copy remains responsive and accessible. Do not add an SVG dependency unless the project already uses one or the owner approves it.
3. **Generate only missing decorative imagery.** Use Antigravity's `generate_image` only when a new scene/background materially helps and the current agent actually exposes that tool. Never ask the generator to redraw the real logo, product pack, exact copy, prices or legal text; layer those locally afterward.

Use one owner for the final image asset. For a genuinely cross-project banner task, the manager may run up to three independent work items concurrently: source-banner discovery (read-only), app integration/layout inspection (read-only), and acceptance-criteria review (read-only). Once paths and the asset contract are fixed, an asset owner and a Flutter integration owner may implement in parallel only when they own disjoint paths. Visual QA starts after those outputs exist. Do not launch extra workers for a simple resize, split one file between writers, or fan out multiple copies of the same image-generation request.

## Reference and asset brief

Inspect each reference once. Give every input an explicit role: `layout/style`, `brand/logo`, `product/content`, or `copy`. Keep a compact brief with:

- placement and target canvas dimensions;
- exact brand name, text, punctuation and prices;
- local approved asset paths and reference roles;
- palette, layout zones, crop-safe area and text margins;
- what must stay unchanged and what may change;
- elements that must be excluded;
- output path, format and acceptance checks.

Do not infer product claims or invent brand copy. If the user supplied the exact source asset and requested reuse, keep it intact unless they also requested a specific edit.

For long or cross-project tasks, have the manager post one concise parent-chat update with the objective, named workstreams/owners, active wave and next checkpoint. Show observed worker status at wave changes and handoff. Do not make the user reconstruct progress from repeated `render`/`analyze` tool logs.

For a local web banner, the helper accepts a JSON file using schema `mansoor.image-brief/v1`. It supports local PNG/JPEG/WebP assets, explicit text lines and rectangles. Resolve `$hubRoot` from the enabled `mansoor-agent-hub` plugin path (`agy plugin list --json`) and `$projectRoot` to the actual target project once per session, then use an existing project directory and a new output filename:

```powershell
node "$hubRoot/tools/image-asset-workflow.mjs" compose --dir "$projectRoot" --brief "$projectRoot/.agents/image-workflow/home-banner.json" --out assets/home-banner.png
```

The brief explicitly lists every layer; for example:

```json
{
  "schema": "mansoor.image-brief/v1",
  "id": "home-banner",
  "title": "Youngs Bazar home banner",
  "description": "Local product artwork and exact accessible banner copy",
  "canvas": { "width": 1200, "height": 400, "background": "#0D4F43" },
  "elements": [
    { "id": "brand", "role": "approved local logo", "type": "image", "path": "assets/brand-logo.png", "alt": "Youngs Bazar", "x": 48, "y": 32, "width": 180, "height": 64, "fit": "contain" },
    { "id": "headline", "role": "exact approved copy", "type": "text", "lines": ["Everyday favourites,", "made easy."], "x": 48, "y": 190, "maxWidth": 700, "fontSize": 54, "lineHeight": 62, "weight": 700, "color": "#FFFFFF" }
  ]
}
```

PNG output rasterizes the standalone local SVG with an installed Edge/Chrome browser and checks the final pixel dimensions. Use `.svg` output when vector output is preferred. The helper rejects remote image URLs, traversal, symlink escapes, unsupported formats, invalid colors and elements outside the canvas. It writes only the explicitly requested output file and does not create folders or overwrite an existing file.

For Flutter banners that include readable copy or controls, keep the text and buttons as Flutter widgets rather than baking them into a raster image. Use a raster banner only for artwork that should remain a single fixed image.

## Native generation limits and retry rule

Antigravity owns its built-in image operation. A local skill/script cannot set its provider timeout, cancel the active host call, force an aspect ratio, or guarantee when it returns. Treat the tool as best-effort. Google documents `generate_image` as a host tool and separately documents image API controls; do not assume API controls are available on Antigravity's native tool.

- Allow only one unresolved native image call for a task and at most two native image calls total for one asset.
- Call two is permitted only after call one returns, inspection finds one specific visual defect, and the revised prompt addresses that defect. If call two still has a defect, switch to local editing or report the limitation; do not start call three.
- Never retry a hung or unresolved call. Local workflow timeouts only bound local rendering; they do not terminate Antigravity's provider operation.
- If the native call remains stuck, stop it through Antigravity's own Stop/cancel control when available. If no usable control exists, host/user intervention is required before another generation can start. Then use the source asset or local composition path. Do not report that the host call was cancelled unless Antigravity confirms it.
- Do not launch multiple generations in parallel to try to make one finish faster.
- For local composition, inspect source dimensions/palette once, create one candidate and visually inspect it once at target size. Make at most one local correction for a named defect, then stop. Do not repeat color sampling and full rendering when no new acceptance failure was found.

If no image tool is available, return the local composition or a complete provider-ready brief. Never invent an image path, provider, model, timing, cancellation or successful generation.

## Inspect and accept

Check the output at the real display size and target crop. Verify:

- exact canvas size and output format;
- correct local logo and product images;
- exact requested copy and brand spelling;
- every element stays inside its safe area and text is readable;
- no unwanted generated labels, watermarks, artifacts or cropped products;
- visible agreement with the named reference traits.

The helper verifies the file, local asset hashes, declared text and layout bounds; it cannot prove visual fidelity by itself. Inspect the actual rendered file in a browser/device preview. For generated imagery, record its tool/model/version only when observed. Keep the original reference and generated source separate from the accepted composition.

## Handoff

Report the selected file path, format, dimensions, source assets, actual generation tool/model if used, visual inspection performed and anything still unverified. Never promise perfect similarity, exact pixel reproduction or a fixed generation time.

## Official references

- Antigravity image tool catalog: <https://antigravity.google/docs/sdk/tools>
- Antigravity hooks: <https://antigravity.google/docs/hooks>
- Antigravity skills: <https://antigravity.google/docs/skills>
- Gemini image generation and API response formats: <https://ai.google.dev/gemini-api/docs/image-generation>
- Gemini image limitations: <https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-image-generation-limitations>
- Google image prompting guidance: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/gemini-image-generation-best-practices?hl=en>
