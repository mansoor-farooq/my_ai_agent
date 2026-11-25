---
name: video-production-qa
description: Verify rendered videos for valid exports, playback defects, audio/captions, framing, and target delivery requirements. Use after editing or before releasing a video.
---

# Video production QA

Run checks proportional to the deliverable; do not turn a one-cut clip into a heavy render pipeline.

## File and stream integrity

- Confirm the expected output exists, is non-empty, and can be probed/opened by an available media tool.
- Check container, video/audio streams, duration, dimensions, frame rate, pixel format, and file size against the requested target.
- Compare duration and aspect ratio with the brief. Look for unexpected rotation, letterboxing, stretching, missing audio, or an accidental source overwrite.

## Playback review

- When a player is available, inspect the opening, representative middle, and ending; inspect transitions around known cuts or effects.
- Look for black/frozen frames, corrupt frames, abrupt jumps, clipped graphics, unreadable captions, unsafe-edge text, and watermarks not requested by the user.
- Listen for silence where speech/music is expected, clipping, abrupt audio cuts, uneven dialogue, or obvious sync drift.
- Check caption spelling and timing against the supplied transcript or actual audio when accessible. Do not assert transcription accuracy without comparing it.

## Lightweight verification

- Prefer metadata probes and low-resolution review proxies before full playback on constrained devices.
- Do not generate duplicate full-quality outputs solely for QA. Re-render only after identifying a specific defect, and use a new task-owned output path.
- If no playback-capable tool is available, report metadata verification only and clearly leave visual/audio playback unverified.

## Report

Provide the output path, observed media properties, exact checks performed, defects found/fixed, and unverified areas. Never call a video “bug-free” based only on a successful encoder exit code.
