@AGENTS.md

# Multi-trade platform architecture

Clearview Electrical Group is built electrical-specific today, but is architected so that other trades (plumbing, etc.) could eventually be added as separate products sharing a common core. This is a standing structural principle, not a roadmap item — **do not build any plumbing functionality now**, and do not build a generic label/theming/i18n system to make the UI "trade-neutral." The UI, copy, and terminology stay fully electrical-specific.

## CORE (trade-agnostic — must never gain trade-specific columns or logic)

- `customers`, `contacts`
- `properties` — general info only: address, GPS, type, status
- `jobs` — status/workflow, quote/invoice linkage
- `job_visits`
- `quotes`, `invoices`, `payments`
- `documents` — generic types only
- staff/users/roles
- financial reporting

## TRADE MODULES (electrical-only for now)

Trade-specific data lives in its own tables, linked to the core via foreign keys — never as columns bolted onto a core table. Existing and planned examples:

- `property_electrical` — already correctly separated from `properties`. Keep this pattern for any new trade-specific property data.
- Materials Catalogue (`generic_materials` / `catalogue_products`) — the schema itself is trade-agnostic; only seed data should ever say "electrical."
- Future testing/compliance/certificate features — build as their own module tables, not as columns on `jobs` or `properties`.

## Why this matters

Keeping trade-specific data out of core tables means a future plumbing product is a matter of adding new modules, not restructuring the core. When adding any new feature, ask: is this concept universal across trades (core) or specific to electrical work (module)? When in doubt, build it as a module linked by FK rather than widening a core table.
