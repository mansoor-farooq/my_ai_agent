# Fast Reference-First Image Workflow

## Goal

Help the Mansoor agent team produce accurate banner and product artwork quickly,
keep exact brand text/logos under local control, and stop repeated image calls
from replacing real progress.

## Current evidence

- The UI specialist already has `generate_image` and a general image skill, but
  its instructions do not distinguish copying an existing approved site asset
  from creating a new image, do not define a bounded retry rule, and have no
  deterministic banner compositor.
- Antigravity documents `generate_image` as a host tool. Its hooks can run before
  and after tools, but their documented timeout limits the hook command itself;
  the native image call does not expose an agent-kit cancellation control.
- A native image tool is a poor owner of exact logos, names, prices, copy,
  dimensions and layout. Those elements can be composed locally from approved
  assets and explicit text.
- The Gemini API separately documents reference-image inputs and output ratio/
  size options; using that API would require an API integration/key and is not
  part of this no-new-key workflow.

## Approaches considered

| Approach | Result |
| --- | --- |
| Generate every banner with Antigravity | Small setup; exact typography/layout and host-call duration remain uncontrolled. Rejected as the default. |
| Add a Gemini image API integration | Gives a separate API workflow and documented output controls; adds credentials, billing and a new provider path. Deferred. |
| Reference-first local composition with optional generated background | Reuses the real source asset when requested, typesets exact content locally, needs no new API key, and has a deterministic deliverable. Selected. |

## Design

1. Classify the request: reuse an existing approved asset, edit a supplied image,
   compose a banner from local assets, or generate a new decorative image.
2. Build a small, machine-readable brief with canvas dimensions, reference roles,
   exact copy, local approved asset paths, layout coordinates, colors and
   exclusions. Analyze references once and retain that brief for follow-up.
3. Compose banners as standalone SVG from local PNG/JPEG/WebP assets and
   explicit text/shape layers. SVG output is deterministic, easy to preview,
   dependency-free and preserves exact text. Local project code may rasterize it
   only through a renderer already installed in that project/environment.
4. Call the Antigravity image tool only if the task truly needs a new image and
   the user approved that asset brief. Use one call at a time. A returned image
   may have one targeted revision; an unresolved/hung call gets no retry. A
   local workflow cannot cancel a host-owned operation, so report that limit and
   use the deterministic fallback.
5. Verify paths, image formats, dimensions, text escaping, element bounds and
   output hash in code. Visually review the final rendered output for actual
   reference fidelity, contrast, artifacts and display-size crop safety.

## Implementation plan

- [x] Record the RAG skip cause and the dedicated-database result in the V5 log.
- [x] Add failing tests for image brief validation, safe local assets, exact text
      output and bounds before writing the compositor.
- [x] Implement a dependency-free `tools/image-asset-workflow.mjs` that validates
      a JSON brief and writes a standalone embedded-asset SVG.
- [x] Tighten `production-image-generation` into reference-first, local-compose,
      single-active-call and bounded-revision instructions.
- [x] Route image work through the existing UI specialist and fast-path manager;
      do not add another agent or preload the entire skill library.
- [x] Bundle the helper, bump the package to 1.15.0, run focused tests, full
      suite, doctor, RAG gate, package-content check and diff validation.

## Implementation and verification — 2026-11-13

- Added `tools/image-asset-workflow.mjs`: validates a compact image brief,
  embeds approved local images, escapes exact text, checks every element stays
  inside the canvas, and writes a new SVG or offline-rendered PNG without a new
  image API key or dependency. Protected paths, traversal, symlink escapes,
  remote assets, unexpected formats, size limits and overwrites are rejected.
- PNG rendering uses a filtered environment, disabled background networking,
  a fresh temporary browser profile, a 30-second local timeout and exact output
  dimension verification. Edge is preferred over Chrome on Windows so a
  pre-existing Chrome profile/process is less likely to stall local rendering.
- Strengthened the image skill, Mansoor UI specialist, Flutter specialist and
  manager with a reuse-first workflow, exact-copy local composition, Flutter
  widget guidance, one active native call, two calls maximum, no retries while
  a call is unresolved, and a local fallback/host-intervention rule.
- A pressure-test review found and fixed two handoff gaps: use the installed
  plugin's `$hubRoot` path when calling the helper from another project, and
  explicitly stop after the second returned image result.
- Portable bundle testing caught that the helper was required but not copied by
  the skill-bundle assembly function. It is now copied and also included in the
  signed plugin's runtime file list.
- Image unit tests: 7 passed, 0 failed. Portable/package content tests: 13
  passed, 0 failed. `npm test`: 234 total, 228 passed, 0 failed, 6 skipped.
  The six general-suite skips are database tests behind the explicit RAG gate;
  a separate dedicated-database run passed all 8 RAG tests (including all six
  PostgreSQL checks), with 0 failures and 0 skips.
- Local Edge render smoke: 640×320 PNG, output dimensions matched, 3,869 ms
  elapsed for the temporary local fixture; the rendered preview was visually
  inspected and its text/panel were intact. This verifies the deterministic
  local compose/render path only, not the latency of Antigravity's native
  image provider.
- Version 1.15.0 signed package build passed strict validation and Doctor 20/20.
  The extracted package signature verifier passed; the 1.15.0 plugin manifest
  and bundled image helper were confirmed in the ZIP. ZIP SHA-256:
  `C524EF90183CD5332DDD60C1BB76251FB6A9ED85CEA93142FCD564B0FFB58711`.
  Active Antigravity installation/reload and a real Youngs Bazar asset were not
  part of this local fixture verification.

## Acceptance and limits

- Existing public/source image requested for reuse must be copied locally and
  used as a real local asset; image generation is skipped for that case.
- Exact name/logo/copy/price is rendered as a local layer, never entrusted to
  generated pixels.
- Bad path, external URL, unsupported image, oversized asset, invalid color,
  malformed brief or out-of-canvas element fails before output is written.
- A native image generation call is never automatically duplicated while its
  result remains unresolved. The kit cannot terminate Antigravity's internal
  image call or promise its latency.
- No image model is trained or fine-tuned by this change. The improvement comes
  from reference analysis, task structure, deterministic composition and
  measurable output checks.
- Native Antigravity generation still runs outside this kit's timeout and
  cancellation boundary. If the host supplies no working Stop control, its
  active task must be stopped or otherwise resolved by the host/user before a
  new native generation can start.

## Research sources

- Antigravity SDK tool catalog: <https://antigravity.google/docs/sdk/tools>
- Antigravity hooks: <https://antigravity.google/docs/hooks>
- Antigravity skills: <https://antigravity.google/docs/skills>
- Gemini image generation: <https://ai.google.dev/gemini-api/docs/image-generation>
- Gemini image limitations: <https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-image-generation-limitations>
- Google image prompt best practices: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/gemini-image-generation-best-practices?hl=en>

The connected deep-research service was explicitly asked for High effort but
reported Medium. This plan therefore records a primary-source engineering review,
not an exhaustive market survey.
