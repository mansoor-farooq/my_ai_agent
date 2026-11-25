---
name: media-production-master
description: Use when producing professional video or image deliverables that need tool discovery, efficient previews, provenance, quality gates, and final playback or visual inspection.
---

# Media Production Master

Treat media work as a production pipeline: inspect, plan, draft, render, inspect, then deliver. Never report a generated or edited asset from a command that was not observed to create a real output.

## Shared pipeline

1. Establish the source, ownership/authorization, target platform, dimensions, duration, language, copy, audio and output path. Preserve originals and use task-owned working files.
2. Discover installed tools and versions (`ffprobe`/`ffmpeg`, Remotion, MoviePy, image codecs, browser renderer, GPU where relevant). Choose the smallest reliable local path; do not install a tool globally or assume a provider exists.
3. Create one bounded draft or proxy before expensive rendering. Keep final asset ownership single-writer and parallelize only independent source inspection, composition planning or QA.
4. Render once at the requested target. Keep exact copy, logos, product packaging, captions and legal text in approved local layers; generated pixels are for decorative or explicitly approved content.
5. Inspect the actual output at target size and, for video, review opening, middle and ending with audio when playback is available. Probe metadata, streams, dimensions, frame rate, duration, file size and format.
6. Return the real output path, properties, provenance, checks, defects, limitations and next action using the shared agent result contract. A successful encoder exit code is not visual or audio proof.

## Quality rules

- Never overwrite source media or silently substitute a similar logo, face, product or text.
- Keep captions inside safe areas, verify timing against an actual transcript/audio source, and flag unverified transcription.
- Reject clipping, black/frozen frames, stretched or letterboxed content, audio clipping/silence, unreadable text, watermarks and unexpected branding.
- Use one targeted correction for a named defect; do not start repeated generations or render loops. If the native provider hangs, stop through its supported control or report the host limitation.
- Record actual tool/model versions only when observed. Separate metadata verification from visual/audio inspection.
