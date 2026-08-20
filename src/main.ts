import './style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { mdiSubset } from './icons/mdiSubset'

addCollection(mdiSubset)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

useThemeStore(pinia).initializeTheme()

app.mount('#app')
