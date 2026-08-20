import { toolRegistry } from '@/data/tools'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const toolRoutes: RouteRecordRaw[] = toolRegistry.map((tool) => ({
  path: tool.path,
  name: tool.toolKey,
  component: tool.component,
  ...(tool.routeProps ? { props: tool.routeProps } : {}),
}))

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
    ...toolRoutes,
  ],
})

export default router
