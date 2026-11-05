# Job Tracker

Pelacak lamaran kerja. Wajib login dengan nama pengguna dan kata sandi; datanya
tersimpan di Supabase, jadi ikut berpindah antar perangkat. Tidak ada backend
sendiri: Supabase Auth untuk login, Row Level Security untuk otorisasi.

Layar utamanya adalah **corong lamaran**: berapa yang dilamar, berapa yang sampai
interview, berapa yang jadi offer, dan berapa persen yang gugur di tiap tahap.

## Menjalankan

```bash
npm install
cp .env.example .env   # lalu isi, lihat di bawah
npm run dev            # http://localhost:5173
npm test               # logika murni di src/jobs.js
npm run build
```

## Menyiapkan Supabase

Tanpa `.env` yang terisi, halaman tampil kosong dan penyebabnya hanya terlihat di
console browser. `npm run build` tetap lolos, jadi di hosting kedua variabel
`VITE_*` juga harus sudah ada saat build.

1. Buat proyek Supabase, lalu jalankan SQL tabel `jobs` dari bagian **Supabase**
   di [CLAUDE.md](CLAUDE.md) lewat SQL Editor. RLS dan policy-nya wajib ikut.
2. Isi `.env` dari Settings → API Keys: URL proyek dan *publishable key*
   (`sb_publishable_…`). Jangan pernah memakai secret key atau `service_role`.
   Di self-hosted, ambil `SUPABASE_PUBLIC_URL` dan `ANON_KEY` dari `.env` server.
3. Kalau sudah punya akun di Supabase itu, login saja dengan email lengkapnya.
   Kalau belum, buat di Authentication → Users dengan email
   `namamu@jobtracker.local`, centang auto confirm, lalu login dengan `namamu` saja.
4. Matikan pendaftaran publik di pengaturan Authentication. Key di atas ikut
   terkirim ke browser, jadi selama pendaftaran menyala siapa pun bisa membuat akun.
   Di self-hosted, set `DISABLE_SIGNUP=true` di `.env` server, lalu jalankan
   `docker compose up -d --force-recreate auth`. Biarkan `ENABLE_EMAIL_SIGNUP=true`,
   karena mematikannya ikut mematikan login dengan email.
