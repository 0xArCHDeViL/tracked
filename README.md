# trac/ked — Habit Tracker

> Minimalist brutalist habit tracker untuk belajar bahasa Jepang (Kanji, Bunpou, Vocab, Listening).
> **Offline-first, PWA ready, mobile-first, dengan fitur export data ganda.**

[![Deploy to GitHub Pages](https://github.com/0xArCHDeViL/tracked/actions/workflows/deploy.yml/badge.svg)](https://github.com/0xArCHDeViL/tracked/actions/workflows/deploy.yml)

🌐 **Live Demo / Web App**: [https://0xarchdevil.github.io/tracked/](https://0xarchdevil.github.io/tracked/)

---

## Fitur Utama

- ⚡ **Offline-First**: Semua data tersimpan secara lokal di browser (`localStorage`). Buka kapan saja tanpa butuh koneksi internet.
- 📱 **PWA Ready**: Dapat dipasang (Add to Home Screen / Install) di Android, iOS, Windows, macOS seperti aplikasi native.
- 📲 **Mobile-First UX**: Dirancang khusus untuk kenyamanan layar sentuh (touch targets min 44px, safe area insets, heatmap scrollable).
- 📊 **Heatmap 16 Minggu**: Visualisasi riwayat konsistensi belajar ala kontribusi GitHub (Sepi → Gacor).
- 🧮 **Scoring & Streak Formula**:
  - Skor volume dengan diminishing returns di atas 200 poin.
  - Multiplier variasi hingga 2x jika menyelesaikan 4 kategori harian.
  - Streak counter cerdas dengan grace window.
- 💾 **Export & Backup Fleksibel**:
  - **Export JSON**: format lengkap untuk backup dan restore data.
  - **Export CSV**: format tabular yang siap dibuka langsung di spreadsheet (Google Sheets, Excel).
  - Integrasi Web Share API di smartphone jika didukung.

---

## Development

Aplikasi dibangun dengan **React 18**, **Vite**, dan **vite-plugin-pwa**.

```bash
# Install dependencies
npm install

# Jalankan local development server
npm run dev

# Build untuk production (dist/ + PWA Service Worker)
npm run build

# Preview build lokal
npm run preview
```

---

## Deployment ke GitHub Pages

Proyek ini telah dikonfigurasi dengan GitHub Actions (`.github/workflows/deploy.yml`).
Setiap push ke branch `main` akan secara otomatis:
1. Menjalankan instalasi dependensi dan build Vite.
2. Mengunggah bundle `./dist` termasuk PWA Service Worker & manifest.
3. Men-deploy langsung ke GitHub Pages.

---

## Lisensi
MIT
