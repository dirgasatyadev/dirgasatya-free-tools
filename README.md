# Dearga Free Tools

Kumpulan free tool berbasis Vue, TypeScript, Tailwind CSS, Pinia, dan Iconify MDI.

## Development

```sh
npm install
npm run dev
```

## Pemeriksaan project

```sh
npm run lint
npm run lint:check
npm run type-check
npm test
npm run test:coverage
npm run build
npm run test:e2e:install
npm run test:e2e
```

`lint` memperbaiki source lokal, sedangkan `lint:check` hanya memverifikasi dan digunakan oleh CI. Saat build production, set `SITE_URL` atau `VITE_SITE_URL` ke origin deployment agar canonical URL, sitemap, dan robots.txt menggunakan domain yang benar.

`npm run test:coverage` menghasilkan laporan text, JSON summary, HTML, dan LCOV di folder `coverage/`. CI mengunggah folder tersebut sebagai artifact. Coverage masih bersifat baseline reporting dan belum memakai threshold minimum.

`npm run build` menjalankan type-check dan production build. Production build selalu menjalankan `icons:check` sebelum Vite, sehingga subset Iconify yang tertinggal akan menghentikan build maupun deploy. Setelah menambahkan icon MDI baru, perbarui subset dengan:

```sh
npm run icons:generate
```

Build juga menghasilkan static SEO pages serta laporan ukuran bundle raw/gzip di `bundle-report.json` dan `bundle-report.md`. Budget homepage 250 KiB gzip dan largest route 600 KiB gzip berlaku mutlak; pelanggaran budget menghentikan build. Worker memakai format ES agar parser dan engine berat tetap menjadi async chunk yang baru diambil ketika fitur terkait dijalankan, sedangkan file WASM dilacak terpisah.

Playwright menjalankan 26 flow penting per browser, atau 52 test pada Chromium dan WebKit. Cakupannya meliputi route/SEO/404, image pipeline dan transfer, worker timeout, formatter, JSON tools, SVG optimizer, ZIP, serta export file. Perintah instalasi browser cukup dijalankan sekali pada mesin development.

## Cloudflare Workers

Project menggunakan Cloudflare Workers Static Assets. Konfigurasi berada di `wrangler.jsonc`; route yang dikenal memiliki static HTML hasil generator SEO, sedangkan URL yang tidak ditemukan dilayani melalui generated `404.html` dengan `not_found_handling: "404-page"`, bukan fallback SPA ke halaman utama.

Validasi build dan deployment tanpa mengunggah:

```sh
npm run deploy:dry-run
```

Deployment production:

```sh
npx wrangler login
npm run deploy
```

Perintah deploy selalu melewati type-check, validasi subset icon, production build, SEO generation, dan bundle-size report sebelum menjalankan Wrangler.

Perbarui type declarations setelah mengubah konfigurasi Wrangler:

```sh
npm run cf-typegen
```

## Lisensi

Project ini tersedia di bawah [MIT License](LICENSE).
