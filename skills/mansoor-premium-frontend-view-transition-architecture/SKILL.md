---
name: mansoor-premium-frontend-view-transition-architecture
description: Use when route changes, page transitions, shared elements, or SPA navigation need smooth native-feeling continuity.
---
# Mansoor View Transition Architecture
Tie transitions to stable semantic identities, not fragile DOM positions. Define enter, exit, interruption and reduced-motion behavior for each route. Preserve focus, URL semantics, loading/error states and server-rendering boundaries while enhancing supported browsers.

Stop condition: transitions remain correct on refresh, back/forward, interruption and unsupported-browser fallback.

