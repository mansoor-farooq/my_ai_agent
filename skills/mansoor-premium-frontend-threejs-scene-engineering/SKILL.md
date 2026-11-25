---
name: mansoor-premium-frontend-threejs-scene-engineering
description: Use when a website needs Three.js, WebGL, 3D product scenes, camera choreography, or GPU-backed visual storytelling.
---
# Mansoor Three.js Scene Engineering
Keep scene setup, render loop, camera, assets and lifecycle isolated from application state. Prefer progressive enhancement and a 2D fallback for unsupported or reduced-motion contexts. Dispose geometries, materials, textures and renderers; cap pixel ratio and frame work on mobile.

Stop condition: the scene has a responsive fallback, bounded GPU budget and verified teardown.

