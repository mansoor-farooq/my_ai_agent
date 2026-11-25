---
name: ui-ux-pro-max
description: AI design intelligence layer providing 67 UI styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types, and 161 industry reasoning rules. Eliminates generic AI aesthetics and enforces production-grade design systems.
---

# UI UX Pro Max Skill — AI Design Intelligence Layer

A searchable, local design intelligence engine for AI coding assistants. Ground UI decisions in curated, evidence-based design standards rather than generic stochastic defaults.

---

## 1. Core Operating Philosophy
1. **Never Default to Generic AI Chrome:**
   - ❌ Never default to: Centered hero + 3 rounded cards + generic purple/indigo gradient + "→" on buttons.
   - ❌ Never use warm-clay Anthropic orange (`#D97757`) or generic SaaS grey cards with identical border radiuses.
   - ❌ Never put all labels in uppercase tracked-out monospace unless explicitly requested for retro/cyberpunk.
2. **Industry-Native Grounding:**
   - A medical or pharma interface must project clinical precision, calmness, and high WCAG AAA contrast.
   - An industrial ERP or logistics hub must prioritize data density, fast tabular scanning, keyboard navigation, and instant status recognition.
   - A luxury or retail platform must feature expressive editorial typography, generous whitespace, and tactile imagery.
3. **Persisted Design System (`--persist`):**
   - When requested or initialized on a project, output or update a repository-level design blueprint (`MASTER.md` or `DESIGN_SYSTEM.md`) recording tokens, font pairings, component scales, and interaction rules so subsequent sessions remain 100% visually coherent.

---

## 2. Catalog of 67 UI Styles (Highlights & Selection Matrix)

| Category | Styles Included | Best For | Visual Signatures |
| :--- | :--- | :--- | :--- |
| **Clean & Modern** | Minimalist Clean, Swiss Style, Flat 2.0, Linear Monochromatic, Nordic Scandi | SaaS, Dev Tools, Productivity | Generous negative space, tight type scale, 1px subtle borders (`border-slate-200 / border-slate-800`), zero clutter. |
| **High-Density Enterprise** | Bloomberg / Trading Desk, SAP Fiori Compact, Industrial SCADA, Tabular Master | ERP, Inventory, Warehousing, Supply Chain, Logistics | Dense data rows (32–36px height), monospace numeric alignment (`font-mono tabular-nums`), sticky headers, split-panes. |
| **Tactile & Dimensional** | Bento Grid, Skeuomorphic Modern, Neumorphic Soft, Claymorphism, Glassmorphism 2.0 | Dashboards, Portfolios, Consumer Hardware | Asymmetric grid tiles, subtle inner shadows (`inset 0 1px 0 rgba(255,255,255,0.1)`), backdrop blur (`backdrop-blur-md`), frosted glass accents. |
| **Expressive & Bold** | Neo-Brutalism, Editorial Magazine, Bauhaus Modern, Retro-Tech 90s, Cyberpunk HUD | Creator Tools, Marketing, Fashion, Web3 | High-contrast black outlines (`border-2 border-black`), offset hard drop shadows (`shadow-[4px_4px_0px_#000]`), bold display serifs. |
| **Ambient & Spatial** | Aurora Glow, Dark Mode OLED, Deep Space Indigo, Sunset Mesh | AI-Native interfaces, Streaming, Creative Studio | Radial gradient underlays (`bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]`), luminescent borders, subtle grain texture. |

---

## 3. Industry Reasoning Rules & Color Palettes (161 Profiles)

### Rule Selection Matrix by Product Sector:
1. **Industrial ERP, Inventory & Logistics (e.g. Maktro ERP):**
   - *Dominant Tones:* Slate Navy (`#0F172A`), Gunmetal (`#1E293B`), Off-White Canvas (`#F8FAFC`).
   - *Functional Accents:* Emerald Green (`#059669` for In-Stock/Positive), Amber Orange (`#D97706` for Low-Stock/Warning), Crimson Red (`#DC2626` for Out-of-Stock/Danger), Cobalt Blue (`#2563EB` for Actions).
   - *Typography:* Clean Geometric Sans (`Inter`, `Plus Jakarta Sans`, `Geist`) paired with high-legibility Monospace numbers (`JetBrains Mono`, `Roboto Mono`).
   - *Density:* Compact / High. Data tables must feature `whitespace-nowrap`, truncated text with tooltip, and sticky action columns.
2. **FinTech, Banking & Ledger:**
   - *Tones:* Deep Trust Navy (`#0A192F`), Forest Emerald (`#064E3B`), Crisp Silver (`#E2E8F0`).
   - *Contrast:* Strict WCAG AAA compliance on all numeric balances. Tabular numbers enabled everywhere (`tabular-nums font-mono`).
3. **Healthcare, Diagnostic & Pharma:**
   - *Tones:* Clinical Teal (`#0D9488`), Soft Cyan (`#E0F2FE`), Pure White (`#FFFFFF`), Slate Muted (`#64748B`).
   - *Vibe:* Low visual anxiety, high legibility, accessible status tags, clear confirmation modals before destructive clinical actions.
4. **Renewable Energy, Solar & Utilities:**
   - *Tones:* Sun Amber (`#F59E0B`), Clean Energy Green (`#10B981`), Tech Charcoal (`#1E293B`).
   - *Charts:* Real-time power generation curves, battery SOC gauges, solar irradiance sparklines.

---

## 4. Typography Pairing Engine (57 Curated Pairs)

1. **Enterprise Modern SaaS:** `Inter` (UI & Body) + `JetBrains Mono` (Data, SKUs, Currency, Code).
2. **Executive & Corporate:** `Plus Jakarta Sans` (Headings) + `Inter` (Body) + `Fira Code` (Metrics).
3. **Editorial & High-Value Brand:** `Playfair Display` or `Fraunces` (Headings) + `Source Sans 3` (Body).
4. **AI-Native & Next-Gen:** `Geist` (Headings & Body) + `Geist Mono` (Code & Metadata).
5. **Humanist & Approachable:** `Outfit` (Headings) + `Figtree` (Body).

---

## 5. 25 Chart & Data-Visualization Types

When recommending or implementing dashboards:
- **Time-Series Revenue/Sales:** Multi-line or Smooth Area Chart with dual Y-axis for volume vs value.
- **Stock & Inventory Distribution:** Stacked Bar Chart or Treemap for warehouse category breakdown.
- **Order Status Pipeline:** Stepped Funnel or Sankey Diagram (Draft &rarr; Confirmed &rarr; Dispatched &rarr; Delivered).
- **KPI Velocity:** Sparklines embedded inline inside summary metric cards with $\Delta\%$ week-over-week indicators.
- **Capacity & Targets:** Bullet Charts or Radial Half-Gauge (better than full pie charts for single metric thresholds).

---

## 6. 99 UX Best Practices & Anti-Pattern Filters

### 🚨 Critical Anti-Patterns to Prevent:
1. **The Empty-State Trap:** Never show a blank white page or empty table without an encouraging empty state illustration, clear explanation, and a direct primary CTA (e.g. "No products found. Add your first product").
2. **The Modal Overload:** Don't stack modal on top of modal. Use slide-over sheets (`Sheet` / Drawer) for complex sub-forms (e.g. Adding a customer while drafting a sales invoice).
3. **Unresponsive Mobile Tables:** Plain HTML tables break on mobile. Use responsive card-list transformations or horizontal scroll containers with visual shadow indicators.
4. **Low-Contrast Grey Text:** Never use `#94A3B8` or `#CBD5E1` for readable body text on white backgrounds. Always maintain minimum 4.5:1 contrast for regular text and 3:1 for large display text.
5. **Missing Keyboard Focus:** Never suppress `outline-none` without providing an explicit replacement `focus-visible:ring-2 focus-visible:ring-offset-2`.

---

## 7. Execution Commands & Workflow

When requested to build, reshape, or audit a UI:
1. **Analyze Industry & Persona:** Determine the business domain, primary user role, environment (warehouse floor, counter POS, executive office), and required data density.
2. **Apply Structured Tokens:** Formulate a consistent palette (Primary, Secondary, Accent, Neutral, Status), Typography scale, and Radius scale.
3. **Build Components:** Use semantic HTML5, accessible ARIA attributes, responsive layouts, and fluid transitions.
4. **Persist (Optional):** Save tokens and conventions into `MASTER.md` or `design-tokens.json` for persistent design memory across sessions.
