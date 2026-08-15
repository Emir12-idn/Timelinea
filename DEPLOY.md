# Deploy — self-host di PC rumah + domain

Stack: Postgres + backend (NestJS, Docker) + Caddy (reverse proxy, HTTPS otomatis).
Ini belum pernah dites dengan `docker build` sungguhan di sesi ini — PC/Docker kamu
lagi offline pas backend ini dibuat, jadi **jalankan `docker compose up -d --build`
sekali dan lihat log tiap service sebelum dianggap beres**, terutama `backend`
(migrasi Prisma) dan `caddy` (penerbitan sertifikat).

## 1. Prasyarat di PC yang jadi server

- Docker + Docker Compose plugin terinstall (`docker compose version`).
- PC nyala terus & terhubung ke internet.
- Router: forward port **80** dan **443** ke PC ini (untuk HTTPS otomatis lewat
  Let's Encrypt). Kalau ISP pakai CGNAT (IP publik tidak didapat), pertimbangkan
  Cloudflare Tunnel sebagai alternatif — di luar cakupan setup ini.
- Domain (`.my.id` dsb) dengan **A record** menunjuk ke IP publik PC ini.

## 2. Konfigurasi

```bash
cp .env.docker.example .env
```

Edit `.env`:
- `DOMAIN` — domain yang sudah di-pointing ke PC ini.
- `DB_PASSWORD`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD` — ganti semua dari default.
  `JWT_SECRET` generate dengan `openssl rand -base64 48`.

## 3. Jalankan

```bash
docker compose up -d --build
docker compose logs -f backend   # pastikan "Applying database migrations..." sukses
docker compose logs -f caddy     # pastikan sertifikat HTTPS terbit (cari "certificate obtained")
```

Seed data awal (COA, akun admin, sample master data) — sekali saja:

```bash
docker compose exec backend npx prisma db seed
```

Cek API jalan:

```bash
curl -k https://DOMAIN_KAMU/api/auth/login -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@emeralddutasejahtera.co.id","password":"<SEED_ADMIN_PASSWORD kamu>"}'
```

Harus balas JSON berisi `accessToken`.

## 4. Frontend

Compose ini baru menjalankan **backend**. Untuk frontend (`EmeraldERP.jsx` yang
sudah ada, sebagai starting point React/Vite):

1. `npm create vite@latest frontend -- --template react` lalu pindahkan komponen
   dari prototipe ke dalamnya, ganti data contoh dengan `fetch`/`axios` ke
   `https://DOMAIN_KAMU/api/...`.
2. `npm run build` menghasilkan folder `dist/`.
3. Taruh isi `dist/` di server (mis. `./frontend-dist` di repo ini), lalu ganti
   blok `respond` di `Caddyfile` dengan:
   ```
   root * /srv
   file_server
   try_files {path} /index.html
   ```
   dan tambahkan volume `./frontend-dist:/srv:ro` ke service `caddy` di
   `docker-compose.yml`.

## 5. Update setelah ada perubahan kode

```bash
git pull
docker compose up -d --build backend
docker compose exec backend npx prisma migrate deploy   # kalau ada migrasi baru
```

## 6. Backup database

```bash
docker compose exec db pg_dump -U emerald emerald > backup-$(date +%F).sql
```

Jadwalkan ini (cron) secara rutin — ini satu-satunya salinan data kalau PC rusak.
