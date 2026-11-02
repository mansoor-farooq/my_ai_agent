---
name: production-image-generation
description: Use when a product, website, presentation, or prototype needs a new realistic image, a coherent visual asset set, or a careful edit of user-provided reference imagery.
---

# Production Image Generation

Turn a product need into a usable image brief and, when an authorized image-generation tool is available, generate and inspect the asset. A prompt is not an image: report which one was actually delivered.

## Tool and credential gate

1. Check whether the current agent runtime exposes an image-generation/editing tool or a configured provider integration. Do not assume a Codex image tool exists inside Antigravity.
2. If a tool is available, use it under the user's request and follow that provider's current official documentation for supported models, aspect ratios, references, output formats and content rules.
3. If no tool is available, provide a complete provider-ready prompt plus the minimal setup steps. Do not claim generation succeeded, silently install a remote dependency, or invent an API key/“ID”.
4. Read credentials only from an explicitly configured secret store or environment variable. Never print, commit, export, or include secrets in prompts, project memory, screenshots or Git.
5. Before sending user-provided reference images to an external service, ensure the user requested image work and the selected tool's data handling is appropriate; do not upload unrelated repository assets.

## Build the image brief

Specify:

- intended placement, audience, message and success condition;
- subject, action, environment, time/weather and camera/framing;
- realistic material, lighting direction, lens/depth cues, palette and art direction;
- composition and reserved negative space for UI/text;
- aspect ratio, target dimensions, crop-safe region, format and transparency needs;
- must-preserve identity/logo/product details from supplied references;
- exclusions such as watermarks, fake text, invented brand marks, extra fingers/objects, or misleading real-world claims.

For a realistic image, use concrete physical cues instead of empty labels such as “8K” or “ultra-realistic”: describe surface, light source, shadows, focal plane, lens perspective, skin/material detail and plausible imperfections. Do not promise pixel-level fidelity that the model cannot guarantee.

## Prompt and iteration

Write one direct prompt with scene, subject, action, composition, lighting, material detail, style, delivery constraints and exclusions. For edits, identify the source image and specify exactly what must change and what must remain unchanged. Preserve logos and product details from supplied authorized files; do not ask a generator to redraw text when a real logo asset can be composited later.

Generate only the variants needed to resolve a real uncertainty. Inspect every returned image for composition, artifacts, factual/brand errors, text corruption, crop safety and suitability for the actual UI. Iterate with a specific correction. Save the selected asset in the project's established asset path, use an informative filename, and record its source as AI-generated plus the tool/model/version only when known.

## Handoff

Report the generated file path, tool/provider actually used, format/dimensions if observed, and any visual review limits. If generation was unavailable, return the ready-to-run prompt and clearly state that no image was created. Re-check official provider docs when model IDs or API shapes may have changed. Useful official reference: Google Gemini image generation `https://ai.google.dev/gemini-api/docs/image-generation`; provider-specific capabilities must be verified at execution time.
