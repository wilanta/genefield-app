# Perbaikan startup GeneField 0.1.1

Laporan pengguna: aplikasi terpasang menampilkan kegagalan pemuatan lokal pada Overview, Breed Designer, Model Insights, dan Settings; data baru muncul setelah pengguna menekan **Restart local analysis**.

Screenshot memastikan gejala, tetapi tidak memuat kode error atau durasi startup. Pemicu pertama di laptop teman belum dapat dipastikan. Jangan menyimpulkan antivirus atau spesifikasi laptop sebagai penyebab yang sudah terbukti.

## Temuan kode dan perubahan

- Versi 0.1.0 mengunci `GeneFieldSidecar.start()` setelah satu percobaan gagal. Halaman berikutnya langsung menerima `PROCESS_UNAVAILABLE` sampai restart eksplisit. Startup memakai batas metadata yang sama dengan pemeriksaan layanan hangat, yaitu 45 detik.
- Versi 0.1.1 memberi waktu maksimal 120 detik untuk metadata startup. Pemeriksaan hangat tetap 45 detik. Kegagalan proses/transport saat inisialisasi dapat dicoba ulang otomatis **satu kali**, setelah proses lama dibersihkan. Semua pemanggil berbagi satu promise startup. Tidak ada pengulangan otomatis atas prediksi/ranking atau proses yang gagal setelah siap.
- Event error/close dapat datang sebelum `spawn()` mengembalikan handle. Error pertama kini dipertahankan agar kegagalan awal tidak hilang atau menunggu timeout. Bundle korup/tidak kompatibel dan protokol tidak valid tetap gagal tanpa percobaan otomatis.
- Promise pembacaan referensi yang gagal sebelumnya tersimpan selamanya. Kini cache kegagalan dilepas agar percobaan native berikutnya dapat pulih; data sukses tetap dibagikan dan tidak diganti data contoh.
- `DesktopStartup` memuat referensi, analisis, dan workspace secara paralel sebelum halaman dibuka. Tampilan progres tersedia dalam bahasa Inggris dan Indonesia. Kegagalan yang tetap terjadi mempunyai tombol **Try again / Coba lagi**. Tombol restart pada Settings tetap tersedia.

Transport tetap menggunakan [Tauri shell plugin](https://v2.tauri.app/plugin/shell/). Model, protokol ML, perhitungan ranking, dan data referensi tidak diubah.

## Validasi

- TypeScript dan build frontend lulus.
- 59 tes aplikasi lulus, termasuk simulasi startup 60 detik, timeout dengan pemulihan otomatis, spawn/close awal, pembatasan dua percobaan, penolakan bundle rusak, pembatalan saat ditutup, progres UI dan pemulihan cache native. Tes lifecycle terfokus diulang setelah perubahan terakhir: 22 lulus.
- 4 tes referensi lulus; format Rust dan pemeriksaan diff lulus.
- Hasil installer terpasang dan preservasi workspace disimpan terpisah di `docs/evidence/startup-0.1.1/`, agar bukti rilis sebelumnya tetap utuh.
- Installer NSIS 0.1.1 berhasil dipasang dengan exit code 0. **28 pemeriksaan aplikasi terpasang lulus**, termasuk lima startup otomatis, pembukaan pertama dengan workspace kosong/profil WebView baru, empat pembukaan ulang, pencarian/profil, pedigree, empat trait, semua objective ranking, Compare, snapshot persistence, tombol restart, dan penutupan seluruh proses. Tidak ada page exception. Sampel startup penuh: median 5,84 detik, rata-rata 8,52 detik (n=5; hanya laptop ini, metode observasi dan sampel mentah ada di `qa.json`).
- Upgrade installer mempertahankan workspace. Workspace asli dipulihkan setelah QA dengan SHA256 identik; database pengujian disimpan di direktori temporer, bukan menggantikan data pengguna.
- Semua 645 hash runtime, hash referensi, dan notices 444 paket pada instalasi baru cocok. Installer terbaru dengan ikon GeneField berukuran 58.649.149 byte dengan SHA256 `0e13c617e007cd20e9f6054a27af94b6f57e8b61a27b63d26bf0a07da40a9a2a`.
- Ikon setup NSIS diatur eksplisit melalui `bundle.windows.nsis.installerIcon`. Paket dibuat ulang dengan `npm run tauri -- bundle --bundles nsis`; executable aplikasi yang sudah diuji tetap byte-identik. Ekstraksi ikon setup melalui Windows menghasilkan logo yang identik dengan ikon GeneField. Hasil salinan ke folder berbagi juga mempunyai SHA256 identik.

Installer untuk dibagikan: `C:\Users\sheil\OneDrive\Dokumen\Wildhan\projects\genefield\GeneField_0.1.1_x64-setup.exe`. Gunakan versi 0.1.1 untuk pengujian ulang.

Pengujian di laptop pengembang tidak membuktikan pemicu spesifik pada laptop teman; installer baru perlu diuji ulang di laptop tersebut.
