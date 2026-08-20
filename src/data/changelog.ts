import type { ChangelogEntry } from '@/type/changelog'

export const changelog: ChangelogEntry[] = [
  {
    version: 'v0.16.0',
    date: '20 Agustus 2026',
    title: 'JSON Workbench & TypeScript Inference',
    description: 'JSONPath filter yang langsung dapat dieksplorasi dan generator TypeScript dengan schema inference yang lebih matang.',
    scope: 'JSON Developer Tools',
    icon: 'mdi:language-typescript',
    latest: true,
    changes: [
      { type: 'Peningkatan', text: 'JSON Explorer memakai contoh tree user yang jelas dan query filter $.users[?(@.active)].email dengan result JSON gabungan.' },
      { type: 'Peningkatan', text: 'JSONPath tetap berjalan dalam evaluation mode safe serta menampilkan value, path, salin, dan download hasil.' },
      { type: 'Baru', text: 'JSON → TypeScript Generator menghasilkan interface atau type dengan root name custom, nested declarations, primitive arrays, dan object-array inference.' },
      { type: 'Peningkatan', text: 'Field yang hilang pada sebagian sample array otomatis optional dan nullable dapat dideteksi sebagai union dengan null.' },
      { type: 'Peningkatan', text: 'Generator menyediakan optional fields, readonly properties, validasi input 5 MB, drag-and-drop, copy, dan download .ts.' },
    ],
  },
  {
    version: 'v0.15.0',
    date: '20 Agustus 2026',
    title: 'SVG Optimization & Code Formatting',
    description: 'Optimasi dan konversi SVG yang aman serta formatter/minifier bersama untuk lima bahasa developer.',
    scope: 'SVG & Code Tools',
    icon: 'mdi:code-braces',
    changes: [
      { type: 'Baru', text: 'SVG Optimizer & Converter memvalidasi dan menyaring SVG, menghapus metadata, komentar, group tidak perlu, menyederhanakan atribut, serta menyediakan mode minify dan prettify.' },
      { type: 'Baru', text: 'SVG dapat diekspor sebagai optimized SVG, PNG, WebP, atau Data URL dengan aspect ratio lock dan pixel budget adaptif.' },
      { type: 'Peningkatan', text: 'Perbandingan ukuran menampilkan byte original, optimized, dan persentase penghematan secara langsung.' },
      { type: 'Baru', text: 'Code Formatter & Minifier menangani HTML, CSS, JavaScript, TypeScript, dan SQL melalui satu halaman, composable, dan Web Worker.' },
      { type: 'Peningkatan', text: 'Formatter menyediakan indent 2/4/tabs, upload, copy, download, ukuran input/output, savings, cancellation, dan batas input defensif.' },
      { type: 'Infrastruktur', text: 'Lima route SEO bahasa berbagi engine dan halaman yang sama tanpa menduplikasi implementasi.' },
    ],
  },
  {
    version: 'v0.14.0',
    date: '20 Agustus 2026',
    title: 'Universal Image Editing & JSON Explorer',
    description: 'Dua workflow gambar batch berbasis satu worker engine serta explorer JSON interaktif dengan JSONPath.',
    scope: 'Image & JSON Tools',
    icon: 'mdi:image-edit-outline',
    changes: [
      { type: 'Baru', text: 'Image Resizer & Cropper mendukung width/height, aspect lock, percentage, preset populer, contain/cover/stretch, visual crop, empat format output, dan batch ZIP.' },
      { type: 'Baru', text: 'Universal Image Converter menerima PNG, JPG/JPEG, WebP, dan AVIF lalu menghasilkan PNG, JPEG, WebP, atau AVIF melalui satu katalog tool.' },
      { type: 'Peningkatan', text: 'Pipeline transform gambar bersama memakai adaptive pixel budget, persistent Web Worker, OffscreenCanvas, fallback main thread, AbortController, shared queue, object URL pool, dan filename sanitation.' },
      { type: 'Peningkatan', text: 'Universal converter menyediakan quality, resize optional, fit mode, crop per file, dan strip metadata melalui canvas re-encode.' },
      { type: 'Baru', text: 'JSON Explorer + JSONPath menampilkan tree expand/collapse, pencarian key/value/path, salin path atau value, query safe, serta download hasil JSON.' },
    ],
  },
  {
    version: 'v0.13.2',
    date: '20 Agustus 2026',
    title: 'Routing, Resource Controls & Offline UI',
    description: 'HTTP 404 yang benar, defensive workload limits, pembatalan operasi file, dan pengurangan ketergantungan runtime eksternal.',
    scope: 'Routing & Security',
    icon: 'mdi:shield-lock-outline',
    changes: [
      { type: 'Infrastruktur', text: 'Cloudflare Static Assets memakai drop-trailing-slash dan 404-page, menghasilkan dist/404.html, serta Vue memiliki route catch-all untuk navigasi SPA invalid.' },
      { type: 'Keamanan', text: 'Bcrypt dan Argon2id verifier memvalidasi version, cost, memory, iterations, parallelism, salt, dan hash length sebelum menjalankan WASM.' },
      { type: 'Peningkatan', text: 'Generate dan verify Bcrypt/Argon2id berjalan di Web Worker dengan tombol pembatalan agar pekerjaan berat tidak mengunci UI.' },
      { type: 'Peningkatan', text: 'Checksum file serta ekstraksi ZIP menerima AbortSignal dan menyediakan tombol cancel yang benar-benar menghentikan pekerjaan.' },
      { type: 'Peningkatan', text: 'Batch PNG to AVIF mempertahankan satu worker dan instance encoder selama antrean, lalu menghentikannya setelah batch selesai.' },
      { type: 'Peningkatan', text: 'Perubahan properti inspector SVG Maker kini dicatat sebagai transaksi undo/redo.' },
      { type: 'Infrastruktur', text: 'Playwright memakai hasil build CI yang sudah tersedia sehingga production build tidak dijalankan dua kali.' },
      { type: 'Infrastruktur', text: 'Hanya subset ikon MDI yang dipakai aplikasi yang diregistrasikan secara lokal; CI memverifikasi subset tetap sinkron.' },
      { type: 'Keamanan', text: 'Static responses mendapat nosniff, referrer policy, permissions policy, dan proteksi framing melalui public/_headers.' },
    ],
  },
  {
    version: 'v0.13.1',
    date: '20 Agustus 2026',
    title: 'Runtime Reliability & Browser Coverage',
    description: 'Perbaikan codec Cron, pipeline gambar, ZIP memory safety, streaming data, SEO, dan validasi browser nyata.',
    scope: 'Reliability & Browser Testing',
    icon: 'mdi:test-tube',
    changes: [
      { type: 'Peningkatan', text: 'Quartz Cron memetakan weekday numeric canonical SUN=0…SAT=6 ke format Quartz 1…7 tanpa membuat preview berbeda dari ekspresi.' },
      { type: 'Peningkatan', text: 'Green Screen memperbaiki nama input AVIF dan menambahkan pembatalan untuk worker, editor, serta seluruh batch.' },
      { type: 'Peningkatan', text: 'PNG to WebP kini memakai Web Worker, OffscreenCanvas, fallback main-thread, pixel budget adaptif, shared queue, dan cancellation.' },
      { type: 'Keamanan', text: 'ZIP Create membatasi 1.000 file dan total sumber secara adaptif, memberi warning di atas 500 MB, serta mendukung pembatalan kompresi; budget ekstraksi juga adaptif.' },
      { type: 'Peningkatan', text: 'Compress Image memakai pixel budget adaptif berdasarkan memory perangkat.' },
      { type: 'Peningkatan', text: 'CSV besar dapat ditransformasi langsung ke file melalui WritableStream tanpa menampung seluruh output di textarea.' },
      { type: 'Infrastruktur', text: 'Pipeline nama file AVIF, WebP, Green Screen, dan Compressor memakai helper bersama agar sanitasi serta deduplikasi konsisten.' },
      { type: 'Infrastruktur', text: 'Playwright menguji delapan flow penting di Chromium dan WebKit, termasuk image worker, ZIP round-trip, route langsung, serta regex timeout; smoke test dijalankan oleh CI.' },
      { type: 'Peningkatan', text: 'Runtime SEO homepage tidak lagi menghasilkan title Dearga Free Tools yang terduplikasi.' },
    ],
  },
  {
    version: 'v0.13.0',
    date: '20 Agustus 2026',
    title: 'Correctness, Platform & Product Quality',
    description: 'Peningkatan correctness calculator/data, cron profesional, SEO route, CI, favicon, image pipeline, SVG, dan katalog.',
    scope: 'Correctness & Platform',
    icon: 'mdi:check-decagram-outline',
    changes: [
      { type: 'Peningkatan', text: 'Aspect Ratio Calculator memvalidasi dimensi pixel sebagai safe integer, mendukung rasio custom/desimal, lock ratio, hitung dua arah, dan preset cinematic.' },
      { type: 'Peningkatan', text: 'XML ↔ JSON memakai AST preserve-order untuk mixed content, namespace, atribut, CDATA, komentar, processing instruction, dan repeated element.' },
      { type: 'Peningkatan', text: 'Cron Builder menambahkan parser, validator tanpa silent clamping, list/alias/step-range, dialect Unix/GitHub/Quartz, timezone, dan lima preview eksekusi.' },
      { type: 'Infrastruktur', text: 'GitHub Actions CI menjalankan npm ci, lint read-only, type-check, unit test sekali jalan, dan production build.' },
      { type: 'Peningkatan', text: 'SEO route otomatis mencakup title, description, canonical, Open Graph, Twitter Card, JSON-LD, sitemap, robots, dan HTML prerender untuk seluruh route.' },
      { type: 'Peningkatan', text: 'Favicon Generator menghasilkan ICO multi-size, SVG, ikon maskable, safe-zone preview, manifest purpose, HTML snippet, dan path aset custom dalam ZIP.' },
      { type: 'Peningkatan', text: 'JSON ↔ CSV mendukung delimiter otomatis/custom, BOM, header, strict validation, column preview, type inference, JSON Lines, dan pembacaan file besar berbasis stream.' },
      { type: 'Infrastruktur', text: 'SVG Maker dipisah menjadi canvas, toolbar, layer, pointer, selection, dan history modules dengan undo/redo serta keyboard shortcut.' },
      { type: 'Infrastruktur', text: 'Shared image pipeline menyatukan batch progress, validation, decode, object URL, naming, dan worker client untuk tool gambar.' },
      { type: 'Peningkatan', text: 'Kategori katalog dan beranda kini diturunkan otomatis dari tool yang benar-benar tersedia sehingga kategori kosong tidak tampil.' },
    ],
  },
  {
    version: 'v0.12.1',
    date: '20 Agustus 2026',
    title: 'Security & Performance Hardening',
    description:
      'Proteksi resource dan pemrosesan background untuk tool arsip, regex, serta gambar beresolusi tinggi.',
    scope: 'Security & Performance',
    icon: 'mdi:shield-check-outline',
    changes: [
      { type: 'Keamanan', text: 'ZIP Extractor memblokir entry berukuran atau berasio kompresi ekstrem, membatasi ukuran aktual, dan hanya mengekstrak file yang dipilih.' },
      { type: 'Peningkatan', text: 'Regex Tester menjalankan RegExp di Web Worker dengan debounce, pembatalan job lama, dan timeout 500 ms.' },
      { type: 'Peningkatan', text: 'Green Screen Remover memindahkan pemrosesan pixel ke Worker dan OffscreenCanvas dengan batas megapiksel adaptif berdasarkan memory perangkat.' },
      { type: 'Peningkatan', text: 'PNG to AVIF menjalankan decode dan encoder WASM di Worker, memakai budget memory adaptif, serta menyediakan pembatalan konversi.' },
      { type: 'Peningkatan', text: 'Compress Image memakai Web Worker, mendukung pembatalan, dan memisahkan kontrol kualitas encoder dari target ukuran file.' },
    ],
  },
  {
    version: 'v0.12.0',
    date: '20 Agustus 2026',
    title: 'File, Data & Text Tools',
    description:
      'Enam tool baru untuk arsip ZIP, konversi data terstruktur, penamaan developer, slug SEO, dan perbandingan teks.',
    scope: 'File, Data & Text Tools',
    icon: 'mdi:file-cog-outline',
    changes: [
      { type: 'Baru', text: 'ZIP Creator & Extractor membuat arsip multi-file dengan level kompresi dan mengekstrak entry ZIP untuk download.' },
      { type: 'Baru', text: 'YAML ↔ JSON Converter mendukung nested object, array, scalar, validasi, salin, dan download hasil.' },
      { type: 'Baru', text: 'XML ↔ JSON Converter mempertahankan atribut, text node, dan elemen berulang dalam struktur JSON.' },
      { type: 'Baru', text: 'Case Converter menghasilkan camelCase, PascalCase, snake_case, kebab-case, dan CONSTANT_CASE sekaligus.' },
      { type: 'Baru', text: 'Slug Generator membuat URL slug ramah CMS dan SEO dengan separator serta panjang maksimal yang dapat diatur.' },
      { type: 'Baru', text: 'Text Diff Checker membandingkan maksimal 1.000 baris per sisi dengan tampilan side-by-side dan highlight added, deleted, serta changed.' },
      { type: 'Keamanan', text: 'Arsip dan data diproses lokal di browser tanpa upload ke server.' },
    ],
  },
  {
    version: 'v0.11.0',
    date: '20 Agustus 2026',
    title: 'Calculator, Cron & Checksum Tools',
    description:
      'Sepuluh tool dan peningkatan baru untuk perhitungan web, ukuran file, jaringan, penjadwalan cron, dan verifikasi checksum.',
    scope: 'Calculator, Cron & Checksum Tools',
    icon: 'mdi:calculator-variant-outline',
    changes: [
      { type: 'Baru', text: 'PX ↔ REM Converter mengonversi unit CSS dua arah dengan root font size yang dapat disesuaikan.' },
      { type: 'Baru', text: 'Aspect Ratio Calculator menghitung rasio sederhana dan ukuran target yang tetap proporsional.' },
      { type: 'Baru', text: 'CSS clamp() Calculator menghasilkan formula fluid typography siap salin dari batas ukuran dan viewport.' },
      { type: 'Baru', text: 'Percentage Calculator menyediakan perhitungan persentase dari nilai, rasio, serta kenaikan atau penurunan.' },
      { type: 'Baru', text: 'Screen Resolution / Ratio Calculator menghitung aspect ratio, orientasi, jumlah pixel, megapixel, dan PPI.' },
      { type: 'Baru', text: 'File Size Converter mendukung bit hingga TB dengan pilihan sistem binary atau decimal.' },
      { type: 'Baru', text: 'Bandwidth / Download Time Calculator memperkirakan durasi transfer berdasarkan ukuran file, bandwidth, dan overhead jaringan.' },
      { type: 'Baru', text: 'Cron Expression Builder menyediakan preset dan mode visual untuk nilai tertentu, interval, serta rentang pada lima field cron.' },
      { type: 'Baru', text: 'SHA-384 Generator dan MD5 Generator ditambahkan untuk pemeriksaan integritas data.' },
      { type: 'Peningkatan', text: 'SHA-256, SHA-384, SHA-512, dan MD5 mendukung input teks atau file, drag-and-drop, progress, download checksum, dan expected checksum.' },
      { type: 'Peningkatan', text: 'Katalog dan pengujian lazy-load disesuaikan agar mendukung lebih dari dua halaman tool.' },
      { type: 'Keamanan', text: 'Perhitungan, file, dan checksum tetap diproses secara lokal tanpa dikirim ke server.' },
    ],
  },
  {
    version: 'v0.10.0',
    date: '20 Agustus 2026',
    title: 'Developer, Text & Data Tools',
    description:
      'Sepuluh tool browser-only baru untuk JSON, encoding, identifier, JWT, regex, waktu, teks, data, dan SEO.',
    scope: 'Developer, Text & Data Tools',
    icon: 'mdi:code-braces-box',
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
