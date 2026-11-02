---
name: autonomous-deep-researcher
description: Production-grade autonomous deep search and secondary verification engine. Automatically investigates design aesthetics (minimalism, glassmorphism, polymorphism), architecture benchmarks, and library ecosystems without requiring user prompts or manual references.
---

# Autonomous Deep Research & Secondary Verification Engine

Use this skill whenever building production features, designing user interfaces (minimalism, glassmorphism, polymorphism, high-density ERP), selecting frameworks, researching backend module patterns, or evaluating architectural patterns.

## Core Philosophy

1. **Autonomous Investigation over User Hand-Holding** — When a user gives a brief direction (e.g. *"minimalism UI chahiye"*, *"glassmorphism effect banao"*, *"event-driven order booking"*), do NOT ask the user for examples, CSS snippets, or references. The agent autonomously searches, analyzes, and extracts industry benchmarks.
2. **Secondary Verification via Multi-Option Synthesis** — Never settle on a single naive output. Always produce secondary verification: synthesize 2-3 validated options with distinct trade-offs (e.g. Pure Minimalist vs Frosted Glass Polymorphic vs Dynamic Bento).
3. **Evidence-Based Decision Briefs** — For UI, backend and architecture work, deliver a source-backed recommendation, alternatives, trade-offs and a visual wireframe or module/data-flow diagram before implementation when the user asked for inspiration or a new direction.
4. **Approval then execution** — If the user requested inspiration/options, wait for approval of the recommended direction before editing. After approval, proceed with scoped implementation and verification. For already-scoped fixes, do not add an unnecessary approval pause.

---

## 1. The 3-Phase Deep Search Protocol

```
+-------------------------------------------------------------------------------+
| PHASE 1: AUTONOMOUS INTENT DECOMPOSITION                                      |
| - Identify target aesthetic (Minimalism, Glassmorphism, Neomorphism, Brutalism)|
| - Identify domain constraints (Web, Flutter, Enterprise SaaS, Dashboard)     |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| PHASE 2: DEEP WEB & DESIGN RECONSTRUCTION                                     |
| - Autonomously search production references (Apple, Linear, Stripe, Vercel)  |
| - Extract exact physics & mathematical tokens:                                |
|   * Backdrop blur radii, specular reflection borders, refraction gradients     |
|   * Typography scale, letter-spacing, baseline grid (4px/8px)                  |
|   * Contrast ratios (WCAG AA/AAA compliance)                                   |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| PHASE 3: SECONDARY VERIFICATION & MULTI-OPTION MATRIX                         |
| - Synthesize Option A (Recommended), Option B (Alternative), Option C (Bold)  |
| - Present Visual ASCII Wireframe Blueprint                                    |
| - Await 1-click user confirmation before code generation                      |
+-------------------------------------------------------------------------------+
```

---

## 2. Deep Aesthetic Reference Catalog

When aesthetic keywords are detected, the agent autonomously retrieves these production-grade formulas:

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

When presenting the research results to the user, the agent outputs this format:

```
### Autonomous Deep Research: [Topic / Aesthetic]

#### Option A (Recommended): [Name, e.g., Modern Minimalist Pure]
- **Pros**: Blazing fast rendering, 100% WCAG AAA accessible, zero CPU blur overhead.
- **Key Tokens**: `border: 1px solid #E2E8F0`, `bg-white`, crisp typography.
- **Visual Wireframe**:
  +-----------------------------------------------------------+
  | [ SO-2026-001 ]  Customer: ACME Corp        Status: POSTED|
  +-----------------------------------------------------------+

#### Option B: [Name, e.g., Frosted Glass Polymorphic]
- **Pros**: Premium visual depth, tactile feel, modern macOS aesthetic.
- **Key Tokens**: `backdrop-blur-md`, `bg-white/70`, `border-white/20`, specular shadow.
- **Visual Wireframe**:
  +~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-+
  | (Frosted Surface) SO-2026-001  |  [ View Glass Modal ]    |
  +~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-+

*Aap in mein se kaunsa option prefer karte hain taake hum is contract ke mutabiq implementation start karein?*
```
