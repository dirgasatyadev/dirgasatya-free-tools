import type { ChangelogEntry } from '@/type/changelog'

export const changelog: ChangelogEntry[] = [
  {
    version: 'v0.4.0',
    date: '20 Agustus 2026',
    title: 'Green Screen Remover',
    description:
      'Tool penghapus green screen berbasis browser dengan kontrol warna, crop, dan dukungan pemrosesan massal.',
    scope: 'Green Screen Remover',
    icon: 'mdi:account-box-outline',
    latest: true,
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
        text: 'Filter kategori menggunakan Select2 dan mendukung pencarian kategori.',
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
