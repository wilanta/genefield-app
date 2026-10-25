# Guided Tour

Tur Terpandu merupakan lapisan onboarding di atas halaman GeneField yang sudah ada. Tur memiliki 24 langkah, dengan perkiraan waktu baca dan interaksi 5–8 menit. UI mengikuti pilihan bahasa Inggris atau Bahasa Indonesia dan tema aplikasi.

Bahasa Indonesia menjadi default untuk profil baru atau preferensi bahasa yang tidak valid. Pilihan bahasa yang sudah tersimpan tetap digunakan; pengguna dapat beralih ke English melalui Settings.

Settings → Guided Tour menyediakan **Start Guided Tour** atau **Replay Guided Tour**. Keduanya selalu membuka langkah pertama di Overview. Replay tidak mengubah kandidat tersimpan, preferensi lain, atau data referensi. Tidak ada kontrol reset terpisah karena replay sudah memulai dari awal.

Welcome muncul setelah layanan startup desktop siap dan dapat ditutup melalui Maybe Later, tombol tutup, atau Escape. Onboarding menyimpan `hasSeenWelcome`, `hasCompletedTour`, dan `lastTourStep` dalam satu key localStorage, `genefield-onboarding-v1`. Penyimpanan ini mengikuti pola preferensi lokal aplikasi. Ketika penyimpanan tidak tersedia, tur tetap dapat digunakan dalam sesi tersebut. Tur yang terputus tidak dimulai ulang secara otomatis. Completion dicatat ketika pengguna menekan Finish Tour pada langkah terakhir; dialog completion menjelaskan cara replay dari Settings.

## Implementasi

- `src/onboarding/GuidedTourProvider.tsx`: controller tunggal di dalam DesktopStartup, navigasi, welcome, completion, spotlight, dan posisi tooltip. Tidak ada dependensi baru.
- `tourSteps.ts`: definisi 24 langkah beserta target, route, dan penjelasan ilmiah.
- `tourStorage.ts`, `tourTypes.ts`: persistensi dan tipe onboarding.
- `tourGuidance.ts`: daftar tugas per kolom, target interaksi, fase penjelasan Profil/detail kandidat, dan ruang petunjuk adaptif.
- `tourLayout.ts`: tipe geometri dan utilitas penempatan.
- `tourEvents.ts`: sinyal sukses dari aksi Cross Lab dan Breed Designer yang dijalankan pengguna. Tidak memanggil inferensi atau ranking.
- `tourExample.ts`: memilih contoh tetua dari irisan galur bergenotipe dan eligibility keempat model. Kumpulan tetua latihan diperiksa melalui lookup historis agar memiliki sedikitnya dua pasangan yang belum tercatat. Persiapan ini tidak menjalankan prediksi atau ranking.
- `tourPractice.ts`: validasi terpusat untuk 14 tugas wajib, identitas pasangan kanonis, invalidasi hasil setelah input berubah, dan penghitungan dua kandidat berbeda.
- `guided-tour.css`: gaya berbasis token visual aplikasi. Dialog menggunakan komponen Radix yang sudah ada.
- Halaman produk memakai anchor `data-tour` dan mengirim sinyal dari aksi pengguna atau perubahan status hasil. Settings memakai controller bersama. Algoritme prediksi dan ranking tetap menggunakan layanan asli.

File existing yang diubah: `src/components/layout/AppShell.tsx`, `src/locales/id.json`, `src/pages/Settings/Settings.tsx`, `src/pages/Overview/Overview.tsx`, `src/pages/LineExplorer/LineExplorer.tsx`, `src/pages/LineExplorer/LineExplorerToolbar.tsx`, `src/pages/PedigreeExplorer/PedigreeExplorer.tsx`, `src/pages/CrossLab/CrossLab.tsx`, `src/pages/BreedDesigner/BreedDesigner.tsx`, `src/pages/CandidateWorkspace/CandidateWorkspace.tsx`, dan `src/pages/ModelInsights/ModelInsights.tsx`.

Pengujian onboarding ada pada `src/onboarding/GuidedTourProvider.test.tsx`, `tourPractice.test.ts`, `tourExample.test.ts`, `scripts/smoke-guided-tour.mjs`, dan `scripts/tour-window-qa.ps1`. `src/pages/BreedDesigner/CandidateTable.tsx` juga memberi nama unik untuk klik Simpan pada langkah latihan. Penyimpanan di luar langkah tersebut tetap memakai nama biasa. Tidak ada perubahan dependensi, skema database, model, atau algoritme inferensi/pemeringkatan.

Saat petunjuk terbuka, area di luar sorotan digelapkan 72% dan klik/fokus keyboard dibatasi pada kontrol tugas serta kartu tur. Menu pilihan milik kontrol yang disorot tetap dapat digunakan. Tombol Hide tip melepas pembatasan dan mengembalikan ukuran halaman tanpa mengakhiri sesi; Skip Tour atau Escape mengakhiri tur. Welcome dan completion memakai focus trap dialog bawaan. Dialog aplikasi seperti Candidate Compare menangguhkan pembatasan dan tampil di atas tur; petunjuk kembali setelah dialog ditutup.

ID latihan ditandai dengan highlight hijau dan huruf monospace melalui `TourText.tsx`; baris LINE_ID yang diminta juga diberi penanda. Setiap kolom/tombol tugas diberi border sendiri. Pada langkah 16 sampai 18, daftar tugas menampilkan nilai yang diminta, kepanjangan singkatan sifat, dan tanda selesai sesuai nilai aktual. Klik instruksi menggulir dan memfokuskan kolom terkait. Pencarian kumpulan tetua menerima huruf besar, kecil, atau campuran dengan aturan yang sama seperti filter aplikasi.

Kartu petunjuk menempati ruang terpisah: sisi kanan pada viewport lebar, bagian bawah pada viewport lebih sempit. Ukuran halaman menyesuaikan hanya selama petunjuk terbuka sehingga angka, tabel, dan panel tidak ditumpangi kartu. Setelah klik Profil pada langkah 6, sorotan berpindah ke panel profil dan menampilkan penjelasan sebelum pengguna menekan Berikutnya untuk membuka silsilah. Langkah 21 menyorot satu baris kandidat yang dibuat pada sesi tur; setelah diklik, sorotan berpindah ke detail kandidat dan kartu ditempatkan di kiri pada viewport lebar. Nomor langkah tetap 24. Smoke native memeriksa tidak adanya overlap pada langkah 2, 4, 6, 15 sampai 18, 21, dan 23, termasuk fase penjelasan setelah klik.

Pergantian route menunggu target melalui observer DOM, lalu menggulirnya ke area terlihat. Target awal yang belum muncul diberi waktu empat detik; jika tetap tidak tersedia, penjelasan dan opsi keluar tetap tersedia. Langkah informasional dapat dilanjutkan, sedangkan langkah tugas tetap menunggu aksi yang valid. Ketika pengguna membuka modul lain, Return to step mengembalikan halaman tugas. Observer dan listener dibersihkan saat langkah berganti atau sesi berakhir.

Tur meminta pengguna menyelesaikan 14 tugas: mencari LINE_ID valid, membuka profil, memilih simpul silsilah, mengisi Tetua A dan B yang berbeda serta eligible untuk empat sifat, menjalankan analisis hingga berhasil, memilih tujuan hasil gabah (GY) dan waktu menuju berbunga (DTF), masing-masing berbobot 1, serta arah waktu berbunga, mengisi bobot GY=2 dan DTF=1, menyaring kumpulan tetua latihan, menjalankan ranking dengan minimal dua hasil, menyimpan dua pasangan berbeda, membuka detail pada satu baris kandidat tur yang disorot, meninjau lalu menutup perbandingan dua kandidat, dan menyatakan pemahaman atas keterbatasan ilmiah. Bobot tersebut merupakan contoh latihan, bukan rekomendasi pemuliaan universal.

Berikutnya terkunci sampai aksi yang sesuai selesai. ID tidak dikenal atau tidak eligible, tetua yang sama, hasil lama setelah pengeditan, ranking kosong/satu hasil, dan pengulangan pasangan tersimpan tidak memenuhi tugas. Analisis empat sifat dan ranking yang berhasil melanjutkan langkah secara otomatis; Back ke hasil yang sudah selesai tidak memicu lompatan otomatis berulang. Kegagalan layanan tetap ditampilkan melalui UI aplikasi asli dan dapat dicoba ulang. Pengguna selalu dapat keluar dengan Skip Tour atau Escape.

Validasi pencarian dan Profil harus sesuai ID contoh yang diminta. Pada Cross Lab, Tetua A dan B harus diisi sesuai contoh pada slot masing-masing; ID lain tetap ditolak untuk langkah latihan walaupun eligible. Nilai yang benar harus berasal dari aksi edit pada langkah tersebut dan masih cocok dengan isi field sekarang. Menghapus pencarian atau mengganti profil membatalkan kelulusan langkah yang tidak lagi sesuai. Batasan ini hanya untuk latihan; kanonisasi pasangan yang tidak bergantung urutan pada model tidak berubah.

Tidak ada input, inferensi, atau penyimpanan kandidat otomatis. Klik Simpan pada dua pasangan benar-benar menambah dua kandidat ke ruang kerja, memakai penanda sesi tur unik untuk menghindari konflik nama saat replay. Kandidat yang sudah ada tidak diubah atau dihapus. Replay mengosongkan bukti tugas dalam memori sehingga pengguna perlu mengerjakan tugas lagi; `lastTourStep` tidak menyimpan atau memulihkan keberhasilan aksi lama. Pengamatan historis, estimasi model, skor pemeringkatan, cakupan registry, dan persetujuan ilmiah dibedakan dalam teks tur.

## Validasi

```powershell
npm run typecheck
npm test -- --maxWorkers=2 --hookTimeout=120000
npm run build
npx prettier --check src/onboarding scripts/smoke-guided-tour.mjs docs/guided-tour.md
```

Tidak ada script lint dalam package.json. TypeScript dan pemeriksaan format digunakan untuk perubahan ini.

Pengujian integrasi model memakai batas startup 120 detik dan dua worker untuk menghindari batas hook bawaan 10 detik saat model dingin dimuat bersamaan dengan worker UI. Timeout aplikasi dan protokol model tidak diubah.

Untuk smoke test native, jalankan executable debug dengan profil WebView2 QA terpisah dan CDP port 9223. Profil terpisah menjaga preferensi UI pengguna. Script memakai database SQLite asli, mencatat kandidat awal, lalu mengerjakan dua putaran penuh dalam Bahasa Indonesia dan English. Setiap putaran menyimpan dua kandidat melalui tombol UI dan membandingkan kandidat yang baru disimpan; kandidat awal tidak diperlukan. Hanya ID kandidat yang dibuat oleh test, dengan nama sesi tur yang cocok, yang dibersihkan pada akhir pengujian. Snapshot kandidat awal diperiksa utuh setelah pembersihan.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = '--remote-debugging-port=9223'
$env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $env:TEMP 'genefield-onboarding-qa-webview'
$tourQa = Start-Process -FilePath (Resolve-Path 'src-tauri/target/debug/genefield-desktop.exe') -WindowStyle Hidden -PassThru
$env:GENEFIELD_TOUR_QA_PID = [string]$tourQa.Id
node scripts/smoke-guided-tour.mjs
```

Jalankan pada profil QA saja: smoke test menghapus hanya key onboarding profil tersebut di awal agar welcome dapat diuji ulang. Helper `tour-window-qa.ps1` mengubah ukuran jendela proses QA yang dipilih, tanpa mengubah izin aplikasi. Smoke test memeriksa 1920×1080, 1440×900, 1366×768, dan 1024×640; ukuran viewport efektif dicatat karena desktop memakai zoom 85%. Hasil JSON dan screenshot ditulis ke `test-results/guided-tour/` yang diabaikan Git.

Smoke test memakai contoh yang dipilih dari data/metadata lokal melalui `loadTourExample()`. Pada bundle saat implementasi, pasangan empat sifatnya adalah `GID_10039` dan `GID_10125`; filter kumpulan tetua latihan yang terpilih adalah `GID_11`. Pengujian ini merupakan validasi engineering pada Tauri development, bukan validasi installer atau persetujuan ilmiah/pemulia. Waktu 5–8 menit merupakan sasaran desain, belum studi penggunaan dengan pemula.
