# Dirgasatya Free Tools

Kumpulan free tool berbasis Vue, TypeScript, Tailwind CSS, Pinia, dan Iconify MDI.

## Development

```sh
npm install
npm run dev
```

## Pemeriksaan project

```sh
npm run lint
npm run type-check
npm run test:unit -- --run
npm run build
```

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
