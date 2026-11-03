---
name: workflow-data-contracts
description: Use when a workflow reads or writes database records, passes data between steps/services, displays operational data, or exposes an API or event contract.
---

# Workflow Data Contracts

Make every step's data source and write responsibility explicit.

## Procedure

1. Trace existing schema, API and authorization paths before adding a model. Identify the authoritative owner for each field.
2. Define typed inputs/outputs, required versus nullable fields, units, timestamps/time zones, identifiers, versions and error shape.
3. For each step, state which records it reads, inserts, updates or emits; define transaction boundaries and unique constraints.
4. Preserve tenant/user scope in every query and command. Validate authorization at the service boundary, not only in UI.
5. Use migrations and compatibility rules for persisted contracts. Version event/API payloads when producers and consumers can deploy separately.
6. Never use hard-coded or fabricated records as production data. Fixtures belong only in clearly isolated tests or prototypes.

Deliver an entity/step ownership map and example payloads derived from actual fields. Label proposed fields as proposed; do not imply that they already exist.
