# Bahasa antarmuka

Buka **Settings → Application → Language preference**, lalu pilih **Bahasa
Indonesia**. Tampilan langsung berubah; pilihan disimpan lokal dan dipakai lagi
saat aplikasi dibuka. Untuk kembali, pilih **English** melalui
**Pengaturan → Aplikasi → Pilihan bahasa**.

Pengaturan bahasa memakai `genefield-language` di penyimpanan lokal, dengan
English sebagai bahasa awal. Jika penyimpanan tidak tersedia, pergantian tetap
berfungsi selama sesi berjalan.

Terjemahan tampilan berada di `src/locales/id.json`, dengan teks Inggris sebagai
kunci. Gunakan `useTranslation()` untuk label, pesan, dan format lokal; gunakan
placeholder seperti `{id}` untuk nilai dinamis. ID galur, nama dan catatan yang
diisi pengguna, kode sifat, identitas model, serta data analisis tetap mengikuti
data aslinya. Bahasa antarmuka tidak mengubah kelayakan tetua, peringkat, atau
status persetujuan ilmiah model.

Verifikasi: `npm test`, `npm run typecheck`, dan `npm run build`.
