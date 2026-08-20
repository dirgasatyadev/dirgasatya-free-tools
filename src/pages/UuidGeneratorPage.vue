<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { generateUuidBatch } from '@/composables/useUtilityTools'

const count = ref(10)
const uuids = ref<string[]>([])
const errorMessage = ref('')
const copied = ref(false)

function generate() {
  try {
    uuids.value = generateUuidBatch(count.value)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'UUID tidak dapat dibuat.'
  }
}

async function copyAll() {
  await navigator.clipboard.writeText(uuids.value.join('\n'))
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1_500)
}

function copyOne(uuid: string) {
  void navigator.clipboard.writeText(uuid)
}

generate()
</script>

<template>
  <ToolPageShell title="UUID Generator" description="Buat hingga 100 UUID versi 4 menggunakan generator acak kriptografis browser." icon="mdi:identifier" category="Developer">
    <div class="flex flex-col gap-3 sm:flex-row"><label class="flex-1 text-sm font-bold">Jumlah UUID<input v-model.number="count" type="number" min="1" max="100" class="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /></label><button type="button" class="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700" @click="generate"><Icon icon="mdi:refresh" class="size-5" /> Generate</button></div>
    <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
    <div class="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700"><div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-700"><span class="text-sm font-bold">{{ uuids.length }} UUID</span><button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-indigo-50 px-3 text-sm font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300" @click="copyAll"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-4" /> {{ copied ? 'Tersalin' : 'Salin semua' }}</button></div><ol class="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:divide-slate-800"><li v-for="(uuid, index) in uuids" :key="uuid" class="flex items-center gap-3 px-4 py-3"><span class="w-7 text-xs font-black text-slate-400">{{ index + 1 }}</span><code class="min-w-0 flex-1 break-all text-sm">{{ uuid }}</code><button type="button" class="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" aria-label="Salin UUID" @click="copyOne(uuid)"><Icon icon="mdi:content-copy" class="size-4" /></button></li></ol></div>
  </ToolPageShell>
</template>
