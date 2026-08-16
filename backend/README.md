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
- **Retur** (`src/sales/sales-returns/`, `src/purchasing/purchase-returns/`)
  are standalone documents referencing an existing `SalesInvoice`/
  `PurchaseInvoice` — they don't mutate the original invoice (audit trail
  stays intact), just post a reversing entry and stock move.
  `JournalService.postSalesReturn`/`postPurchaseReturn` mirror the invoice
  rules exactly in reverse (sales return: debit `Penjualan`+`PPN Keluaran`,
  credit `Piutang Usaha`; purchase return: debit `Utang Usaha`, credit
  `Persediaan`/`HPP`+`PPN Masukan`, picking the same stock-vs-service credit
  account the original purchase invoice used). Stock moves flip the same
  way — `qtyIn` for a sales return (goods come back), `qtyOut` for a
  purchase return (goods go back to the supplier), and only for `stock`-type
  items. Like the invoices, there's no partial-payment-style tracking —
  a return just posts its own dpp/ppn/total, it doesn't attempt to net
  against what's already been collected/paid on the original invoice.
- **Kasbon is a two-tier approval** (`src/hr/cash-advances/`): `pending` ->
  (`PATCH /:id/tier1-decision`, `pic_proyek`/`admin`) -> `tier1_approved` ->
  (`PATCH /:id/decision`, `hrd_keuangan`/`admin`) -> `approved`/`rejected`.
  Either tier can reject, which ends the flow immediately. The journal entry
  (`JournalService.postCashAdvanceApproval` — debit Piutang Karyawan, credit
  Kas) and `remaining` only get set on the *final* HRD approval — tier 1 is
  just a sign-off, it doesn't touch cash or the ledger. `CashAdvance.tier1By`
  records who gave that sign-off; `approvedBy` records whoever made the
  final call either way (HRD approving, or either tier rejecting).
- **Bank reconciliation** (`src/cash/bank-reconciliation/`) is a pure
  matching tool, not a posting one — `BankStatementLine` rows are entered
  manually (no local bank has an API feed to pull from) and never touch the
  journal; `CashTransaction` already posted when it was created. `POST
  /api/bank-statement-lines` adds one row (`amount` signed: positive =
  masuk, negative = keluar, same convention as a real rekening koran).
  `PATCH /:id/match` links it 1:1 to an existing `CashTransaction`
  (`BankStatementLine.cashTransactionId` is `@unique`) after checking the
  accounts match and the signed amounts are exactly equal (receipt = +,
  payment = −) — no partial/fuzzy matching, same "must balance exactly"
  philosophy as the journal engine. `GET /bank-statement-lines/summary?accountId`
  returns the book balance (same debit-normal ledger math as Laporan's Buku
  Besar) plus both worklists a real reconciliation needs: `CashTransaction`s
  with no matching statement line yet ("dicatat sistem, belum di bank") and
  statement lines with no matching transaction ("di bank, belum dicatat
  sistem") — e.g. bank admin fees nobody's booked yet.
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
  `/api/payslips/:id/print`, `/api/purchase-orders/:id/print` return
  `application/pdf` directly. Needs
  `PUPPETEER_EXECUTABLE_PATH` pointing at a real Chromium/Chrome — the
  Docker image installs one automatically (see Dockerfile); for local dev
  set it in `.env` (see `.env.example`).
  - **Strictly monochrome** (`layout.util.ts`'s `BASE_CSS`) — no navy/gold
    brand colors on printed documents, black/white/gray only. The issuing
    company's address is deliberately left off the kop (NPWP still shows,
    since faktur pajak needs it) — only the recipient's address appears
    where relevant (e.g. Faktur Penjualan's "Kepada:").
  - **Two signature styles.** Only BAST is a document both parties actually
    hand-sign (proof of handover), so it's the one using `ttdBlock()` —
    blank ink lines. Everything else is issued electronically and just
    prints a name, no line: Slip Gaji/Surat Jalan/Pesanan Pembelian use
    `digitalSignatureBlock()`, Faktur Penjualan uses
    `preparerBlock()` — an invoice is billing, not a receipt, so it never
    had anything for the buyer to sign either way. Both name-only blocks
    resolve the acting user (`createdBy`) to their `displayName`. New
    print templates should default to one of the no-line blocks unless
    the document genuinely needs ink/stamp.
  - **Faktur Penjualan wording**: labeled "Subtotal" (not "DPP" — that's
    the formal e-Faktur Pajak term, this is a commercial invoice) plus a
    "PPh (dipotong pembeli)" line, matching how real Indonesian sales
    invoices are commonly laid out. `SalesInvoice.pph` is informational
    only (optional on create, defaults to 0) — it doesn't reduce `total`
    or feed the journal engine, since withholding is the buyer's own
    bookkeeping. Line items' `partNo` auto-fills from the selected
    `Item.code` when not given explicitly (`SalesInvoicesService.create`).
    The header info block is left-aligned (was oddly right-justified),
    "No PO" moved to a per-line column (`SalesInvoiceLine.poRef`, falling
    back to the invoice-level `poRef`) since one invoice can bill items
    against different customer POs, and the bottom-left area shows the
    issuing `Company.bankAccount` + payment terms (from `customer.termDays`)
    instead of a blank notes area.
- **Laporan** (`src/reports/`) computes everything on read, straight from
  `journal_lines` + invoice status — no separate reporting tables to keep in
  sync. `GET /api/reports/laba-rugi?from&to` sums `pendapatan`/`beban`
  accounts in the period; `/neraca?asOf` sums `aset`/`kewajiban`/`ekuitas`
  cumulatively up to a date and, since there's no period-close mechanism,
  plugs the running (revenue − expense) total in as a synthetic "Laba (Rugi)
  Ditahan" equity line so the sheet always balances; `/buku-besar/:accountCode?from&to`
  is a per-account ledger with an opening balance and a running balance per
  line (sign flips on `debitNormal` — `aset`/`beban` are debit-normal,
  everything else credit-normal); `/aging?type=piutang|hutang&asOf` buckets
  open `SalesInvoice`s (`status` in `sent`/`accepted`) or `PurchaseInvoice`s
  (`status: open`) by days past their due date (`date + partner.termDays`,
  or `PurchaseInvoice.dueDate` when set). Since a `CashTransaction` receipt/
  payment always fully settles one invoice (no partial-payment allocation —
  see `CashTransactionsService.create`), "outstanding" is just "not yet
  `paid`", no running-balance-per-invoice math needed.

## What's implemented vs. still open

Full CRUD + the journal engine is in for every module referenced by the
existing frontend prototype (`EmeraldERP.jsx`): PO (+ print), Faktur
Penjualan, Karyawan, Absensi, Penggajian, BAST, Buku Besar/Jurnal, Daftar
Akun, Laporan Keuangan (laba rugi/neraca/buku besar/aging) — plus
Pembelian/Penjualan supporting docs (delivery order, sales order — see the
"No GRN" note above for why goods receipt isn't a separate step), retur
pembelian/penjualan, Kas & Bank (receipt/payment + bank reconciliation),
stock moves, project tasks/work reports, tiered kasbon approval, employee
loans, and fixed assets/depreciation.

Every item from docs/DATA_DESIGN.md §8's antrean kerja list is now built —
this list will grow again as new requests come in, but there's currently
no known backlog against the original spec.

## Deploying

See [`../DEPLOY.md`](../DEPLOY.md) for the Docker Compose + Caddy self-host
walkthrough (Postgres + backend + automatic HTTPS for your domain).
