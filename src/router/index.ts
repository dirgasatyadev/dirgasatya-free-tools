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

const lazyImportErrorPattern =
  /Failed to fetch dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i

router.onError((error, to) => {
  if (!lazyImportErrorPattern.test(error.message)) {
    console.error('[Router]', error)
    return
  }

  const reloadKey = `router:lazy-reload:${to.fullPath}`
  if (sessionStorage.getItem(reloadKey)) {
    console.error('[Router] Lazy route tetap gagal setelah reload.', error)
    return
  }

  sessionStorage.setItem(reloadKey, '1')
  window.location.assign(to.fullPath)
})

router.afterEach((to, _from, failure) => {
  if (!failure) sessionStorage.removeItem(`router:lazy-reload:${to.fullPath}`)
})

export default router
