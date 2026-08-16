# Emerald backend

NestJS + Prisma + PostgreSQL API for the Emerald Duta Sejahtera business
portal. Implements the data model and auto-journal engine from
[`docs/DATA_DESIGN.md`](../docs/DATA_DESIGN.md).

## Local development

Requires Node 22+ and a PostgreSQL instance (or run one via `docker run -p
5432:5432 -e POSTGRES_PASSWORD=emerald -e POSTGRES_USER=emerald -e
POSTGRES_DB=emerald postgres:16-alpine`).

```bash
npm install
cp .env.example .env        # edit DATABASE_URL etc if needed
npx prisma migrate dev       # creates tables + generates the client
npm run prisma:seed          # COA, admin login, sample master data
npm run start:dev
```

API is served under `http://localhost:3000/api`. Login with the seeded admin
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`, defaults in
`.env.example`) at `POST /api/auth/login`, then send the returned
`accessToken` as `Authorization: Bearer <token>`.

## Architecture notes

- **Money is `BigInt`** everywhere (integer rupiah, per the data design's
  convention). `main.ts` patches `BigInt.prototype.toJSON` so responses
  serialize it as a string — parse it back to a number on the frontend.
- **The auto-journal engine** (`src/accounting/journal/journal.service.ts`)
  is the one place that posts to `journal_entries`/`journal_lines`. Every
  module that creates a transaction (sales invoice, purchase invoice, cash
  receipt/payment, payroll, cash advance approval, depreciation run) calls
  one of its `postXxx()` helpers inside the same Prisma transaction as the
  document itself, so the ledger and the document are always consistent.
  Adding a new transaction type never touches the engine — see the existing
  `postXxx()` methods for the pattern.
- **Chart of Accounts** (`prisma/seed.ts`) follows the data design's §5
  table, plus four accounts (`Aktiva Tetap`, `Akumulasi Penyusutan`, `Utang
  BPJS`, `Beban Penyusutan`) the journal rules in §4 need but §5's table
  didn't list — called out in the seed file and `coa-codes.ts`.
- **Soft delete**: master data and most documents use `deleted_at` instead
  of a real `DELETE`; every `findAll`/`findOne` filters it out.
- **Prisma errors are never raw 500s.** `src/common/filters/prisma-exception.filter.ts`
  is registered globally (`main.ts`) and turns unique-constraint hits (e.g.
  duplicate NIK on `POST /employees`), missing-record updates, and bad
  foreign keys into proper 409/404/400 responses with a readable message —
  covers every module, not just the ones with an explicit pre-check
  (`UsersService` still pre-checks email itself for a more specific message,
  the filter is the safety net everywhere else).
- **No GRN.** The data design's §3 originally modeled a `goods_receipt`
  step between PO and Faktur Pembelian, but Emerald doesn't issue GRNs
  itself — that's the principal/customer's document on the sales side
  (see e.g. Komatsu's vendor portal), and isn't used internally either.
  So `POST /api/purchase-invoices` with a `poId` does both jobs at once:
  it posts the invoice *and* creates the stock-in `stock_move`s from the
  PO's lines, marking the PO `received`. `PurchaseOrderLine` no longer
  has a receipt-quantity concept — the invoice is trusted for the full PO
  line qty.
- **Role-based access** (`src/common/guards/roles.guard.ts`) follows §6:
  `admin`, `hrd_keuangan`, `pic_proyek`, `karyawan`. Self-service endpoints
  (work reports, attendance, cash advances, payslips) scope results to the
  caller's linked `employeeId` when the role is `karyawan`.
- **Display names are role-prefixed** ("HRD Agus", "Admin Administrator" —
  `src/auth/role-label.util.ts`'s `displayName()`). Computed from `name` +
  `role` wherever a person needs identifying — `/auth/login` and `/auth/me`,
  the `/users` list, the document-log author on Faktur Penjualan, and the
  PIC name in PDF digital-signature blocks — never stored, so it can't go
  stale if the account's role changes. `ROLE_LABEL` in the same file is the
  one place to edit the abbreviations.
- **PDF print-outs** (`src/printing/`) render plain HTML (no React/Tailwind
  dependency — same visual style as the prototype's `window.print()`
  templates, simplified further per a reference vendor-portal invoice) to
  PDF via `puppeteer-core`, driving a system-installed Chromium rather than
  bundling one. `GET /api/sales-invoices/:id/print`,
  `/api/basts/:id/print`, `/api/delivery-orders/:id/print`,
  `/api/payslips/:id/print` return `application/pdf` directly. Needs
  `PUPPETEER_EXECUTABLE_PATH` pointing at a real Chromium/Chrome — the
  Docker image installs one automatically (see Dockerfile); for local dev
  set it in `.env` (see `.env.example`).
  - **Strictly monochrome** (`layout.util.ts`'s `BASE_CSS`) — no navy/gold
    brand colors on printed documents, black/white/gray only. The issuing
    company's address is deliberately left off the kop (NPWP still shows,
    since faktur pajak needs it) — only the recipient's address appears
    where relevant (e.g. Faktur Penjualan's "Kepada:").
  - **Two signature styles.** Faktur Penjualan and BAST are legal documents
    exchanged with an external party and get a wet-ink block. Everything
    else (Slip Gaji, Surat Jalan, and any future Laporan Keuangan/Pajak
    print-out) is issued electronically via `digitalSignatureBlock()` — it
    prints the name of whoever triggered the action (`createdBy`, resolved
    to the `User`) instead of a line to sign. New print templates should
    default to the digital block unless the document is genuinely one that
    needs ink/stamp. Within the wet-ink pair, `ttdBlock()` is for documents
    both parties sign (BAST — proof of handover); Faktur Penjualan uses
    `sellerSignatureBlock()` instead — an invoice is billing, not a receipt,
    so there's no "Penerima" column for the buyer to sign.
  - **Faktur Penjualan wording**: labeled "Subtotal" (not "DPP" — that's
    the formal e-Faktur Pajak term, this is a commercial invoice) plus a
    "PPh (dipotong pembeli)" line, matching how real Indonesian sales
    invoices are commonly laid out. `SalesInvoice.pph` is informational
    only (optional on create, defaults to 0) — it doesn't reduce `total`
    or feed the journal engine, since withholding is the buyer's own
    bookkeeping. Line items' `partNo` auto-fills from the selected
    `Item.code` when not given explicitly (`SalesInvoicesService.create`).

## What's implemented vs. still open

Full CRUD + the journal engine is in for every module referenced by the
existing frontend prototype (`EmeraldERP.jsx`): PO, Faktur Penjualan,
Karyawan, Absensi, Penggajian, BAST, Buku Besar/Jurnal, Daftar Akun — plus
Pembelian/Penjualan supporting docs (delivery order, sales order — see the
"No GRN" note above for why goods receipt isn't a separate step), Kas &
Bank (receipt/payment), stock moves, project tasks/work reports, cash
advances, employee loans, and fixed assets/depreciation.

Not built yet (see docs/DATA_DESIGN.md §8 antrean kerja for the source list):
- Laporan module (laba rugi / neraca / aging reports) — the data is all in
  `journal_lines` and `payslips`/invoices, this is a reporting layer on top.
- Bank reconciliation / buku bank (only receipt & payment are modeled).
- Purchase/sales retur (return) documents.
- PDF print-out for PO (only Faktur Penjualan, Slip Gaji, and BAST are
  wired up so far — same `src/printing/` pattern extends easily to PO).
- Tiered kasbon approval (spec left this "waiting on confirmation" — current
  implementation is single-level HRD approval per the stated default).

## Deploying

See [`../DEPLOY.md`](../DEPLOY.md) for the Docker Compose + Caddy self-host
walkthrough (Postgres + backend + automatic HTTPS for your domain).
