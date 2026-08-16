# Emerald frontend

React + Vite + Tailwind portal wired to the [backend API](../backend). This
replaces the static-data prototype (`EmeraldERP.jsx`) with real login and
live data for the modules the backend has finished: Beranda, Pesanan
Pembelian, Faktur Penjualan (+print), Data Karyawan, Absensi Harian,
Penggajian (+slip print), Daftar Akun, Bukti Jurnal, BAST (+print). Every
other menu item shows a "belum tersambung" placeholder rather than fake data.

## Run locally

Needs the backend running first (see `../backend/README.md`) — default
`http://localhost:3000/api`.

```bash
npm install
cp .env.example .env   # edit VITE_API_URL if your backend isn't on localhost:3000
npm run dev
```

Opens on `http://localhost:5173`. Log in with the backend's seeded admin
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `backend/.env`).

## Notes

- **Auth**: JWT stored in `localStorage`, attached to every request in
  `src/api/client.js`. A 401 anywhere drops the app back to the login screen
  (`AUTH_EXPIRED_EVENT`).
- **Money fields** come back from the API as strings (BigInt serialized —
  see backend's `main.ts`); `src/lib/format.js`'s `rupiah()` is the one
  place that parses and formats them.
- **PDF print buttons** can't use a plain `<a href>` (the endpoint needs an
  `Authorization` header) — they `fetch()` the PDF as a blob with the token
  attached and open it via an object URL (`fetchPdfObjectUrl` in
  `src/api/client.js`).
- **No router library** — `App.jsx` keeps the prototype's simple
  `useState("beranda")` + `render()` switch instead of `react-router`, to
  match the existing Sidebar/menu pattern. Fine at this size; swap in a
  router if the app grows enough that deep-linking matters.
- Wiring a new module: look at `POList.jsx` (simple list + create form) or
  `InvoiceList.jsx` (list + detail + create + print) as the pattern, add the
  page to `src/pages/`, and route it in `App.jsx`'s `render()`.

## Build

```bash
npm run build
```

Outputs to `dist/` — see `../DEPLOY.md` §4 for serving it through the Docker
Compose Caddy setup.
