import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'beranda',
      component: () => import('@/pages/BerandaPage.vue'),
    },
    {
      path: '/free-tools',
      name: 'free-tools',
      component: () => import('@/pages/FreeToolsPage.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/AboutPage.vue'),
    },
    {
      path: '/changelog',
      name: 'changelog',
      component: () => import('@/pages/ChangelogPage.vue'),
    },
    {
      path: '/tools/png-to-avif',
      name: 'png-to-avif',
      component: () => import('@/pages/PNGToAvifPage.vue'),
    },
    {
      path: '/tools/green-screen-remover',
      name: 'green-screen-remover',
      component: () => import('@/pages/GreenScreenRemoverPage.vue'),
    },
    {
      path: '/tools/bcrypt-encoder-decoder',
      name: 'bcrypt-encoder-decoder',
      component: () => import('@/pages/PasswordHashPage.vue'),
      props: { algorithm: 'bcrypt' },
    },
    {
      path: '/tools/argon2id-encoder-decoder',
      name: 'argon2id-encoder-decoder',
      component: () => import('@/pages/PasswordHashPage.vue'),
      props: { algorithm: 'argon2id' },
    },
    {
      path: '/tools/sha-256-generator',
      name: 'sha-256-generator',
      component: () => import('@/pages/HashGeneratorPage.vue'),
      props: { algorithm: 'SHA-256' },
    },
    {
      path: '/tools/sha-512-generator',
      name: 'sha-512-generator',
      component: () => import('@/pages/HashGeneratorPage.vue'),
      props: { algorithm: 'SHA-512' },
    },
    {
      path: '/tools/jwt-generator',
      name: 'jwt-generator',
      component: () => import('@/pages/JwtGeneratorPage.vue'),
    },
    {
      path: '/tools/png-to-webp',
      name: 'png-to-webp',
      component: () => import('@/pages/PNGToWebpPage.vue'),
    },
    {
      path: '/tools/compress-image',
      name: 'compress-image',
      component: () => import('@/pages/CompressImagePage.vue'),
    },
    {
      path: '/tools/svg-maker',
      name: 'svg-maker',
      component: () => import('@/pages/SvgMakerPage.vue'),
    },
    {
      path: '/tools/favicon-generator',
      name: 'favicon-generator',
      component: () => import('@/pages/FaviconGeneratorPage.vue'),
    },
  ],
})

export default router
