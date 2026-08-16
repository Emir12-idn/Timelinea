# Timelinea — Emerald Duta Sejahtera Business Portal

Full-stack internal business portal (pembelian, penjualan, persediaan, kas &
bank, buku besar, proyek, absensi & gaji, dst). Data model and business
rules follow [`docs/DATA_DESIGN.md`](docs/DATA_DESIGN.md).

- [`backend/`](backend/README.md) — NestJS + Prisma + PostgreSQL API.
- [`frontend/`](frontend/README.md) — React + Vite + Tailwind portal, wired
  to the API (login, Pesanan Pembelian, Faktur Penjualan, Karyawan,
  Absensi, Penggajian, Buku Besar, BAST — with real PDF print-outs).
- [`DEPLOY.md`](DEPLOY.md) — Docker Compose self-host guide (Postgres +
  backend + Caddy for automatic HTTPS on your own domain).

## Run locally

```bash
cd backend && npm install && npx prisma migrate dev && npm run prisma:seed && npm run start:dev   # :3000
cd frontend && npm install && npm run dev                                                          # :5173
```

Then open `http://localhost:5173` and log in with the backend's seeded
admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `backend/.env`). See
each package's README for details.
