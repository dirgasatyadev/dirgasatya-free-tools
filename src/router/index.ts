import { toolRegistry } from '@/data/tools'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { toolSeoTitle, updateRouteSeo } from '@/composables/useRouteSeo'
import { codeFormatterAliases } from '@/data/toolAliases'

const toolRoutes: RouteRecordRaw[] = toolRegistry.map((tool) => ({
  path: tool.path,
  name: tool.toolKey,
  component: tool.component,
  meta: { seoTitle: toolSeoTitle(tool.name), seoDescription: tool.description, applicationName: tool.name },
  ...(tool.routeProps ? { props: tool.routeProps } : {}),
}))

const aliasRoutes: RouteRecordRaw[] = codeFormatterAliases.map((route) => ({
  path: route.path,
  name: route.name,
  component: () => import('@/pages/CodeFormatterPage.vue'),
  props: { initialLanguage: route.language },
  meta: { seoTitle: route.title, seoDescription: route.description, applicationName: route.title },
}))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'beranda',
      component: () => import('@/pages/BerandaPage.vue'),
      meta: { seoTitle: 'Dearga Free Tools', seoDescription: 'Kumpulan free tool praktis untuk developer, kreator, dan pekerja digital.' },
    },
    {
      path: '/free-tools',
      name: 'free-tools',
      component: () => import('@/pages/FreeToolsPage.vue'),
      meta: { seoTitle: 'Free Online Tools', seoDescription: 'Jelajahi koleksi utility gratis untuk developer, teks, gambar, data, keamanan, dan produktivitas.' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/AboutPage.vue'),
      meta: { seoTitle: 'About', seoDescription: 'Tentang Dearga Free Tools dan prinsip pemrosesan data secara lokal di browser.' },
    },
    {
      path: '/changelog',
      name: 'changelog',
      component: () => import('@/pages/ChangelogPage.vue'),
      meta: { seoTitle: 'Changelog', seoDescription: 'Riwayat fitur, peningkatan, keamanan, dan perubahan Dearga Free Tools.' },
    },
    ...toolRoutes,
    ...aliasRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { seoTitle: 'Halaman Tidak Ditemukan', seoDescription: 'Halaman yang Anda cari tidak tersedia di Dearga Free Tools.', seoRobots: 'noindex, nofollow' },
    },
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
  if (failure) return
  sessionStorage.removeItem(`router:lazy-reload:${to.fullPath}`)
  updateRouteSeo({
    title: String(to.meta.seoTitle ?? 'Dearga Free Tools'),
    description: String(to.meta.seoDescription ?? 'Kumpulan free tool praktis yang berjalan langsung di browser.'),
    path: to.path,
    ...(to.meta.applicationName ? { applicationName: String(to.meta.applicationName) } : {}),
    robots: String(to.meta.seoRobots ?? 'index, follow'),
  })
})

export default router
