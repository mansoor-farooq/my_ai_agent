---
name: mansoor-premium-coding-boundaries
description: Use when implementing or refactoring modules, services, components, or features whose dependencies and ownership must remain clear.
---

# Premium code boundaries

Keep business rules at the domain boundary, side effects at adapters, and presentation concerns at the UI boundary. Enforce dependency direction and avoid hidden globals, circular imports, and duplicated sources of truth.

Stop when the changed module has a clear owner and its public surface is smaller or better justified.
