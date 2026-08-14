# Job Tracker

Pelacak lamaran kerja yang berjalan sepenuhnya di browser. Semua data disimpan di
`localStorage` — tidak ada server, tidak ada akun, tidak ada yang dikirim keluar.
Ekspor/impor JSON kalau mau memindahkan data antar perangkat.

Layar utamanya adalah **corong lamaran**: berapa yang dilamar, berapa yang sampai
interview, berapa yang jadi offer, dan berapa persen yang gugur di tiap tahap.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # logika murni di src/jobs.js
npm run build
```
