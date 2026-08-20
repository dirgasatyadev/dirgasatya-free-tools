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
  ],
})

export default router
