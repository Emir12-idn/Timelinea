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
- **Role-based access** (`src/common/guards/roles.guard.ts`) follows §6:
  `admin`, `hrd_keuangan`, `pic_proyek`, `karyawan`. Self-service endpoints
  (work reports, attendance, cash advances, payslips) scope results to the
  caller's linked `employeeId` when the role is `karyawan`.

## What's implemented vs. still open

Full CRUD + the journal engine is in for every module referenced by the
existing frontend prototype (`EmeraldERP.jsx`): PO, Faktur Penjualan,
Karyawan, Absensi, Penggajian, BAST, Buku Besar/Jurnal, Daftar Akun — plus
Pembelian/Penjualan supporting docs (goods receipt, delivery order, sales
order), Kas & Bank (receipt/payment), stock moves, project tasks/work
reports, cash advances, employee loans, and fixed assets/depreciation.

Not built yet (see docs/DATA_DESIGN.md §8 antrean kerja for the source list):
- Laporan module (laba rugi / neraca / aging reports) — the data is all in
  `journal_lines` and `payslips`/invoices, this is a reporting layer on top.
- Bank reconciliation / buku bank (only receipt & payment are modeled).
- Purchase/sales retur (return) documents.
- PDF generation for print-outs (Faktur, Slip Gaji, BAST) — the prototype's
  `window.print()` templates already have the layout; wiring them to real
  data from these endpoints is straightforward, a server-side PDF step
  (e.g. Puppeteer) is optional on top.
- Tiered kasbon approval (spec left this "waiting on confirmation" — current
  implementation is single-level HRD approval per the stated default).

## Deploying

See [`../DEPLOY.md`](../DEPLOY.md) for the Docker Compose + Caddy self-host
walkthrough (Postgres + backend + automatic HTTPS for your domain).
