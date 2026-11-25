---
name: mansoor-premium-frontend-scroll-storytelling
description: Use when scrolling should drive scene changes, product transformations, narrative chapters, or progressive visual reveals.
---
# Mansoor Scroll Storytelling
Model scroll as a bounded timeline with named chapters and reversible progress. Keep content readable without motion, support keyboard and reduced-motion paths, and avoid scroll hijacking. Use IntersectionObserver or an equivalent measured trigger rather than per-frame DOM queries.

Stop condition: every chapter has an accessible static state, deterministic progress range and tested reverse scroll.

