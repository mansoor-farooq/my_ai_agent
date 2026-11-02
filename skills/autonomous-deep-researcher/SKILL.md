---
name: autonomous-deep-researcher
description: Production-grade autonomous deep search and secondary verification engine. Automatically investigates design aesthetics (minimalism, glassmorphism, polymorphism), architecture benchmarks, and library ecosystems without requiring user prompts or manual references.
---

# Autonomous Deep Research & Secondary Verification Engine

Use this skill whenever building production features, designing user interfaces (minimalism, glassmorphism, polymorphism, high-density ERP), selecting frameworks, researching backend module patterns, or evaluating architectural patterns.

## Core Philosophy

1. **Autonomous Investigation over User Hand-Holding** — When a user gives a brief direction (e.g. *"minimalism UI chahiye"*, *"glassmorphism effect banao"*, *"event-driven order booking"*), do NOT ask the user for examples, CSS snippets, or references. The agent autonomously searches, analyzes, and extracts industry benchmarks.
2. **Secondary Verification** — Cross-check material, current or high-impact claims with a second reliable source or independent verification. Compare 2-3 options only when the brief leaves a meaningful decision open; a single evidence-backed direction is better for a bounded request.
3. **Evidence-Based Decision Briefs** — For UI, backend and architecture work, deliver a source-backed recommendation, alternatives, trade-offs and a visual wireframe or module/data-flow diagram before implementation when the user asked for inspiration or a new direction.
4. **Approval then execution** — If the user requested inspiration/options, wait for approval of the recommended direction before editing. After approval, proceed with scoped implementation and verification. For already-scoped fixes, do not add an unnecessary approval pause.
5. **Evidence integrity** — Prefer current first-party/official sources; open each source and record the exact claim it supports. Label inference, date-sensitive claims and unverified memory. Never fabricate a benchmark, URL, citation or provider capability. If browsing is unavailable, state the limit and continue with repository evidence.

---

## 1. The 3-Phase Deep Search Protocol

```
+-------------------------------------------------------------------------------+
| PHASE 1: PRODUCT AND REQUEST                                                 |
| - Inspect product, audience, task, constraints and current stack               |
| - Separate verified facts, design intent and assumptions                      |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| PHASE 2: TARGETED SOURCE RESEARCH                                             |
| - Search official docs/design systems and relevant production examples        |
| - Open sources; record the exact principle, limits and direct URL             |
| - Treat snippets and remembered styles as unverified                          |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| PHASE 3: SECONDARY VERIFICATION & MULTI-OPTION MATRIX                         |
| - Synthesize distinct options only when the brief leaves a material choice   |
| - Present a compact blueprint and evidence/tradeoffs                          |
| - Follow the manager's approval gate; never ask users to choose skills        |
+-------------------------------------------------------------------------------+
```

---

## 2. Deep Aesthetic Reference Catalog

Use these aesthetic categories only as search vocabulary, never as fixed recipes. Research product-fit references and verify any tokens before recommending them:

### A. Minimalist Enterprise (Linear / Vercel style)
- **Philosophy**: Extreme clarity, typography-driven, zero decorative clutter, crisp 1px borders.
- **Tokens**:
  - Background: Neutral white (`#FFFFFF`) or Deep Slate (`#0B0F17`)
  - Surface: Pure `#F8FAFC` or `#111827` with `border: 1px solid rgba(226, 232, 240, 0.8)`
  - Typography: Clean sans-serif, `-0.02em` tracking for headings, crisp tabular numerals (`font-feature-settings: 'tnum'`).
  - Shadows: Subtle single-layer `0 1px 2px 0 rgba(0, 0, 0, 0.05)`.

### B. Glassmorphic / Polymorphic (Apple macOS / VisionOS style)
- **Philosophy**: Translucent surfaces, physical depth, specular light catching edges, dynamic background blur.
- **Tokens**:
  - Surface: `background: rgba(255, 255, 255, 0.65)` (Light) or `rgba(18, 24, 38, 0.70)` (Dark)
  - Blur Filter: `backdrop-filter: blur(16px) saturate(180%)`
  - Specular Border: `border: 1px solid rgba(255, 255, 255, 0.25)` with inner top highlight `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4)`
  - Elevation: Soft diffuse ambient shadow `0 20px 40px -15px rgba(0, 0, 0, 0.12)`.

### C. High-Density ERP / Power-User (SAP Fiori Horizon / ERPNext)
- **Philosophy**: Maximum information throughput, zero wasted padding, stable table headers, keyboard navigability.
- **Tokens**:
  - Row Height: Compact 36px - 40px
  - Header: Sticky `#F1F5F9` with uppercase 11px semi-bold labels
  - Indicators: Strict status semantics (Green = Posted, Amber = Pending, Red = Cancelled).

---

## 3. Secondary Verification Output Template

When presenting research for a material decision, use this format and include only sections that apply:

```
### Autonomous Deep Research: [Topic / Aesthetic]

#### Option A (Recommended): [Name, e.g., Modern Minimalist Pure]
- **Pros and trade-offs**: State the expected impact and how it will be checked; do not promise unmeasured performance or accessibility conformance.
- **Key Tokens**: `border: 1px solid #E2E8F0`, `bg-white`, crisp typography.
- **Visual Wireframe**:
  +-----------------------------------------------------------+
  | [ SO-2026-001 ]  Customer: ACME Corp        Status: POSTED|
  +-----------------------------------------------------------+

#### Option B: [Name, e.g., Frosted Glass Polymorphic]
- **Pros and trade-offs**: Describe the product-specific benefit and test contrast, reduced-motion and rendering cost.
- **Key Tokens**: `backdrop-blur-md`, `bg-white/70`, `border-white/20`, specular shadow.
- **Visual Wireframe**:
  +~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-+
  | (Frosted Surface) SO-2026-001  |  [ View Glass Modal ]    |
  +~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-+

Ask for approval only when the proposed direction is a material product choice that has not already been approved. Never ask the user to choose skills or agents.
```
