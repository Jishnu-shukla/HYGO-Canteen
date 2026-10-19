# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The foodservice team of a single hospital, working in the kitchen's real daily rhythm of meal slots and ward rounds. The incumbent role model names them:

- **Admin** — reaches everything and is the approver; the matrix exempts Admin and always answers "yes".
- **Kitchen Manager** — diet orders, kitchen schedule, dispatch and delivery, menus and recipes, plate waste, FSSAI checklist.
- **Supervisor** — the widest non-admin scope; clinical nutrition screens plus production, store, cafeteria and tables.
- **Dietitian** — assessments, diet plans, allergens, diet orders, recipes.
- **Nurse** — diet orders, meal dispatch and bedside delivery; requests diet changes rather than making them.
- **Store Keeper** — inventory, FSSAI checklist, and a "may be" say on master menu approval.
- **Cashier** — cafeteria bills and table orders.

Each user works from a shared operational record but sees only the screens and actions their role allows.

## Product Purpose

Run hospital inpatient catering in one system instead of paper and spreadsheets. The product covers the whole loop: nutritional assessment and diet plans, allergen and preference records, diet orders, kitchen production scheduling, meal dispatch, bedside delivery, master and daily menus, recipes, inventory with FIFO and expiry tracking, FSSAI hygiene checklists, plate-waste analytics, and the staff cafeteria with table orders and billing.

Success means the team stops keeping these records in registers and spreadsheets and runs the day from this app, without losing a step to the tool.

## Positioning

One shared record per patient and meal, carried across departments that previously kept separate books. Clinical nutrition, kitchen, store and cafeteria read and write the same record under role-scoped authority, so the diet order a dietitian writes is the one the kitchen schedules, dispatches, delivers and reconciles. A neighbouring product can copy an individual screen but not the single threaded record with an explicit approval model behind it.

## Operating Context

- Work is organised by **meal slots** and **wards**: kitchen schedule, dispatch, delivery, patient menus and waste analytics are all ward- and slot-aware.
- **Allergen restrictions and diet types are clinical inputs** to production, not preferences to be guessed at.
- **Inventory is FIFO with batch-level expiry tracking**, and it is the raw-material source that recipes draw from.
- **FSSAI hygiene checklist** is filed as a routine compliance act against a checklist, not a one-off audit.
- **Recipe creation** can pull detail from an external nutrition source (a server-side proxy to Spoonacular); inventory items are the local ingredient source.
- The **cafeteria** is a separate service from inpatient catering: table registration with QR self-order, a transaction/settle flow, and printed KOT (kitchen order ticket) snapshots.
- **No authentication exists yet.** A header role picker sets the active role, and `DEFAULT_ROLE` is `Admin`; the sidebar and `RoleGuard` read the same `Roles.ts` matrix so navigation and access cannot disagree.
- Data reaches the app over HTTP through one environment-configured base URL (`NEXT_PUBLIC_API_BASE_URL`), read at build time; a shared dev tunnel is the fallback when unset.

## Capabilities and Constraints

**Confirmed:**
- Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, ESLint 9 flat config; path alias `@/*` → project root.
- `NEXT_PUBLIC_` prefix is required on the API variable because `data/*/api.ts` modules are imported by client components and inlined into the browser bundle at build time.
- A real backend API exists; the app is the client of live contracts, not local fixtures.
- Authority is a data-driven matrix, not logic: `ROLE_ACCESS` (screen level) and `ROLE_ACTIONS` (action level) with `yes` / `may be` / `request` / `no`. Admin is exempt and always "yes"; a blank cell means "no".
- `request` currently grants nothing — `can()` answers false until an approval flow exists.
- Routing and navigation are declared once in `routes.ts`; a new screen is `app/<path>/page.tsx` plus a route entry.
- No test framework is configured.
- `deleteInventoryItemApi` uses HTTP PUT, not DELETE, by backend expectation.
- `reactStrictMode` is `false`.

**Open / undecided (do not invent):**
- Whether FSSAI checklist items reflect a binding regulatory obligation or an internal standard.
- Whether the incumbent naming ("CANTEEN MANAGEMENT", "Kitchen & Nutrition Hub") and the orange brand are committed or placeholder.
- Whether the approval flow implied by `request` will be built, and in what shape.
- Deployment target and hosting environment.

## Evidence on Hand

- **Real API**: `data/apiBaseUrl.ts` and `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`); a deployed backend behind the dev tunnel. `data/*/api.ts` modules are the contract surface per resource.
- **Role and route source of truth**: `Roles.ts` (roles, access matrix, permission semantics) and `routes.ts` (sidebar hierarchy, sections, route descriptions).
- **Mock/fallback data for development**: `data/Inventory/dummyData.ts`. This is a development fallback, not a claim about production content.

**Absences future work must not fabricate:**
- No testimonials, customers, case studies, press, benchmarks, pricing, SLAs, or named hospitals exist.
- Real patient data is not confirmed to be present; treat patient identifiers accordingly until the product owner says otherwise.
- No logo or brand asset files were found.

## Product Principles

1. **The register is the competitor.** A screen earns its place only by being clearly faster, safer or clearer than the paper or spreadsheet habit it replaces.
2. **One record, many departments.** Clinical nutrition, kitchen, store and cafeteria share the same patient-meal record; no screen invents a parallel copy of a fact another screen owns.
3. **Authority is explicit and declared once.** Who may act, who must request, and who approves comes from the shared matrix — never from ad-hoc checks scattered across a screen.
4. **Follow the kitchen's clock.** Organise around meal slots and wards, the units the team already thinks and works in.
5. **The backend is the truth.** Show what the API returns; do not invent data, and surface failure honestly rather than filling the gap.
