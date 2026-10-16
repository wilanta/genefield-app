# GeneField Desktop

GeneField adalah aplikasi desktop untuk mengeksplorasi data pemuliaan padi, menganalisis pasangan tetua, dan memprioritaskan kandidat persilangan berdasarkan data historis INIA. Aplikasi menggabungkan antarmuka interaktif, penyimpanan lokal SQLite, dan inferensi model lokal melalui runtime `final-v1`.

Dibangun dengan **Tauri 2, React 19, TypeScript, dan Rust**. Integrasi native dan distribusi yang didokumentasikan dalam repo ini menargetkan **Windows x64**.

> GeneField merupakan alat bantu riset dan prioritisasi kandidat. Estimasi model menggambarkan keturunan historis pada tingkat persilangan dalam plasma nutfah INIA yang terwakili. Hasilnya bukan jaminan fenotipe keturunan atau prediksi F1, dan tidak menggantikan uji lapangan. Tinjauan pakar eksternal masih menunggu.

## Fitur

| Modul               | Fungsi                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Overview            | Ringkasan dataset dan aktivitas workspace.                                                                     |
| Line Explorer       | Pencarian galur, profil fenotipe historis, dan ketersediaan data genotipe.                                     |
| Pedigree Explorer   | Visualisasi hubungan tetua dan keturunan yang tercatat.                                                        |
| Cross Lab           | Estimasi empat sifat untuk pasangan tetua yang memenuhi syarat serta pemeriksaan catatan persilangan historis. |
| Breed Designer      | Pemeringkatan kandidat berdasarkan tujuan satu sifat atau kombinasi sifat dengan bobot pilihan pengguna.       |
| Candidate Workspace | Penyimpanan kandidat dan hasil analisis, catatan, serta perbandingan 2–3 kandidat tersimpan.                   |
| Model Insights      | Informasi model, populasi pelatihan, dan batasan interpretasi.                                                 |
| Settings            | Pilihan bahasa Inggris/Indonesia, tema terang/gelap/sistem, dan kepadatan antarmuka yang tersimpan lokal.      |

### Sifat yang dianalisis

| Kode | Sifat                               | Satuan                             | Tujuan pemeringkatan                       |
| ---- | ----------------------------------- | ---------------------------------- | ------------------------------------------ |
| GY   | Hasil gabah (_Grain Yield_)         | kg/ha                              | Maksimalkan                                |
| DTF  | Umur berbunga (_Days to Flowering_) | hari                               | Minimalkan atau maksimalkan; wajib dipilih |
| NO   | Busuk batang (_Stem Rot_)           | poin penilaian SES IRRI modifikasi | Minimalkan                                 |
| LB   | Blas daun (_Leaf Blast_)            | poin penilaian SES IRRI            | Minimalkan                                 |

Skor NO dan LB merupakan nilai keparahan, bukan kategori ketahanan. **Prioritization Score** adalah skor relatif untuk mengurutkan kandidat, bukan probabilitas keberhasilan pemuliaan. Skor dari tujuan, bobot, atau kumpulan tetua yang berbeda tidak dapat dibandingkan langsung.

## Arsitektur dan data lokal

Antarmuka React memanggil layanan native Tauri untuk membaca data referensi dan menyimpan kandidat. Inferensi dan pemeringkatan dijalankan oleh satu proses pendamping (_sidecar_) melalui protokol JSON-lines dengan identitas permintaan.

- **Database referensi** — `src-tauri/resources/data/genefield-reference.sqlite`, dibaca tanpa mengubah isinya; berisi galur, ringkasan fenotipe, silsilah, dan statistik sumber.
- **Database workspace** — `genefield.db` pada direktori konfigurasi aplikasi; menyimpan kandidat, snapshot estimasi, tujuan, bobot, dan catatan.
- **Runtime model** — executable `final-v1` beserta seluruh direktori `_internal/`; model yang sudah dibekukan digunakan tanpa pelatihan ulang.

Alur analisis desktop berjalan lokal setelah sumber daya tersedia. Instalasi dependensi dan penyiapan lingkungan pengembangan dapat memerlukan internet.

## Menjalankan dari source

### Prasyarat

- Windows x64 untuk menjalankan integrasi sidecar yang tersedia.
- Node.js 24.x dan npm, sesuai persyaratan dependensi pada lockfile.
- Rust/Cargo dengan toolchain MSVC dan Microsoft C++ Build Tools.
- Microsoft Edge WebView2 Runtime.
- Python 3 untuk menjalankan skrip impor dan pemeriksaan data; Python terpisah tidak diperlukan oleh aplikasi terpaket karena runtime disertakan bersama sidecar.
- Distribusi lengkap `final-v1` dari proyek ML GeneField beserta manifest checksum dan bundle aslinya.

**Runtime model tidak disimpan di Git.** Clone repo ini saja belum cukup untuk menjalankan analisis native. Diperlukan akses ke distribusi model yang sesuai; repo ini tidak mengunduh atau melatih model secara otomatis. Database referensi SQLite sudah disertakan.

### 1. Clone dan instal dependensi

```powershell
git clone https://github.com/wilanta/genefield-app.git
cd genefield-app
npm ci
```

### 2. Impor runtime model

Siapkan proyek ML dengan struktur sumber berikut:

```text
genefield-ml/
├── dist/genefield-final-v1/
│   ├── genefield-final-v1.exe
│   └── _internal/
├── reports/windows-sidecar/package_checksums.json
└── bundles/final-v1/
```

Jalankan dari root repo aplikasi. Ganti path contoh dengan lokasi proyek ML di komputer Anda:

```powershell
$mlRoot = 'C:\path\to\genefield-ml'
python -B scripts/import-sidecar.py --ml-root $mlRoot
```

Skrip menyalin runtime dan memeriksa hash terhadap distribusi sumber, manifest rilis, serta bundle asli. Hasil impor berada di:

```text
src-tauri/binaries/
├── genefield-final-v1-x86_64-pc-windows-msvc.exe
└── _internal/
```

Pertahankan seluruh isi `_internal/`. Executable saja tidak cukup. Detail penyiapan dan pembangunan ulang database referensi tersedia di [panduan integrasi](docs/GENEFIELD_INTEGRATION.md).

### 3. Jalankan aplikasi desktop

```powershell
npm run tauri dev
```

Perintah ini menyiapkan resource pengembangan dan menjalankan Vite serta jendela Tauri. Vite memakai port tetap `1420`; pastikan port tersebut tersedia.

Untuk mengerjakan tampilan melalui browser:

```powershell
npm run dev
```

Buka `http://localhost:1420`. Mode browser memiliki keterbatasan: layanan referensi native dan inferensi memerlukan Tauri sehingga halaman terkait dapat menampilkan kegagalan pemuatan. Penyimpanan kandidat pada browser hanya berada di memori selama sesi dan hilang saat dimuat ulang. Keberhasilan preview browser belum membuktikan alur desktop berfungsi.

## Build dan verifikasi

Build frontend:

```powershell
npm run build
```

Build installer Windows setelah runtime model dan prasyarat native tersedia:

```powershell
npm run tauri build -- --bundles nsis
```

Installer dihasilkan di `src-tauri/target/release/bundle/nsis/`. Distribusi menyertakan sidecar, direktori `_internal/`, database referensi, dan pemberitahuan lisensi pihak ketiga. Untuk penggunaan offline, pastikan WebView2 sudah terpasang. Status pengujian installer dan batas lingkungannya dijelaskan dalam [laporan kesiapan rilis](docs/GENEFIELD_RELEASE_READINESS.md) dan [catatan startup 0.1.1](docs/GENEFIELD_STARTUP_FIX.md).

Pemeriksaan yang tersedia:

```powershell
npm run typecheck
npm test
npm run test:reference
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Suite `npm test` mencakup pengujian terhadap executable sidecar asli, sehingga runtime yang sudah diimpor diperlukan. Pengujian referensi memakai database yang disertakan dan modul standar Python. Panduan integrasi memuat langkah smoke test pada jendela Tauri asli; laporan dalam `docs/` mencatat pengujian pada versi dan lingkungan masing-masing.

## Struktur proyek

```text
src/                         Antarmuka, halaman, layanan data, dan lokalisasi
src-tauri/src/               Integrasi native Rust dan akses data referensi
src-tauri/binaries/          Runtime model lokal; diabaikan oleh Git
src-tauri/resources/data/    Database referensi SQLite
src-tauri/resources/notices/ Lisensi, atribusi, dan inventaris pihak ketiga
scripts/                     Impor runtime, build data, dan verifikasi
docs/                        Panduan teknis dan bukti pengujian
```

## Batasan ilmiah

- Ruang lingkup model adalah data historis INIA yang terwakili; generalisasi ke plasma nutfah eksternal belum didukung.
- Seleksi historis, lingkungan, generasi, dan kekerabatan memengaruhi interpretasi estimasi.
- Interval ketidakpastian yang terkalibrasi belum tersedia.
- Validasi historis dan pengujian perangkat lunak tidak merupakan validasi lapangan atau persetujuan pakar eksternal.

Gunakan hasil untuk menyusun prioritas kandidat yang kemudian ditinjau dan diuji lebih lanjut.

## Dokumentasi dan kontribusi

- [Integrasi data, sidecar, dan pengujian native](docs/GENEFIELD_INTEGRATION.md)
- [Laporan kesiapan rilis Windows](docs/GENEFIELD_RELEASE_READINESS.md)
- [Pemulihan startup 0.1.1](docs/GENEFIELD_STARTUP_FIX.md)
- [Pengaturan bahasa dan panduan terjemahan](docs/LANGUAGE_SETTINGS.md)

Laporan bug dan usulan perbaikan dapat diajukan melalui [Issues](https://github.com/wilanta/genefield-app/issues). Sertakan langkah reproduksi, versi aplikasi, lingkungan, serta hasil yang diharapkan dan yang terjadi. Untuk perubahan kode, jalankan pemeriksaan yang sesuai dan jelaskan hasilnya pada pull request. Perubahan model atau klaim ilmiah memerlukan peninjauan bukti tersendiri.

## Lisensi dan atribusi

Kode GeneField dalam repo ini tersedia di bawah [Lisensi MIT](LICENSE), © 2026 Wil Antara. Dependensi, runtime, font, dan data mengikuti ketentuan masing-masing; lihat [pemberitahuan distribusi](src-tauri/resources/notices/DISTRIBUTION_NOTICES.txt) dan [inventaris pihak ketiga](src-tauri/resources/notices/inventory.json).

Data referensi berasal dari **INIA Rice Breeding Program Historical Dataset**, Rebollo, Scheffel, Blanco et al. (2023), Dryad, DOI: [10.5061/dryad.x69p8czn8](https://doi.org/10.5061/dryad.x69p8czn8), yang didistribusikan sebagai CC0 1.0. Penggunaan dataset tidak menyiratkan dukungan penulis atau institusi terhadap GeneField.
