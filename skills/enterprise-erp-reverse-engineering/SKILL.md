---
name: enterprise-erp-reverse-engineering
description: Enterprise ERP and database reverse engineering skill. Analyzes SAP (S/4HANA OData, tables BKPF, BSEG, MARA, MARC, VBAK, VBAP), ERPNext DocTypes, ledger double-entry invariants, and business flows before building custom SaaS, ERP, or portal backends.
---

# Enterprise ERP & Database Reverse Engineering

Use this skill when designing or reverse engineering enterprise systems, ERP applications (e.g., SAP, ERPNext, Odoo, NetSuite), complex multi-tenant database schemas, or financial/inventory/order workflows.

## Core Philosophy

1. **Enterprise Grounding over Guesswork** — Do not invent proprietary database schemas or order workflows from scratch when industry standards (SAP, ERPNext) have battle-tested architectures refined over decades.
2. **Double-Entry & Immutability First** — Financial and stock movements MUST never be updated via raw SQL `UPDATE`. They must be modeled as immutable ledger transactions (`GL Entry`, `Stock Ledger Entry`, `BKPF`/`BSEG`) with offsetting debit/credit or in/out entries.
3. **Zero Live Mutation Risk** — Reverse engineer from static schemas, OData metadata ($metadata), DocType JSON definitions, or read-only staging mocks. Never trigger write operations against live client production databases or live SAP endpoints without authorization.

---

## 1. Enterprise Reference Architecture Standards

### A. SAP S/4HANA Core Entities & Relationships

| Domain | Core Table / CDS View | Purpose | Key Foreign Keys & Invariants |
| :--- | :--- | :--- | :--- |
| **FI (Financials)** | `BKPF` | Accounting Document Header | `BUKRS` (Company Code), `BELNR` (Doc No), `GJAHR` (Fiscal Year) |
| **FI (Financials)** | `BSEG` | Accounting Document Segment (Lines) | `BUKRS`, `BELNR`, `GJAHR`, `BUZEI` (Line). Invariant: $\sum \text{Debit} = \sum \text{Credit}$ |
| **SD (Sales & Dist)** | `VBAK` | Sales Order Header | `VBELN` (Sales Doc), `VKORG` (Sales Org), `KUNNR` (Customer) |
| **SD (Sales & Dist)** | `VBAP` | Sales Order Item | `VBELN`, `POSNR` (Item No), `MATNR` (Material), `NETPR` (Price) |
| **SD (Billing)** | `VBRK` / `VBRP` | Billing Document Header / Items | References `VBELN` from SD; generates corresponding `BKPF`/`BSEG` entries |
| **MM (Materials)** | `MARA` | General Material Master | `MATNR` (Material ID), `MTART` (Material Type), Base UoM |
| **MM (Plant Data)** | `MARC` | Plant-Level Material Master | `MATNR`, `WERKS` (Plant ID), Valuation & Reorder levels |
| **MM (Procurement)**| `EKKO` / `EKPO` | Purchase Order Header / Items | `EBELN` (PO No), `EBELP` (Line), `LIFNR` (Vendor) |
| **MM (Inventory)** | `MSEG` / `MKPF` | Material Document (Stock Movements)| Immutable movement records; links Goods Receipt (`101`) to PO and GL |

### B. ERPNext DocType Standards & Controller Flow

1. **DocStatus Life-Cycle**:
   - `0 = Draft`: Editable, unposted, no ledger impact.
   - `1 = Submitted`: Immutable, posted to General Ledger and Stock Ledger. Cancellable only via formal cancellation flow.
   - `2 = Cancelled`: Voided; creates automatic reversing ledger entries if previously submitted.
2. **Master-Detail Decomposition**:
   - Parent DocType holds transactional metadata (Currency, Customer/Supplier, Posting Date, Taxes, Totals).
   - Child Table holds line items (`items`, `taxes`, `payment_schedule`). Always enforce explicit foreign key cascades.
3. **Ledger Invariants**:
   - Every transactional document touching money must post to `tabGL Entry` (`voucher_type`, `voucher_no`, `account`, `debit`, `credit`).
   - Every transactional document touching inventory must post to `tabStock Ledger Entry` (`item_code`, `warehouse`, `actual_qty`, `stock_value_difference`).

---

## 2. Two-Step Reverse Engineering Protocol

When asked to build an ERP feature or reverse-engineer an enterprise flow:

```
Step 1: DISCOVER & EXTRACT (Static Schema & Contract Mapping)
  - Inspect OData metadata XML, Prisma/TypeORM/SQL migrations, or ERP JSON models.
  - Map primary keys, compound keys, constraints, and audit columns (created_at, created_by, updated_at, version/etag).
  - Identify transaction boundaries and state machine transitions (Draft -> Confirmed -> Shipped -> Invoiced).

Step 2: ENTERPRISE VALIDATION & BLUEPRINT CONFIRMATION
  - Compare the proposed schema against SAP/ERPNext industry benchmarks.
  - Verify edge cases: Multi-currency exchange rate drift, rounding cents, partial fulfillments, reverse cancellations, and audit trails.
  - Return a structured Schema Blueprint & Entity-Relationship Model (Mermaid ERD) to the Architecture Lead and User.
```

---

## 3. Standard Bounded Context Checklist

Before handing off the schema to the Builder or UI Specialist, ensure these 6 invariants are verified:

1. **Multi-Tenancy & Org Isolation**: Does every query and table index filter by `organization_id` or `tenant_id`?
2. **Concurrency & Idempotency**: Are financial and order submissions protected by unique idempotency keys (`idempotency_token`) and optimistic locking (`version` / `row_version`)?
3. **Decimal Precision**: Are monetary amounts stored in `DECIMAL(18, 4)` or `DECIMAL(19, 4)` (never floating point `FLOAT` or `DOUBLE`)?
4. **Audit Trail**: Does every record track mutation provenance (`created_by`, `updated_by`, `deleted_at` for soft deletes)?
5. **State Machine Integrity**: Can a document transition backwards illegally (e.g. Invoiced back to Draft)? (Disallowed).
6. **Cancellation Semantics**: How are voids handled? (By compensatory reverse entries, never raw deletion).
