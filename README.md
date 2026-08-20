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
npm run build
```

`lint` memperbaiki source lokal, sedangkan `lint:check` hanya memverifikasi dan digunakan oleh CI. Saat build production, set `SITE_URL` atau `VITE_SITE_URL` ke origin deployment agar canonical URL, sitemap, dan robots.txt menggunakan domain yang benar.

## Cloudflare Workers

Project menggunakan Cloudflare Workers Static Assets. Konfigurasi berada di `wrangler.jsonc` dan route Vue Router memakai fallback SPA.

Validasi build dan deployment tanpa mengunggah:

```sh
npm run deploy:dry-run
```

Deployment production:

```sh
npx wrangler login
npm run deploy
```

Perbarui type declarations setelah mengubah konfigurasi Wrangler:

```sh
npm run cf-typegen
```
