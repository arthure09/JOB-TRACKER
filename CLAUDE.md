# CLAUDE.md

Job Tracker — React + Vite. Wajib login (nama pengguna + kata sandi), data di
Supabase. Tanpa backend
sendiri: Supabase Auth untuk login, Row Level Security untuk otorisasi.

## Perintah

```bash
cp .env.example .env   # isi dari Supabase: Settings → API
npm run dev            # vite, http://localhost:5173
npm test               # node --test src/*.test.js
npm run build
npx eslint .
```

## Struktur

Logika murni dipisah dari React supaya bisa dites tanpa DOM:

| File | Isi |
|---|---|
| `src/jobs.js` | Semua logika: filter, urut, hitung, sanitasi, pemetaan kolom. **Tanpa React, tanpa DOM, tanpa jaringan.** |
| `src/jobs.test.js` | Test untuk `jobs.js`, jalan di `node --test`. |
| `src/App.jsx` | Gerbang sesi. Belum login → `Login`, sudah → `JobTracker`. |
| `src/Login.jsx` | Form nama pengguna + kata sandi → `signInWithPassword()`. Nama pengguna ditambahi `@jobtracker.local` karena Supabase Auth hanya kenal email. Akun dibuat di dashboard Supabase, tidak pernah di kode. |
| `src/supabase.js` | Client Supabase. Gagal keras kalau `.env` kosong. |
| `src/theme.js` | Baca/pasang tema. Dijalankan saat impor, sebelum React menggambar. |
| `src/JobTracker.jsx` | State + semua query Supabase + header. Merakit tiga komponen di bawah. |
| `src/Dashboard.jsx` | Corong dan statistik. Menurunkan angkanya sendiri dari `jobs`. |
| `src/JobTable.jsx` | Toolbar cari/urut, tabel, dan empty state. |
| `src/JobDialog.jsx` | Form tambah/edit. State form-nya lokal, bukan milik parent. |
| `src/Icon.jsx` | Ikon SVG inline. Dipanggil `<Icon name="plus" />`. |

Logika baru yang bisa diuji tanpa browser **harus** masuk `jobs.js`, bukan komponen.
Semua panggilan Supabase terkumpul di `JobTracker.jsx` — komponen anak tidak
pernah menyentuh jaringan, mereka cuma menerima array dan memanggil balik.

## Supabase

Tabel `jobs` memakai kolom snake_case; aplikasi memakai camelCase. `fromRow()`
dan `toRow()` di `jobs.js` yang menjembatani — `toRow` **sengaja tidak
menyertakan `id`**, karena id dibuat database saat insert dan dipakai di `.eq()`
saat update, tidak pernah ikut di payload.

```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  job_title text not null, company text not null,
  status text not null default 'Wishlist',
  job_url text default '', date_applied date, notes text default '',
  created_at timestamptz default now()
);
alter table jobs enable row level security;
create policy "own rows only" on jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Aturan yang tidak boleh dilanggar

**Corong itu jangkauan kumulatif, bukan status sekarang.** Lamaran yang sekarang
"Offer" sudah lama meninggalkan "Applied", jadi hitungan status tidak bisa
ditumpuk jadi corong. `STAGE_STATUSES` di `jobs.js` mendefinisikan tiap tahap
sebagai himpunan status, dan **satu peta itu dipakai bersama** oleh bar corong dan
filter tabel — supaya angka di bar selalu sama dengan jumlah baris saat diklik.
Ada testnya; jangan pisahkan keduanya.

Kunci tahap sengaja bukan nama status (`reachedApplied`, bukan `Applied`) karena
keduanya menjawab pertanyaan berbeda.

**RLS adalah satpamnya, bukan kode aplikasi.** Anon key ikut tertulis ke bundel
browser — itu wajar dan aman, **tapi hanya kalau RLS menyala**. Tabel baru tanpa
`enable row level security` berarti siapa pun yang lihat source situs bisa baca
dan hapus data semua orang. Jangan pernah membuat tabel di proyek ini tanpa
policy-nya sekalian.

**Semua data dari luar lewat `sanitizeJobs()`.** Dipakai untuk impor JSON, untuk
baris yang datang dari Supabase, *dan* untuk data lama di `localStorage` —
ketiganya sama-sama tidak tepercaya. `safeUrl()` cuma meloloskan `http(s)`, jadi
`javascript:` tidak pernah sampai ke `href`.

**Emas hanya berarti satu hal: Offer.** Warna emas cuma boleh muncul di tahap
Offer dan tombol aksi utama. Semua tahap lain abu-abu netral. Kalau emas dipakai
di tempat lain, maknanya hilang.

**Warna divalidasi dengan hitungan, bukan mata.** Setiap warna teks ≥4.5:1
terhadap surface-nya, setiap warna bar ≥3:1, dan tiap langkah tangga abu ≥1.5:1
dari tetangganya. Kalau menggeser satu warna, hitung ulang — jangan dikira-kira.

## Kebiasaan yang berlaku di sini

- Bahasa antarmuka: Indonesia. Komentar kode: Inggris.
- Pakai fitur bawaan platform dulu: `<dialog>` untuk modal (ESC dan backdrop
  gratis), `<input type="date">`, CSS custom property untuk tema.
- Tanpa library state, tanpa library UI, tanpa library chart. Bar dan corong
  digambar pakai CSS biasa.
- Komentar menjelaskan **kenapa**, bukan apa. Kalau kodenya sudah jelas, tidak
  usah dikomentari.
- Komentar berawalan `ponytail:` menandai penyederhanaan yang disengaja beserta
  batasnya. Baca dulu sebelum "memperbaiki" bagian itu.

## Batas yang sudah diketahui

Job cuma menyimpan status sekarang, tanpa riwayat tahap. Akibatnya lamaran yang
ditolak *setelah* interview tidak terhitung di tahap Interview, jadi angka
"sampai interview" cenderung lebih rendah dari kenyataan. Perlu riwayat tahap
kalau ini mulai penting.
