# Guided Tour

Tur Terpandu merupakan lapisan onboarding di atas halaman GeneField yang sudah ada. Tur memiliki 24 langkah, dengan perkiraan waktu baca dan interaksi 5–8 menit. UI mengikuti pilihan bahasa Inggris atau Bahasa Indonesia dan tema aplikasi.

Bahasa Indonesia menjadi default untuk profil baru atau preferensi bahasa yang tidak valid. Pilihan bahasa yang sudah tersimpan tetap digunakan; pengguna dapat beralih ke English melalui Settings.

Settings → Guided Tour menyediakan **Start Guided Tour** atau **Replay Guided Tour**. Keduanya selalu membuka langkah pertama di Overview. Replay tidak mengubah kandidat tersimpan, preferensi lain, atau data referensi. Tidak ada kontrol reset terpisah karena replay sudah memulai dari awal.

Welcome muncul setelah layanan startup desktop siap dan dapat ditutup melalui Maybe Later, tombol tutup, atau Escape. Onboarding menyimpan `hasSeenWelcome`, `hasCompletedTour`, dan `lastTourStep` dalam satu key localStorage, `genefield-onboarding-v1`. Penyimpanan ini mengikuti pola preferensi lokal aplikasi. Ketika penyimpanan tidak tersedia, tur tetap dapat digunakan dalam sesi tersebut. Tur yang terputus tidak dimulai ulang secara otomatis. Completion dicatat ketika pengguna menekan Finish Tour pada langkah terakhir; dialog completion menjelaskan cara replay dari Settings.

## Implementasi

- `src/onboarding/GuidedTourProvider.tsx`: controller tunggal di dalam DesktopStartup, navigasi, welcome, completion, spotlight, dan posisi tooltip. Tidak ada dependensi baru.
- `tourSteps.ts`: definisi 24 langkah beserta target, route, dan penjelasan ilmiah.
- `tourStorage.ts`, `tourTypes.ts`: persistensi dan tipe onboarding.
- `tourLayout.ts`: perhitungan posisi tooltip agar tetap berada dalam viewport.
- `tourEvents.ts`: sinyal sukses dari aksi Cross Lab dan Breed Designer yang dijalankan pengguna. Tidak memanggil inferensi atau ranking.
- `guided-tour.css`: gaya berbasis token visual aplikasi. Dialog menggunakan komponen Radix yang sudah ada.
- Halaman produk hanya menambahkan anchor `data-tour`; Settings menggunakan controller bersama. Dua handler sukses mengirim event onboarding setelah hasil asli tersedia.

File existing yang diubah: `src/components/layout/AppShell.tsx`, `src/locales/id.json`, `src/pages/Settings/Settings.tsx`, `src/pages/Overview/Overview.tsx`, `src/pages/LineExplorer/LineExplorer.tsx`, `src/pages/LineExplorer/LineExplorerToolbar.tsx`, `src/pages/PedigreeExplorer/PedigreeExplorer.tsx`, `src/pages/CrossLab/CrossLab.tsx`, `src/pages/BreedDesigner/BreedDesigner.tsx`, `src/pages/CandidateWorkspace/CandidateWorkspace.tsx`, dan `src/pages/ModelInsights/ModelInsights.tsx`.

File pengujian baru: `src/onboarding/GuidedTourProvider.test.tsx`, `scripts/smoke-guided-tour.mjs`, dan `scripts/tour-window-qa.ps1`. Tidak ada perubahan dependensi, database, model, atau algoritme inferensi/pemeringkatan.

Tooltip bersifat nonmodal sehingga layar tetap dapat digunakan. Tombol Hide tip menyembunyikan petunjuk sementara tanpa mengakhiri sesi. Welcome dan completion memakai focus trap dialog bawaan. Tooltip menerima fokus pada judul setiap langkah; Tab menjangkau kontrol dan Escape keluar. Dialog aplikasi seperti Candidate Compare tampil di atas tur; petunjuk kembali setelah dialog ditutup.

Pergantian route menunggu target melalui observer DOM, lalu menggulirnya ke area terlihat. Target awal yang belum muncul diberi waktu empat detik; jika tetap tidak tersedia, penjelasan tetap tampil dengan opsi lanjut. Target yang hilang saat sesi berjalan juga ditangani. Ketika pengguna membuka modul lain, tur menawarkan Return to step dan tetap dapat dilanjutkan atau ditutup. Observer dan listener dibersihkan saat langkah berganti atau sesi berakhir.

Tidak ada demo atau kandidat buatan. Pengguna memilih tetua sendiri, menjalankan analisis, menyusun tujuan dan bobot, serta menyimpan kandidat secara eksplisit. Event sukses dapat melanjutkan langkah Analyze atau Generate; Continue Tour selalu tersedia agar kesalahan layanan atau ruang kerja kosong tidak mengunci onboarding. Kegagalan tetap ditampilkan melalui UI aplikasi asli. Pengamatan historis, estimasi model, skor pemeringkatan, cakupan registry, dan persetujuan ilmiah dibedakan dalam teks tur.

## Validasi

```powershell
npm run typecheck
npm test
npm run build
npx prettier --check src/onboarding scripts/smoke-guided-tour.mjs docs/guided-tour.md
```

Tidak ada script lint dalam package.json. TypeScript dan pemeriksaan format digunakan untuk perubahan ini.

Untuk smoke test native, jalankan executable debug dengan profil WebView2 QA terpisah dan CDP port 9223. Profil terpisah menjaga preferensi UI pengguna. Script tetap membaca database SQLite aplikasi yang sebenarnya dan memverifikasi seluruh kandidat tidak berubah. Diperlukan sedikitnya dua kandidat tersimpan untuk demonstrasi perbandingan tanpa membuat kandidat uji.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = '--remote-debugging-port=9223'
$env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $env:TEMP 'genefield-onboarding-qa-webview'
$tourQa = Start-Process -FilePath (Resolve-Path 'src-tauri/target/debug/genefield-desktop.exe') -WindowStyle Hidden -PassThru
$env:GENEFIELD_TOUR_QA_PID = [string]$tourQa.Id
node scripts/smoke-guided-tour.mjs
```

Jalankan pada profil QA saja: smoke test menghapus hanya key onboarding profil tersebut di awal agar welcome dapat diuji ulang. Helper `tour-window-qa.ps1` mengubah ukuran jendela proses QA yang dipilih, tanpa mengubah izin aplikasi. Smoke test memeriksa 1920×1080, 1440×900, 1366×768, dan 1024×640; ukuran viewport efektif dicatat karena desktop memakai zoom 85%. Hasil JSON dan screenshot ditulis ke `test-results/guided-tour/` yang diabaikan Git.

Smoke test menggunakan pasangan yang sudah diverifikasi dalam `scripts/smoke-desktop.mjs` untuk menguji satu inferensi asli dan memakai filter parent pool yang ada untuk membatasi ranking. Pengujian ini merupakan validasi engineering pada Tauri development, bukan validasi installer atau persetujuan ilmiah/pemulia. Waktu 5–8 menit merupakan sasaran desain, belum studi penggunaan dengan pemula.
