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
  ],
})

export default router
