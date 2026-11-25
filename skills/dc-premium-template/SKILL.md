---
name: dc-premium-template
description: Transforms enterprise Razor, ASP.NET MVC, React, and web UI into a light premium theme matching DC Confirmation Report while strictly preserving existing controller contracts, forms, model bindings, tokens, and business logic.
license: MIT
---

# DC Premium Template & Safe UI Preservation

Follow this skill when designing or modernizing enterprise web screens into a light premium theme, adhering strictly to the user invariant: **"Pehle current views/controller ka structure check karunga, phir sirf UI styling/layout update karunga; user creation logic / business logic preserve rahegi."**

## Core Protocol

1. **Pre-flight Inspection (Read-Only)**
   - Always read the underlying controller, action methods, ViewModel/Model, and form routes first.
   - Note down all form POST targets, hidden input names (`RecordId`, `customercode`, etc.), CSRF tokens (`@Html.AntiForgeryToken()`), and validation scripts.
   - Never mutate or delete backend logic, parameter names, or controller actions during a UI refresh.

2. **DC Confirmation Light Premium Design System**
   - **Page Background:** Soft subtle tint `linear-gradient(135deg, #eef5f7 0%, #f8fbfc 52%, #e9f2f5 100%)`.
   - **Header Banner (`.order-header` / `.user-header`):**
     - Rounded card: `border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(235,247,248,.94));`
     - Left accent border: `border-left: 4px solid #2f8f8a; box-shadow: 0 4px 16px rgba(35,67,88,.05);`
     - Title: `color: #18384f; font-weight: 750; font-size: 1.25rem; display: flex; align-items: center; gap: .6rem;` with icon `#2f8f8a`.
   - **Filter Card (`.filter-form`):**
     - Card: `border: 1px solid #d7e3ea; border-radius: 18px; background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(244,249,251,.96)); box-shadow: 0 14px 34px rgba(35,67,88,.07); padding: 1.2rem;`
     - Clean uppercase labels: `color: #4b6679; font-weight: 650; font-size: .72rem; letter-spacing: .02em;`
     - Inputs: `height: 38px; border: 1px solid #d3e0e7; border-radius: 10px; background: #fbfdfe; color: #26465b;`
     - Filter button: `background: linear-gradient(135deg, #e7f1f6 0%, #dcecea 100%); border: 1px solid #b8d0da; color: #183b52; border-radius: 10px; font-weight: 700;`
   - **Data Table (`.dc-report-scroll` & `.order-table`):**
     - Container: `border: 1px solid #d5e2e8; border-radius: 18px; background: #fbfdfe; box-shadow: 0 16px 36px rgba(33,67,88,.08); max-height: min(65vh, 680px); overflow: auto; thin scrollbar;`
     - Row 1 Sticky Headers:
       `background: linear-gradient(135deg, #edf5f9 0%, #dcebec 100%) !important; color: #18384f !important; font-weight: 750 !important; font-size: .72rem; letter-spacing: .025em; text-transform: uppercase; border-bottom: 1px solid #c4d9e2; border-right: 1px solid rgba(109,145,160,.18);`
     - Row 2 Column Filter Row:
       `background: linear-gradient(180deg, #f7fafc 0%, #eef4f6 100%) !important; box-shadow: inset 0 -1px 0 #d9e5ea;`
       Inputs: `.column-filter-input` (`height: 30px; border-radius: 8px; border: 1px solid #d3e0e6; background: rgba(255,255,255,.96); color: #26465b; font-size: .68rem;`)
     - Floating Date Picker: Day & Month picker popup for date column filtering.
     - Rows: Zebra styling (`#ffffff` and `#f5f8fa`, hover `#eaf3f5`, text `#36556a`).
   - **Action Buttons (Pill Outline):**
     - Details: `border: 1px solid #a8c8d4; background: #f6fbfc; color: #285f76; border-radius: 999px; font-size: .68rem; font-weight: 650;`
     - Post / Approve: `border: 1px solid #a3d9a5; background: #f4faf4; color: #2e7d32; border-radius: 999px; font-size: .68rem; font-weight: 650;`
     - Cancel / Reject: `border: 1px solid #f5b7b1; background: #fdf5f5; color: #c62828; border-radius: 999px; font-size: .68rem; font-weight: 650;`
   - **Pagination Card (`.dc-pagination`):**
     - `border: 1px solid #d9e8ed; border-radius: 14px; background: rgba(255,255,255,.95); padding: .75rem 1rem; color: #6f8796; font-size: .72rem; font-weight: 600; box-shadow: 0 4px 14px rgba(35,67,88,.04);`
     - Summary count on left, size selector and previous/next page actions on right.
   - **Form Card Layout (User Creation & Settings):**
     - Two-column grid (`.user-create-shell`): Left card for form inputs (`user-form`), Right card for security/guidance aside (`user-create-aside`) with soft gradient `#edf5f9` to `#dcebec` and circular watermark overlay.

3. **Verification**
   - Check compilation and Razor syntax.
   - Review git diff to ensure only visual layout/styles changed and no contract boundary or handler was disrupted.
