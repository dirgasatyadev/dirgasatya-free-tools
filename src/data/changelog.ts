import type { ChangelogEntry } from '@/type/changelog'

export const changelog: ChangelogEntry[] = [
  {
    version: 'v0.10.0',
    date: '20 Agustus 2026',
    title: 'Developer, Text & Data Tools',
    description:
      'Sepuluh tool browser-only baru untuk JSON, encoding, identifier, JWT, regex, waktu, teks, data, dan SEO.',
    scope: 'Developer, Text & Data Tools',
    icon: 'mdi:code-braces-box',
    latest: true,
    changes: [
      { type: 'Baru', text: 'JSON Formatter & Validator menyediakan format, minify, pilihan indent, dan pesan validasi.' },
      { type: 'Baru', text: 'Base64 Encoder & Decoder mendukung teks UTF-8, sedangkan URL Encoder & Decoder mendukung komponen dan URL lengkap.' },
      { type: 'Baru', text: 'UUID Generator membuat hingga 100 UUID v4 menggunakan random kriptografis browser.' },
      { type: 'Baru', text: 'JWT Decoder & Verifier membaca header/payload, status waktu, dan memverifikasi HMAC HS256, HS384, atau HS512.' },
      { type: 'Baru', text: 'Regex Tester menampilkan match, index, capture group, dan preview replacement.' },
      { type: 'Baru', text: 'Unix Timestamp Converter mendukung detik, milidetik, UTC, ISO, dan waktu lokal.' },
      { type: 'Baru', text: 'Word Counter menghitung kata, karakter, kalimat, paragraf, baris, dan estimasi waktu baca.' },
      { type: 'Baru', text: 'JSON ↔ CSV Converter mendukung quoted cell, newline, object bertingkat, salin, dan download hasil.' },
      { type: 'Baru', text: 'Meta Tag Generator membuat SEO, Open Graph, dan Twitter Card beserta social preview.' },
      { type: 'Keamanan', text: 'Seluruh input, secret, dan hasil diproses lokal tanpa dikirim ke server.' },
    ],
  },
  {
    version: 'v0.9.0',
    date: '20 Agustus 2026',
    title: 'Favicon Generator',
    description:
      'Generator paket favicon PNG untuk browser, perangkat Apple, PWA, Android, dan master image.',
    scope: 'Favicon Generator',
    icon: 'mdi:web-box',
    changes: [
      {
        type: 'Baru',
        text: 'Menghasilkan PNG ukuran 16, 32, 48, 64, 96, 120, 152, 167, 180, 192, 384, 512, dan 1024 piksel.',
      },
      {
        type: 'Baru',
        text: 'Input diwajibkan PNG dengan validasi ukuran maksimal 25 MB dan resolusi maksimal 40 megapiksel.',
      },
      {
        type: 'Baru',
        text: 'Mode contain dan cover tersedia dengan pilihan background transparan atau warna khusus.',
      },
      {
        type: 'Peningkatan',
        text: 'Setiap ukuran memiliki preview dan download PNG sendiri, serta dapat diunduh sekaligus melalui ZIP atau penyimpanan langsung.',
      },
      {
        type: 'Peningkatan',
        text: 'Daftar ukuran dirapikan menjadi dua kartu per baris dengan pilihan semua, kosongkan pilihan, dan checkbox per ukuran.',
      },
      {
        type: 'Baru',
        text: 'Paket dapat berisi semua ukuran atau hanya ukuran terpilih dan selalu menyertakan manifest.webmanifest.',
      },
      {
        type: 'Baru',
        text: 'Input URL website digunakan untuk membentuk URL aset ikon pada manifest, dengan fallback URL relatif dari root.',
      },
      {
        type: 'Keamanan',
        text: 'Seluruh resize dan pembuatan favicon berjalan secara lokal tanpa mengunggah PNG sumber.',
      },
    ],
  },
  {
    version: 'v0.8.0',
    date: '20 Agustus 2026',
    title: 'SVG Maker',
    description:
      'Editor vektor lokal untuk membuat, mengatur, menyalin, dan mengunduh SVG langsung dari browser.',
    scope: 'SVG Maker',
    icon: 'mdi:svg',
    changes: [
      {
        type: 'Baru',
        text: 'Menyediakan elemen kotak, lingkaran, elips, garis, dan teks dengan preview SVG langsung.',
      },
      {
        type: 'Baru',
        text: 'Elemen dapat dipindahkan dengan drag serta diatur posisi, ukuran, warna, garis, opacity, dan tipografinya.',
      },
      {
        type: 'Baru',
        text: 'Layer dapat dipilih, diurutkan, diduplikasi, dan dihapus dari panel editor.',
      },
      {
        type: 'Peningkatan',
        text: 'Path kini mempunyai node yang dapat ditambah dari kanvas, dipilih, dipindahkan, diatur koordinatnya, dan dihapus.',
      },
      {
        type: 'Peningkatan',
        text: 'Kotak memiliki empat node sudut untuk mengubah ukuran, sedangkan elips memiliki empat node sumbu untuk mengatur pusat dan radius.',
      },
      {
        type: 'Peningkatan',
        text: 'Preset polygon dan bintang berbasis node tersedia dengan opsi path terbuka atau tertutup.',
      },
      {
        type: 'Peningkatan',
        text: 'Kanvas dilengkapi grid, snap-to-grid yang dapat diatur, serta zoom 50% sampai 200%.',
      },
      {
        type: 'Peningkatan',
        text: 'Ukuran dokumen dan background dapat disesuaikan, termasuk background transparan.',
      },
      {
        type: 'Keamanan',
        text: 'Kode SVG dibuat secara lokal dengan escaping karakter pada teks dan dapat disalin atau diunduh tanpa upload.',
      },
    ],
  },
  {
    version: 'v0.7.0',
    date: '20 Agustus 2026',
    title: 'Compress Image',
    description:
      'Kompresor gambar lokal untuk PNG, WebP, JPG, dan JPEG dengan editor crop serta workflow antar-tool.',
    scope: 'Compress Image',
    icon: 'mdi:image-size-select-small',
    changes: [
      {
        type: 'Baru',
        text: 'Mengompres hingga 100 gambar secara otomatis dan bertahap langsung di browser.',
      },
      {
        type: 'Baru',
        text: 'Mendukung PNG, WebP, JPG, dan JPEG dengan kualitas awal 75% serta format asli yang dipertahankan.',
      },
      {
        type: 'Baru',
        text: 'Editor crop menyediakan bentuk kotak dan lingkaran; hasil lingkaran menjadi PNG transparan.',
      },
      {
        type: 'Peningkatan',
        text: 'Preview, perubahan nama, unduhan satuan, ZIP, penyimpanan langsung, dan transfer ke tool kompatibel tersedia untuk hasil terbaru.',
      },
      {
        type: 'Keamanan',
        text: 'Gambar diproses secara lokal dan metadata tidak disimpan pada hasil kompresi.',
      },
    ],
  },
  {
    version: 'v0.6.0',
    date: '20 Agustus 2026',
    title: 'PNG to WebP',
    description:
      'Konverter WebP lokal dengan antrean otomatis, preview hasil, download massal, dan workflow antar-tool.',
    scope: 'PNG to WebP',
    icon: 'mdi:image-sync-outline',
    changes: [
      {
        type: 'Baru',
        text: 'Mengonversi hingga 100 PNG menjadi WebP secara otomatis dan bertahap langsung di browser.',
      },
      {
        type: 'Baru',
        text: 'Kualitas WebP dapat diatur sebelum upload dengan nilai awal 82%.',
      },
      {
        type: 'Baru',
        text: 'Preview PNG dan WebP, perubahan nama file, download satuan, ZIP, serta penyimpanan langsung tersedia.',
      },
      {
        type: 'Peningkatan',
        text: 'Hasil WebP dapat diteruskan ke Green Screen Remover, dan hasil PNG yang kompatibel dapat dikirim kembali ke PNG to WebP.',
      },
      {
        type: 'Keamanan',
        text: 'Encoder WebP berjalan secara lokal dan memvalidasi MIME hasil agar browser tidak menghasilkan format yang keliru.',
      },
    ],
  },
  {
    version: 'v0.5.0',
    date: '20 Agustus 2026',
    title: 'Developer & Security Tools',
    description:
      'Lima utilitas kriptografi baru untuk password hashing, digest teks, dan pembuatan JWT langsung di browser.',
    scope: 'Security & Developer',
    icon: 'mdi:shield-key-outline',
    changes: [
      {
        type: 'Baru',
        text: 'Bcrypt Hash Generator & Verifier membuat encoded hash dengan salt acak dan memverifikasi password tanpa mendekripsi hash.',
      },
      {
        type: 'Baru',
        text: 'Argon2id Hash Generator & Verifier menyediakan pengaturan memory, iterations, parallelism, hash length, dan verifikasi password.',
      },
      {
        type: 'Baru',
        text: 'SHA-256 Generator dan SHA-512 Generator menghasilkan digest teks otomatis melalui Web Crypto API.',
      },
      {
        type: 'Baru',
        text: 'JWT Generator membuat token HMAC dengan algoritma HS256, HS384, atau HS512 dari header dan payload JSON.',
      },
      {
        type: 'Keamanan',
        text: 'Password, secret, payload, dan hasil kriptografi diproses secara lokal tanpa dikirim ke server.',
      },
    ],
  },
  {
    version: 'v0.4.0',
    date: '20 Agustus 2026',
    title: 'Green Screen Remover',
    description:
      'Tool penghapus green screen berbasis browser dengan kontrol warna, crop, dan dukungan pemrosesan massal.',
    scope: 'Green Screen Remover',
    icon: 'mdi:account-box-outline',
    changes: [
      {
        type: 'Baru',
        text: 'Menghapus latar hijau dari gambar PNG, JPG, dan WebP langsung di browser.',
      },
      {
        type: 'Baru',
        text: 'Mendukung antrean hingga 100 gambar dengan pemrosesan otomatis satu per satu.',
      },
      {
        type: 'Baru',
        text: 'Tersedia pengaturan toleransi warna dan kelembutan tepi untuk memperhalus hasil transparan.',
      },
      {
        type: 'Baru',
        text: 'Modal editor menggunakan panel tool di sisi kanan, eyedropper dengan zoom area 20×20 piksel, color picker, dan crop beresolusi sumber.',
      },
      {
        type: 'Peningkatan',
        text: 'Crop dan warna eyedropper tetap dipertahankan ketika pengaturan diproses ulang.',
      },
      {
        type: 'Peningkatan',
        text: 'Editor crop kini menyediakan bentuk kotak bebas dan lingkaran dengan sudut transparan pada hasil PNG.',
      },
      {
        type: 'Peningkatan',
        text: 'Warna green screen dominan dideteksi otomatis dari tepi setiap gambar agar hasil awal langsung transparan tanpa edit manual.',
      },
      {
        type: 'Peningkatan',
        text: 'Seleksi otomatis diperketat berdasarkan dominasi channel hijau dan cakupan warna pada tepi agar warna non-hijau tidak ikut transparan.',
      },
      {
        type: 'Peningkatan',
        text: 'Hijau gelap bersaturasi rendah seperti #374F34 dilindungi dari seleksi otomatis maupun toleransi eyedropper.',
      },
      {
        type: 'Peningkatan',
        text: 'Kelembutan tepi kini memperlebar feather alpha di kedua sisi batas warna sehingga nilai tinggi menghasilkan perubahan yang terlihat.',
      },
      {
        type: 'Peningkatan',
        text: 'Nilai awal kelembutan tepi Green Screen Remover diatur menjadi 100%.',
      },
      {
        type: 'Peningkatan',
        text: 'Pemrosesan ulang massal menampilkan status “Menerapkan pengaturan”, terpisah dari penghapusan background otomatis.',
      },
      {
        type: 'Peningkatan',
        text: 'Download satuan, ZIP, dan penyimpanan langsung otomatis menggunakan hasil edit terbaru.',
      },
      {
        type: 'Peningkatan',
        text: 'Hasil PNG dari sumber PNG dapat diteruskan langsung ke PNG to AVIF dan diproses otomatis tanpa memilih ulang file.',
      },
      {
        type: 'Peningkatan',
        text: 'Input AVIF kini didukung agar hasil PNG to AVIF dapat langsung diteruskan ke Green Screen Remover.',
      },
    ],
  },
  {
    version: 'v0.3.0',
    date: '20 Agustus 2026',
    title: 'PNG to AVIF',
    description:
      'Konverter AVIF lokal dengan antrean massal, preview, editor crop, dan beberapa metode download.',
    scope: 'PNG to AVIF',
    icon: 'mdi:image-sync-outline',
    changes: [
      {
        type: 'Baru',
        text: 'Mengonversi PNG menjadi AVIF langsung di browser menggunakan encoder WebAssembly.',
      },
      {
        type: 'Peningkatan',
        text: 'Mendukung hingga 100 PNG, pemrosesan bertahap otomatis, dan kualitas awal 38%.',
      },
      {
        type: 'Peningkatan',
        text: 'Validasi membatasi file hingga 25 MB dan resolusi hingga 40 megapiksel.',
      },
      {
        type: 'Baru',
        text: 'Preview PNG asli dan hasil AVIF dapat dibuka melalui modal berukuran besar.',
      },
      {
        type: 'Baru',
        text: 'Editor crop tersedia pada setiap file dan hasilnya menggantikan AVIF yang akan diunduh.',
      },
      {
        type: 'Peningkatan',
        text: 'Editor crop kini menyediakan bentuk kotak bebas dan lingkaran dengan sudut transparan pada hasil AVIF.',
      },
      {
        type: 'Baru',
        text: 'Nama dasar file hasil dapat diubah tanpa mengubah atau menggandakan ekstensi AVIF.',
      },
      {
        type: 'Baru',
        text: 'Hasil dapat diunduh satuan, sebagai ZIP, atau langsung ke folder pilihan browser.',
      },
      {
        type: 'Peningkatan',
        text: 'Progress antrean, status download, galeri scroll, informasi ukuran, dan konfirmasi hapus dirapikan.',
      },
      {
        type: 'Peningkatan',
        text: 'Hasil AVIF dapat diteruskan langsung ke Green Screen Remover dan diproses otomatis tanpa download lalu upload ulang.',
      },
    ],
  },
  {
    version: 'v0.2.0',
    date: '19 Agustus 2026',
    title: 'Pengalaman platform yang lebih lengkap',
    description:
      'Penyempurnaan tampilan, navigasi, pencarian, dan kesiapan deployment di seluruh halaman.',
    scope: 'Platform',
    icon: 'mdi:view-dashboard-outline',
    changes: [
      {
        type: 'Peningkatan',
        text: 'Beranda diperbarui dengan hero, statistik, kategori, tool populer, dan CTA.',
      },
      {
        type: 'Baru',
        text: 'Navbar mobile menggunakan sidebar dengan transisi, backdrop, dan dukungan tombol Escape.',
      },
      {
        type: 'Baru',
        text: 'Filter kategori menggunakan dropdown kustom dengan pencarian tanpa select bawaan browser.',
      },
      {
        type: 'Baru',
        text: 'Katalog Free Tools dapat ditampilkan dalam mode list, grid, atau table.',
      },
      {
        type: 'Peningkatan',
        text: 'Daftar tool dimuat bertahap per 12 data untuk semua hasil dan setiap kategori.',
      },
      {
        type: 'Baru',
        text: 'Dark mode dan light mode tersimpan di localStorage.',
      },
      {
        type: 'Peningkatan',
        text: 'Data dummy dihapus sehingga katalog hanya menampilkan tool yang benar-benar tersedia.',
      },
      {
        type: 'Infrastruktur',
        text: 'Cloudflare Workers Static Assets, fallback SPA, logo, favicon, dan pengujian otomatis disiapkan.',
      },
    ],
  },
  {
    version: 'v0.1.0',
    date: '19 Agustus 2026',
    title: 'Rilis awal Dearga Free Tools',
    description: 'Fondasi pertama untuk katalog utilitas web gratis.',
    scope: 'Platform',
    icon: 'mdi:rocket-launch-outline',
    changes: [
      { type: 'Baru', text: 'Project Vue dan Vite dibuat menggunakan TypeScript.' },
      {
        type: 'Baru',
        text: 'Halaman Beranda, Free Tools, About, dan navigasi utama menggunakan Vue Router.',
      },
      {
        type: 'Baru',
        text: 'Struktur kategori, data, komponen, composable, store, dan halaman disiapkan.',
      },
      {
        type: 'Infrastruktur',
        text: 'Tailwind CSS, Pinia, Iconify MDI, ESLint, Oxlint, dan Vitest dikonfigurasi.',
      },
    ],
  },
]
