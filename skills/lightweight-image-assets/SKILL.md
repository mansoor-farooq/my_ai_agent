---
name: lightweight-image-assets
description: Prepare generated or composed images for responsive mobile and low-resource delivery while preserving quality, transparency, and source assets.
---

# Lightweight image assets

- Inspect where and at what rendered dimensions the image will be used before choosing export dimensions. Avoid oversized source files for small UI placements.
- Keep original and accepted master assets intact. Produce optimized derivatives at explicit new paths.
- Prefer WebP or AVIF for photographic/raster artwork when the target stack supports it; preserve PNG where alpha transparency or lossless edges matter; prefer SVG for simple scalable vector artwork when safe and supported.
- Resize to the actual responsive display needs, retain a suitable high-density variant when needed, and avoid upscaling a small source and presenting it as higher quality.
- Use bounded compression and inspect the result at target size for banding, blur, haloing, transparency damage, and distorted fine detail. Choose quality from observed output, not a fixed universal number.
- Avoid large generation batches on constrained devices. Generate one review-sized draft, inspect it, then create only the needed accepted output sizes.
- Report format, dimensions, approximate file size, and any quality compromise. Do not claim a target device/browser supports a format until that support is established for the project.
