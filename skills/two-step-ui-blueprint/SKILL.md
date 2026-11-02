---
name: two-step-ui-blueprint
description: Two-step UI discovery and visual blueprint verification skill. Prohibits generating code blindly after a search; generates an interactive visual wireframe, ASCII UI blueprint, or Mermaid layout spec for user visual verification before touching source code.
---

# Two-Step UI Discovery & Visual Blueprint Verification

Use this skill whenever building, redesigning, or modifying user interfaces (web portals, dashboards, mobile/Flutter screens, tables, forms, or ERP interfaces).

## The Core Problem

When an agent searches for UI inspiration or references, it typically jumps directly into generating hundreds of lines of code. The user cannot see what the interface will look like until after the code is injected, causing frustrating trial-and-error cycles, broken layouts, and discarded work.

## The Two-Step Verification Invariant

**NO UI CODE SHALL BE WRITTEN UNTIL STEP 2 (VISUAL BLUEPRINT) IS PRESENTED AND APPROVED.**

---

## The Workflow

### Step 1: Discovery & Reference Search (Two-Step Search)

1. **Sub-Step 1A (Intent & Pattern Search)**:
   - Identify the user flow (e.g., Order Entry, Ledger Reconciliation, Inventory Reorder, Analytics Dashboard).
   - Search for industry benchmarks (e.g. SAP Fiori Horizon, ERPNext Desk, Stripe Dashboard, Linear).
2. **Sub-Step 1B (Contract & Component Mapping)**:
   - Reconstruct the data contract: What fields must be displayed? What actions exist (Create, Edit, Post, Cancel, Export)?
   - Identify density requirements (Compact ERP data grid vs. high-breathing marketing layout).

### Step 2: Visual Wireframe Blueprint Generation (Visual Verification Gate)

Before writing any HTML, CSS, Tailwind, or Flutter code, the agent MUST output a **Visual UI Blueprint** in the chat. The blueprint must contain:

#### 1. Visual Layout Wireframe (ASCII / Box Diagram)
Provide a clear, high-fidelity visual representation of the viewport:

```
+------------------------------------------------------------------------------------+
|  [Logo] ERP Nexus | Sales Orders > SO-2026-0891              [Search...] [Admin v] |
+------------------------------------------------------------------------------------+
| [Summary Cards]                                                                    |
|  +--------------------+ +--------------------+ +--------------------+              |
|  | Total Net Value    | | Delivery Status    | | Payment Status     |              |
|  | $148,250.00 USD    | | PARTIALLY SHIPPED  | | UNPAID (Due 15d)   |              |
|  +--------------------+ +--------------------+ +--------------------+              |
+------------------------------------------------------------------------------------+
| [Action Bar] [ + Add Item ] [ Post Document ] [ Print PDF ]             [ Filter v]|
+------------------------------------------------------------------------------------+
| Line Item Table                                                                    |
| [#]  [Item Code]     [Description]       [Qty]  [UoM]  [Unit Price]  [Total USD]   |
| 01   MAT-10029       Ball Bearing 50mm   500    EA     $42.00        $21,000.00    |
| 02   MAT-40912       Hydraulic Seal      1,200  EA     $18.50        $22,200.00    |
+------------------------------------------------------------------------------------+
| [Drawer / Split View on Select] -> Shows Item Tax, Batch No, and Warehouse Stock   |
+------------------------------------------------------------------------------------+
```

#### 2. Layout & Responsive State Matrix
| Breakpoint | Header Behavior | Table / Grid Behavior | Navigation / Actions |
| :--- | :--- | :--- | :--- |
| **Desktop (>1280px)** | Full sticky bar with search | Dense multi-column table with frozen header | Top action buttons + side filter panel |
| **Tablet (768-1279px)**| Compact header | Horizontally scrollable card table | Overflow action menu (`...`) |
| **Mobile (<768px)** | Collapsed app bar | Stacked card list with swipe actions | Bottom fixed action bar + drawer |

#### 3. State Behavior Definitions
- **Loading State**: Skeleton placeholders matching exact row dimensions (no shifting layout).
- **Empty State**: Explanatory illustration + clear primary CTA ("Create your first order").
- **Error State**: Inline banner with actionable retry button and exact error details.

---

## Verification Gate with the User

After presenting the Visual Blueprint, end with:

> *"Maine visual blueprint aur layout wireframe upar render kiya hai. Kya ye visual design, spacing, aur actions aapki expectation ke mutabiq hain, ya isme koi button, column, ya visual placement change karna hai? Please approve karein taake hum implementation code start karein."*
