---
name: audit-mobile-responsive
description: Use when auditing responsive behavior across mobile, tablet and desktop viewports, including overflow, touch targets and orientation changes.
---
# Mobile-first and responsive audit
Start at phone widths 360x800, 390x844 and 412x915 before tablet and desktop. Check horizontal/vertical overflow, clipping, touch target size, text scaling, fixed/sticky elements, keyboard behavior, forms, navigation, image crops, modal fit and orientation changes. Capture screenshots and exact route/viewport for each finding. Verify core flows at the smallest viewport first and prioritize mobile blockers in the report and fix queue.

Stop condition: requested mobile-first viewport matrix is pass/fail/blocked with evidence; never infer responsive pass from desktop rendering.
