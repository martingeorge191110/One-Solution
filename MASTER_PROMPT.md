# ONE SOLUTIONS — Finishing-Operations Management System · Master Build Prompt

> Paste this whole document into a fresh Claude/Claude-Code conversation. It is the
> complete, authoritative specification for building the system from scratch. Build
> it incrementally (see **§13 Delivery Plan**), confirm each phase, and keep the
> business rules in **§4–§7** exact — they are the financial heart of the product.

---

## 1. Context & Goal

**ONE SOLUTIONS** is a company doing **finishing operations** for real estate units
(flats, houses, etc.) — plumbing, electrical, gypsum, painting, flooring, aluminum,
and so on. This is an **internal operations tool** (not a public product) to organize
work: manage **clients**, their **projects**, send **quotations**, activate projects on
approval, record **client payments**, log **daily purchases/operations**, and produce
**PDF reports** (daily logs + final invoice). It is **small and simple in scope but
detail-critical** — every entity gets a focused dashboard with useful **KPIs** and
**alerts**. The app is **mobile-first**, fully **responsive**, **bilingual (Arabic
primary / English secondary)**, **RTL by default**, and built to **expand later**.

A real sample quotation PDF exists (`BanafsegAprt_Quotation.pdf`) — the company's
branding is the gold "ONE / SOLUTIONS" logo, Arabic RTL tables with black/grey section
headers, EGP (ج) amounts. We will build something **far more polished** than that
sample, but it shows the visual language and the quotation structure expected.

---

## 2. Tech Stack (locked)

**Backend** — the heavy business logic lives here:
- **NestJS** (TypeScript) + **Prisma ORM** + **PostgreSQL**
- Auth: **JWT** in **httpOnly cookies** (access + refresh), **bcrypt** password hashing
- Validation: `class-validator` / `class-transformer` (DTOs) — mirror with zod on the client
- Structure: feature modules (`auth`, `users`, `clients`, `projects`, `system-data`,
  `quotations`, `payments`, `daily-logs`, `reports`, `audit`, `dashboard`)
- A dedicated **Audit module** + Prisma middleware/interceptor that records every
  write (create/update/delete) — never reads.

**Frontend** — Next.js consuming the API (frontend-only, no server DB access):
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4**
- UI: **Radix UI primitives (shadcn-style)** + **lucide-react** icons + **framer-motion**
  + **sonner** toasts
- Data: **@tanstack/react-query** + **@tanstack/react-table**
- Forms: **react-hook-form** + **zod**
- Charts (KPIs): **recharts**
- i18n / RTL: **next-intl** — **Arabic default + `dir="rtl"`**, English toggle (`dir="ltr"`)
- PDF: **jsPDF + jspdf-autotable + Amiri font**, generated **client-side** after
  fetching data from the API (this is a hard requirement — PDFs are built on the client).

**Infra**: **Docker Compose** — `postgres` + `api` (NestJS) + `web` (Next.js). Provide
`.env.example` for both services and a single `docker-compose.yml`.

**Reference design** to match in look & feel and PDF quality: the Gendy_ORG `web/`
project — Tailwind v4 + Radix, a `brand.config.ts` single-source-of-truth for brand
tokens, and `lib/finance/report-pdf.ts` for the branded jsPDF chrome (logo header,
paginated footer, Amiri Arabic rendering, executive-summary boxes, autotable styling).
Reuse that PDF approach. **Do NOT** copy Gendy's brand colors — use ONE SOLUTIONS gold
branding (see §11).

---

## 3. Bilingual / Localization Rules

- **Arabic is the primary language**, app **defaults to Arabic + RTL**. English is a
  toggle (LTR). All UI chrome (labels, menus, buttons, validation messages, toasts)
  fully translated via next-intl.
- **Data records are bilingual**: Terms, Items, and Terms&Conditions store an **Arabic
  value (required)** and an **English value (optional)**. Display the user's chosen
  language, falling back to Arabic when English is empty.
- Currency is **EGP**, displayed as **ج** in Arabic contexts. Format numbers with
  thousands separators (e.g. `1,055,000 ج`).
- Dates: store UTC, display in **Africa/Cairo**. Arabic and English date formatting.
- The **quotation PDF and report PDFs are Arabic-first RTL** (matching the sample).

---

## 4. Domain Model (entities, fields, relationships)

All tables include: `id` (uuid), `createdAt`, `updatedAt`, and audit linkage
(`createdById`, `updatedById`) where applicable. Use soft-delete (`deletedAt`,
`deletedById`) for the main business entities so deletions are recoverable and auditable.

### 4.1 User
- `id`, `name`, `email` (unique), `passwordHash`, `role` (`SUPER_ADMIN` | `ADMIN`),
  `isActive`, `lastLoginAt`, timestamps.
- **No self-signup.** Super admin creates/edits/deactivates users.
- `SUPER_ADMIN`: full control over admins + sees the **audit trail**. `ADMIN`: full
  operational access (clients/projects/quotations/payments/logs/reports) but **cannot**
  manage users or view the audit trail.

### 4.2 Client
- `id`, `name` (req), `phone`, `email`, `address`, `notes`, timestamps + audit.
- Has many **Projects**.

### 4.3 Project
- `id`, `clientId` (FK), `name` (req), `location`, `unitType` (flat/house/…), `description`,
  `supervisionPercent` (decimal, e.g. `22.00` — **per project**),
  `status` (`DRAFT` | `ACTIVE` | `COMPLETED` | `CANCELLED`),
  `activatedAt` (set when its quotation is approved), timestamps + audit.
- Has one (or a history of) **Quotation(s)**, many **Payments**, many **Daily Logs**,
  and **alert threshold** settings (see §4.7 / §7).
- A project becomes **ACTIVE** only when a quotation is **approved** (§5).

### 4.4 System Data (global, constant across all projects)
- **Term (بند)**: `id`, `nameAr` (req), `nameEn`, `description`, `order`, `isActive`,
  timestamps + audit. Has many Items.
- **Item / Sub-term**: `id`, `termId` (FK), `nameAr` (req), `nameEn`, `defaultUnit`
  (e.g. m², م.ط, piece — optional), `order`, `isActive`, timestamps + audit.
- **TermsAndConditions entry**: `id`, `titleAr`, `titleEn`, `bodyAr` (req), `bodyEn`,
  `order`, `isActive`, timestamps + audit. (Selectable via dropdown in the quotation
  builder; pure reusable text.)
- **AlertThreshold config** (see §7): defined in System Data, `type`
  (`REMAINING_OPERATIONAL_LOW`), `mode` (`AMOUNT` | `PERCENT`), `value`, scope
  (global default and/or per-project override). Keep extensible for future alert types.

> Items belong to Terms. **Quotations use Terms only — never Items.** Items appear only
> in **Daily Logs** and the **Final Invoice**.

### 4.5 Quotation (per project; built from TERMS only)
- `id`, `projectId` (FK), `quotationNumber` (auto), `date`,
  `status` (`DRAFT` | `APPROVED` | `REJECTED`),
  `supervisionPercent` (snapshot of the project's % at build time),
  `subtotal` (sum of line totals), `supervisionAmount`, `grandTotal`
  (= subtotal × (1 + supervisionPercent/100)),
  `notes` (free-text, multiline — a **variable** input, not a dropdown),
  `approvedAt`, `approvedById`, timestamps + audit.
- **QuotationLine**: `id`, `quotationId` (FK), `termId` (FK), `order`,
  `pricingMode` (`UNIT` | `LUMP_SUM`),
  - if `UNIT`: `unit` (text, e.g. m²), `quantity`, `unitPrice`, `lineTotal = quantity × unitPrice`
  - if `LUMP_SUM` (مقطوعة): `lineTotal` entered directly; quantity/unitPrice null
  - optional per-line `descriptionAr` / `descriptionEn` override (the sample shows rich
    multi-line descriptions per term).
- **QuotationCondition** (join): selected TermsAndConditions entries (snapshot of text so
  later edits to System Data don't mutate an approved quotation).
- Actions: **Save as Draft** (creates quotation, project stays DRAFT), **Print PDF**
  (client-side, see §8), **Approve** (→ sets quotation APPROVED **and** activates the
  project: `Project.status = ACTIVE`, `activatedAt = now`). Optionally **Reject**.

### 4.6 Payment (after project is ACTIVE)
- `id`, `projectId` (FK), `amount` (req), `paidAt` (date the money was received, req),
  `method` (cash/transfer/cheque — optional), `reference`, `notes`,
  **auto-computed & stored** at create/update time:
  - `operationalAmount` = `amount / (1 + supervisionPercent/100)`
  - `supervisionAmount` = `amount − operationalAmount`
  using the **project's `supervisionPercent`** (snapshot the % onto the payment so later
  % changes don't silently rewrite history).
- Full **CRUD**. Each save recomputes the split. See §6 for the exact formula.

### 4.7 Daily Log (after project is ACTIVE)
- A **day can have many logs**. Two kinds of entries:
- **DailyLog (term/item entry)**: `id`, `projectId` (FK), `logDate` (req),
  `termId` (FK), `itemId` (FK, must belong to termId), `quantity`, `unit`,
  `unitPrice` (optional), `amount` (req — total spent on this entry), `notes`,
  timestamps + audit.
- **Additional entry**: same table with `isAdditional = true` and **no term/item** —
  instead a free-text `additionalNameAr` / `additionalNameEn` (something discovered on
  site, outside the quotation). Still has `quantity`, `unit`, `amount`, `notes`.
- UI: pick **Term** (dropdown) → then **Item** (dropdown filtered by term) → quantity +
  amount. A toggle/path for **Additional** entries that skips term/item.

### 4.8 AuditLog
- `id`, `actorId` (user), `action` (`CREATE` | `UPDATE` | `DELETE`),
  `entity` (table name), `entityId`, `before` (json, for update/delete), `after` (json,
  for create/update), `createdAt`. Visible to **SUPER_ADMIN only**.

---

## 5. Project / Quotation Lifecycle

```
Client created
   └─ Project created (status = DRAFT, supervisionPercent set)
        └─ Quotation built from Terms (Save as Draft)  ── Print PDF anytime
             └─ Approve quotation ──> Project status = ACTIVE (activatedAt set)
                  ├─ record Payments (CRUD, auto-split)
                  ├─ record Daily Logs (term/item entries + additionals)
                  └─ generate PDFs: Daily Logs report, Final Invoice
                       └─ Project status = COMPLETED (manual) / CANCELLED
```

- Payments and Daily Logs are **only allowed when the project is ACTIVE** (guard this in
  the backend).
- Approving a quotation is the single event that activates the project.

---

## 6. Financial Rules (EXACT — do not improvise)

Let `S` = project `supervisionPercent` (e.g. 22), `f = 1 + S/100` (e.g. 1.22).

**Quotation total** (markup on top of the priced work):
```
subtotal          = Σ line totals
supervisionAmount = subtotal × (S/100)
grandTotal        = subtotal + supervisionAmount  = subtotal × f
```
(Sample: subtotal 865,000 + 22% = 1,055,000.)

**Payment split (markup-consistent — LOCKED):**
```
operationalAmount = amount / f
supervisionAmount = amount − operationalAmount   ( = amount × (S/100) / f )
```
Example: payment 12,000 at S=20 (f=1.20) → operational = 10,000, supervision = 2,000.
This guarantees that when the client has fully paid, total payments reconcile to the
final invoice (cost × f). Snapshot `S` onto each payment.

**Final Invoice math:**
```
For each Term: itemTotals = Σ amount of all DailyLog entries for that item
               (rolled up per item — NOT day-by-day), termTotal = Σ its item totals
totalSpent      = Σ all term totals + Σ all additionals           (operational cost)
supervisionFee  = totalSpent × (S/100)
invoiceTotal    = totalSpent + supervisionFee  = totalSpent × f
```
The Final Invoice shows per-term tables (items rolled up to per-item totals), a separate
**Additionals** table, the grand total spent, the supervision line, and the final total.

**Remaining operational balance (drives the alert, §7):**
```
collectedOperational = Σ payments.operationalAmount
spentOperational     = Σ daily-log amounts (term/item + additionals)
remainingOperational = collectedOperational − spentOperational
```

---

## 7. KPIs & Alerts (every dashboard)

Each entity page (client, project, payment list, daily-log list, system-data) shows a
**KPI strip** + relevant **alerts**. Examples (build these, add more where useful):

**Project dashboard KPIs:** quotation grand total, total collected, total spent,
remaining operational balance, our supervision earned-to-date, % of work paid,
# payments, # daily-log entries, last payment date, project age.

**Client dashboard KPIs:** # projects, # active projects, total collected across
projects, total outstanding, total supervision earned.

**Global/home dashboard KPIs:** # clients, # active projects, total collected this
month, total supervision earned this month, projects with active alerts.

**Alert — `REMAINING_OPERATIONAL_LOW` (LOCKED trigger):**
- Configured in **System Data** as `AMOUNT` or `PERCENT` (global default, per-project
  override allowed).
- Fires when `remainingOperational` ≤ threshold:
  - `AMOUNT` mode: `remainingOperational ≤ value`
  - `PERCENT` mode: `remainingOperational ≤ (value/100) × collectedOperational`
    (or × quotation grandTotal — make the basis explicit and configurable).
- Message (AR/EN): "Operational funds for **{project}** are low (remaining {X} ج). Call
  the client to collect another payment." Surface on the project dashboard and the
  global dashboard's alert list. Keep the alert system **extensible** for future types.

---

## 8. PDF Generation (client-side, jsPDF + Amiri, Arabic RTL)

Build a shared branded PDF layout module (port Gendy's `report-pdf.ts` pattern): lazy-load
jsPDF + jspdf-autotable + the Amiri font + the ONE SOLUTIONS logo only at export time.
Arabic cells render in Amiri (Helvetica has no Arabic glyphs); Latin stays Helvetica.
Branded chrome: logo header, document meta (date/project/client/subject), section headers
(black/grey bands like the sample), autotable bodies, totals rows, paginated footer.

Three documents:

1. **Quotation PDF** — matches the sample structure: header (date, project, location,
   subject), greeting line, **per-section term tables** with columns
   `الإجمالي | سعر الوحدة | الكمية | الوحدة | البند | #` (right-to-left), per-section
   subtotal rows, the grand subtotal, the **"الإجمالي بعد إضافة الإشراف %"** line, then
   the selected **Terms & Conditions** text and the free-text **Notes**.
2. **Daily Logs report PDF** — user picks a **date range**; lists daily-log entries in
   that range (term, item, quantity, unit, amount, date) + additionals + totals.
3. **Final Invoice PDF** — per §6: per-term tables with items **rolled up to per-item
   totals** (not day-by-day), term totals, additionals table, total spent, supervision
   line, final total.

**Reports must NEVER show "created by / updated by"** — audit identity stays out of all
client-facing PDFs. (Audit is internal, super-admin only.)

---

## 9. Auth, Roles & Permissions

- Login with email + password; JWT access + refresh in **httpOnly cookies**; bcrypt.
- **SUPER_ADMIN**: everything, including **user management** (create/edit/deactivate
  admins) and **viewing the audit trail**.
- **ADMIN**: all operational features; **no** user management, **no** audit trail.
- Guard every backend route by role. Frontend hides/disables what the role can't use.
- Seed one initial super admin via env-configured credentials / a seed script.

---

## 10. Audit Trail

- Record **every write** (CREATE / UPDATE / DELETE) across business entities with
  actor, timestamp, entity, entityId, and before/after JSON. **Reads are not audited.**
- Implement via a Prisma middleware/Nest interceptor so it's automatic and consistent.
- Super admin gets an **Audit page**: filter by user, entity, action, date range; show
  what changed (diff of before/after). This is the "who changed what, when" requirement.
- Keep audit identity **out of all reports/PDFs** (§8).

---

## 11. Branding & Design

- **Brand**: ONE SOLUTIONS — gold/bronze "ONE" wordmark over "SOLUTIONS". Create a
  `brand.config.ts` single source of truth (name, logo path, colors, fonts) mirrored by
  Tailwind `@theme` tokens. Primary = the gold/bronze tone from the logo; neutral
  black/grey section bands as in the sample; clean white surfaces.
- **Mobile-first**: design every screen for phones first, then scale up. Bottom-nav or
  drawer on mobile; sidebar on desktop. Large tap targets, sticky action bars.
- Polished, modern, consistent — use Radix components, subtle framer-motion, sonner
  toasts, skeleton loaders, empty states, and confirm dialogs for destructive actions.
- Fully **RTL-correct** in Arabic (mirrored layout, icons, table column order).
- Use the Amiri font for Arabic in PDFs; pick a clean Arabic UI font (e.g. Cairo/Tajawal)
  and a Latin pairing for the app.

---

## 12. Non-functional Requirements

- TypeScript everywhere, strict mode. Shared types between API and web where practical.
- Server-side validation on every endpoint (never trust the client). Mirror with zod.
- Pagination, sorting, filtering on all list endpoints (TanStack Table on the client).
- Optimistic, cached data via react-query; toast feedback on every mutation.
- Sensible DB indexes (FKs, `projectId`, `logDate`, `paidAt`, `status`).
- Seed script: 1 super admin + a starter set of System Data (a few terms/items, T&Cs,
  default alert threshold) so the app is demoable immediately.
- `.env.example` for api + web; `docker-compose.yml` brings the whole stack up.
- Clean module boundaries so future features (more roles, more alert types, more report
  types, multi-currency) slot in without rework.

---

## 13. Delivery Plan (build in phases, confirm each)

1. **Foundation**: monorepo/two-package layout, Docker Compose (postgres+api+web),
   Prisma schema for all entities, NestJS app skeleton with modules, Next.js app shell
   with next-intl (AR/RTL default + EN), brand tokens, base UI kit, seed script.
2. **Auth + Users + Audit core**: login, JWT cookies, RBAC guards, user management
   (super admin), audit middleware + audit page.
3. **System Data**: Terms, Items (linked to terms), Terms&Conditions, Alert thresholds —
   full CRUD with bilingual fields.
4. **Clients + Projects**: CRUD, project dashboard shell, supervision % per project.
5. **Quotation builder**: terms-only builder (UNIT / LUMP_SUM lines), T&C dropdown,
   notes, totals math (§6), Save as Draft, **Quotation PDF**, Approve → activate project.
6. **Payments**: CRUD with auto-split (§6), payment KPIs.
7. **Daily Logs**: term→item entries + additionals, daily-log KPIs.
8. **Reports/PDFs**: Daily Logs report (date range) + Final Invoice (§6, §8).
9. **KPIs + Alerts** everywhere (§7): project, client, and global dashboards; alert engine.
10. **Polish**: responsive QA on mobile, RTL/i18n pass, empty/loading/error states,
    confirm dialogs, final design polish.

After each phase: summarize what was built, how to run it, and what to verify.

---

## 14. Acceptance Criteria (the build is "done" when…)

- [ ] App defaults to Arabic RTL, English toggle works, all chrome translated.
- [ ] Super admin can create admins; admins can't manage users or see the audit trail.
- [ ] Every write is audited with actor + before/after; audit page works; reads not logged.
- [ ] System Data CRUD works; items are correctly linked to their term.
- [ ] Quotation builder uses **terms only**, supports UNIT and LUMP_SUM lines, T&C
      dropdown, free-text notes; totals = subtotal × (1 + S/100); Save as Draft works.
- [ ] Quotation PDF visually matches/exceeds the sample (Arabic RTL, sections, totals).
- [ ] Approving a quotation activates the project; payments/logs blocked until active.
- [ ] Payment split is markup-consistent: operational = amount/f, supervision = amount−operational.
- [ ] Daily logs support term/item entries **and** additionals; many logs per day.
- [ ] Daily Logs PDF (date range) and Final Invoice PDF (per-item rollups, additionals,
      total spent, +supervision, final total) are correct and contain **no** "created by".
- [ ] Remaining-operational-low alert fires correctly (amount & percent modes).
- [ ] Every dashboard shows useful KPIs; mobile-first responsive throughout.
- [ ] `createdAt`/`updatedAt` on everything; soft-delete on business entities.
- [ ] `docker-compose up` brings the full stack online with seeded demo data.

---

## 15. Notes for the Builder

- Treat **§6 financial rules** as immutable contracts — write unit tests for the
  quotation total, payment split, invoice rollup, and alert trigger.
- Snapshot values that must not drift: quotation line text & T&C text on approval, and
  `supervisionPercent` onto each payment.
- Keep the alert engine and report layer generic enough to add new alert/report types
  later without schema churn.
- Ask before guessing on any further business-rule ambiguity; everything financial has
  been pinned down above.
```
