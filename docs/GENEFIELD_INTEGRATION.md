# Integrasi desktop GeneField final-v1

Integrasi pengembangan Windows x64 menggunakan UI yang ada, data referensi nyata, dan sidecar final-v1 yang dibekukan. Model tidak dilatih ulang. Hasil adalah estimasi model pada tingkat persilangan berdasarkan keturunan historis untuk germplasm INIA yang terwakili; persetujuan ilmiah/pemulia tetap mengikuti status manifest. Laporan lengkap A–AT: [GENEFIELD_INTEGRATION_REPORT.md](GENEFIELD_INTEGRATION_REPORT.md).

## Pembagian data

| Sumber | Tanggung jawab | Lokasi runtime |
| --- | --- | --- |
| Sidecar final-v1 | Prediksi, ranking, historical_pair, metadata | EXE + `_internal/` berdampingan |
| SQLite referensi | Penelusuran galur, profil historis, pedigree, statistik sumber | `data/genefield-reference.sqlite`, dibuka read-only oleh Rust |
| SQLite workspace | Kandidat tersimpan, snapshot prediksi, objektif, bobot, skor aplikasi, catatan | Direktori konfigurasi aplikasi, `genefield.db` |

SQL referensi hanya ada dalam `src-tauri/src/reference.rs`; komponen React memakai `referenceService`. Snapshot kecil untuk browsing dimuat sekali dan dicache. SQL workspace tetap menggunakan adapter `CandidateStore` yang sudah ada. Migrasi v3 menambahkan `analysis_json` tanpa menghapus data pengguna. Mode browser memakai penyimpanan sesi yang diberi label, tetapi layanan referensi/ML gagal secara jelas di luar Tauri. Tidak ada fallback mock atau mode mock produksi. Helper seeding lama hanya dipakai tes; workspace baru kosong.

## Sumber dan pembangunan referensi

| Berkas ML | Transformasi | Tabel |
| --- | --- | --- |
| `data/processed/line_phenotypes.parquet` | Means GY/DTF/NO/LB per LINE_ID; null tetap null | `line_trait_summary` |
| `data/processed/genotype_ids.csv` | Membership ID tanpa matriks SNP | `lines.has_genotype` |
| `data/raw/Lines.txt` | Parser token mengikuti prepare_data.py; ID dan metadata dipertahankan | `lines`, `pedigree` |
| `data/raw/Phenotypes.txt` | Kolom LINE_ID dan empat trait; hitung observasi dan reproduksi mean processed | `lines.observation_count`, `line_trait_summary.observation_count`, `dataset_summary` |

Processed pair summaries/registries tidak menyimpan child-parent edges atau jumlah observasi per galur. Karena itu Lines.txt dan kolom phenotype terpilih diperlukan. Tidak menyalin tabel mentah ke frontend. Tidak memerlukan trial/location UI; tidak membuat tabel tambahan. SNP mentah, matriks genomik, eksperimen dan OOF tidak disalin. Evidence/model cards yang sudah berada di dalam bundle beku tetap disertakan tanpa perubahan.

Builder memakai pandas/pyarrow pada waktu pembangunan saja. SQLite tidak memerlukan Python pada runtime. Gunakan venv ML yang sudah ada, tanpa menjalankan prepare_data.py atau pelatihan:

```powershell
$mlRoot = 'C:\Users\sheil\OneDrive\Dokumen\Wildhan\projects\genefield-ml'
& "$mlRoot\.venv\Scripts\python.exe" -B scripts/build-reference.py --ml-root $mlRoot
python -B scripts/test-reference.py
```

Jika data referensi berubah, jalankan builder, tes, dan periksa provenance/hash serta jumlah baris. Perubahan data referensi tidak mengizinkan perubahan bundle final-v1. Builder memverifikasi means, ID unik, joins, parent references, DAG pedigree, null, units dan integrity. Urutan insert tetap, tanpa timestamp, lalu VACUUM; pembangunan ulang memberikan SHA256 identik.

Schema: `lines(line_id,generation,germplasm_type,bank_id,flar_id,has_genotype,observation_count)`; `line_trait_summary(line_id,trait,mean_value,observation_count,units)`; `pedigree(line_id,parent_1,parent_2)`; `dataset_summary(key,value)`.

## Runtime beku dan setup

Import otomatis dari distribusi terpercaya, tanpa membangun ulang PyInstaller:

```powershell
python -B scripts/import-sidecar.py --ml-root $mlRoot
npm ci
npm run tauri dev
```

Import membandingkan seluruh 645 file dengan sumber dan checksum Phase G serta checksum bundle. Runtime hasil import sengaja diabaikan Git (216,683,310 byte); provenance/hash dan script disimpan. Database referensi 7,577,600 byte adalah resource aplikasi yang dapat diversi. Tidak ada source ML path di kode runtime aplikasi.

```text
src-tauri/binaries/
  genefield-final-v1-x86_64-pc-windows-msvc.exe
  _internal/
    bundles/final-v1/           # satu bundle dalam paket
    schemas/final-v1.schema.json
    ... seluruh runtime Python/native libraries
src-tauri/resources/data/genefield-reference.sqlite
```

`externalBin` memilih executable. Resource mapping `binaries/_internal/ -> _internal/` menempatkannya di sebelah executable pada paket Windows; database dipetakan ke `data/`. Helper `stage-runtime.mjs` menyiapkan adjacency dalam debug output untuk `tauri dev`. Cache build bukan salinan bundle produk terpisah. Packaging mengikuti [panduan sidecar](https://v2.tauri.app/develop/sidecar/) dan [resource mapping Tauri](https://v2.tauri.app/develop/resources/); placement installer masih harus diuji.

## Inference dan lifecycle

Client berdasarkan handoff TypeScript ML menggunakan protocol `1.0.0`, bundle `final-v1`, artifact `2.0.0`, stdin/stdout JSON-lines dan request_id. Satu owner proses untuk window, shared startup promise, dan health metadata yang memverifikasi empat trait, directions dan units. Model/genomic preprocessing sepenuhnya di sidecar.

Timeout: metadata 45 s, predict 10 s, historical_pair 5 s, rank 30 s. Process exit/error menolak pending requests; tidak spawn ulang otomatis. Settings menyediakan restart terkontrol. Window close menunggu stop lalu destroy; shell plugin juga membersihkan child pada exit. beforeunload menghentikan client saat reload; dev hot updates memakai owner yang sama. Perubahan input membatalkan tampilan hasil lama dan lock mencegah klik ganda.

Shell ACL hanya mengizinkan spawn `binaries/genefield-final-v1` tanpa args, stdin write, dan kill. Tidak ada execute/open arbitrary shell. `core:window:allow-destroy` diperlukan untuk cleanup saat close. Runtime detection menggunakan core `isTauri()`, bukan global __TAURI__ opsional.

Breed Designer memilih intersection training-parent IDs untuk trait aktif, lalu mengirim pasangan dan bobot ke sidecar. Urutan ranking backend dipertahankan. Self-cross, reverse/duplicate dan semua historical pairs dikecualikan oleh backend. DTF memerlukan pilihan lebih cepat/minimize atau lebih lambat/maximize; prediksi angka DTF tidak memakai objective. Skor adalah prioritisasi aplikasi. NO/LB adalah rating numerik severity, bukan kategori ketahanan. Semua kegagalan ML menghasilkan pesan Indonesia dan diagnostics di console.

## Verifikasi

```powershell
npm run typecheck
npm run build
npm test
python -B scripts/test-reference.py
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Untuk smoke otomatis pada **window Tauri asli**, debug port hanya untuk pengembangan:

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS='--remote-debugging-port=9223'
npm run tauri dev
# Terminal kedua:
node scripts/smoke-desktop.mjs
```

Smoke menggunakan WebView2/CDP, native invoke, SQL asli dan EXE asli, bukan browser Vite yang memalsukan Tauri. Tes Node client mengganti transport Tauri saja dengan pipes EXE asli; ACL diuji terpisah dalam window native. Tes lifecycle juga menggunakan transport sintetis untuk timeout/out-of-order/cleanup. Tidak ada frontend test yang melatih model.

## Batas yang masih ada

Development integration lulus; installer belum dibangun/diinstall. Validasi offline terpasang, placement resource installer, notices/lisensi distribusi, dan persetujuan ilmiah/pemulia adalah tahap berikutnya. Terdapat tujuh advisory high pada dependency chain shadcn yang sudah ada, warning ukuran chunk frontend, serta pesan React CSR dari inline script next-themes bawaan. Tidak ada page exception pada smoke. Utilities Settings untuk backup/restore/log belum diimplementasikan di template; sekarang menampilkan pemberitahuan, bukan keberhasilan palsu. Tidak ada UI compare terpisah yang perlu dimigrasikan. Cache release yang tidak terpakai tetap ignored karena automatic approval review menolak penghapusannya dengan alasan blocked by policy.
