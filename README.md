# Timelinea — Emerald Duta Sejahtera Business Portal

Backend (NestJS + Prisma + PostgreSQL) for the internal business portal
(pembelian, penjualan, persediaan, kas & bank, buku besar, proyek, absensi
& gaji, dst). Data model and business rules follow
[`docs/DATA_DESIGN.md`](docs/DATA_DESIGN.md).

- [`backend/`](backend/README.md) — the API. Start here for local dev.
- [`DEPLOY.md`](DEPLOY.md) — Docker Compose self-host guide (Postgres +
  backend + Caddy for automatic HTTPS on your own domain).

Frontend is a separate step — the existing React/Vite prototype
(`EmeraldERP.jsx`) is the visual starting point; wiring it to this API isn't
done yet (see `backend/README.md` for what's implemented vs. open).
