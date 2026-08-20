<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import {
  applyCronPreset,
  buildCronExpression,
  createCronBuilderState,
  cronFieldDefinitions,
  describeCron,
  type CronFieldDefinition,
} from '@/composables/useCronTools'

const presets = [
  { label: 'Setiap menit', expression: '* * * * *', icon: 'mdi:timer-sand' },
  { label: 'Setiap 5 menit', expression: '*/5 * * * *', icon: 'mdi:timer-outline' },
  { label: 'Setiap jam', expression: '0 * * * *', icon: 'mdi:clock-outline' },
  { label: 'Setiap hari', expression: '0 0 * * *', icon: 'mdi:calendar-today-outline' },
  { label: 'Hari kerja 09:00', expression: '0 9 * * 1-5', icon: 'mdi:briefcase-clock-outline' },
  { label: 'Awal bulan', expression: '0 0 1 * *', icon: 'mdi:calendar-month-outline' },
]
const modeOptions = [
  { value: 'every', label: 'Setiap' },
  { value: 'specific', label: 'Pada nilai' },
  { value: 'interval', label: 'Setiap interval' },
  { value: 'range', label: 'Dalam rentang' },
] as const
const state = reactive(createCronBuilderState())
const copied = ref(false)
const errorMessage = ref('')
const expression = computed(() => buildCronExpression(state))
const description = computed(() => describeCron(state))

function applyPreset(expressionValue: string) {
  try {
    applyCronPreset(state, expressionValue)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Preset tidak dapat digunakan.'
  }
}

function resetBuilder() {
  applyPreset('* * * * *')
}

async function copyExpression() {
  try {
    await navigator.clipboard.writeText(expression.value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1_500)
  } catch {
    errorMessage.value = 'Browser tidak mengizinkan penyalinan otomatis.'
  }
}

function valueLabel(definition: CronFieldDefinition, value: number) {
  if (definition.key === 'dayOfWeek') return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][value]
  if (definition.key === 'month') return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][value - 1]
  return String(value).padStart(2, '0')
}
</script>

<template>
  <ToolPageShell title="Cron Expression Builder" description="Susun ekspresi cron lima field secara visual, gunakan preset, lalu salin jadwal yang siap dipakai." icon="mdi:calendar-clock-outline" category="Developer">
    <section>
      <div class="flex items-center justify-between gap-4">
        <div><h2 class="text-lg font-black text-slate-950 dark:text-white">Mulai dari preset</h2><p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Pilih jadwal umum atau atur setiap field secara manual.</p></div>
        <button type="button" class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="resetBuilder"><Icon icon="mdi:restore" class="size-5" /> Reset</button>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button v-for="preset in presets" :key="preset.expression" type="button" class="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-bold transition" :class="expression === preset.expression ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/10' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5'" @click="applyPreset(preset.expression)"><Icon :icon="preset.icon" class="size-5" />{{ preset.label }}</button>
      </div>
    </section>

    <section class="mt-8">
      <h2 class="text-lg font-black text-slate-950 dark:text-white">Atur field cron</h2>
      <div class="mt-4 grid gap-3 lg:grid-cols-5">
        <article v-for="definition in cronFieldDefinitions" :key="definition.key" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div class="flex items-center justify-between gap-2"><h3 class="font-black text-slate-950 dark:text-white">{{ definition.label }}</h3><code class="rounded-md bg-white px-2 py-1 text-xs font-black text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300">{{ expression.split(' ')[cronFieldDefinitions.indexOf(definition)] }}</code></div>
          <label class="mt-4 block text-xs font-bold text-slate-500 dark:text-slate-400">Mode<select v-model="state[definition.key].mode" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option v-for="mode in modeOptions" :key="mode.value" :value="mode.value">{{ mode.label }}</option></select></label>

          <label v-if="state[definition.key].mode === 'specific'" class="mt-3 block text-xs font-bold text-slate-500 dark:text-slate-400">Nilai<select v-model.number="state[definition.key].value" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option v-for="value in definition.max - definition.min + 1" :key="value + definition.min - 1" :value="value + definition.min - 1">{{ valueLabel(definition, value + definition.min - 1) }}</option></select></label>
          <label v-else-if="state[definition.key].mode === 'interval'" class="mt-3 block text-xs font-bold text-slate-500 dark:text-slate-400">Interval<input v-model.number="state[definition.key].step" type="number" min="1" :max="definition.max - definition.min + 1" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
          <div v-else-if="state[definition.key].mode === 'range'" class="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2"><label class="block text-xs font-bold text-slate-500 dark:text-slate-400">Dari<input v-model.number="state[definition.key].start" type="number" :min="definition.min" :max="definition.max" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label><span class="pb-3 text-slate-400">–</span><label class="block text-xs font-bold text-slate-500 dark:text-slate-400">Sampai<input v-model.number="state[definition.key].end" type="number" :min="definition.min" :max="definition.max" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label></div>
          <p v-else class="mt-3 min-h-11 rounded-xl bg-white px-3 py-3 text-xs font-semibold text-slate-400 dark:bg-slate-900">Semua {{ definition.shortLabel }}</p>
          <p class="mt-3 text-[11px] font-semibold text-slate-400">Rentang {{ definition.min }}–{{ definition.max }}</p>
        </article>
      </div>
    </section>

    <section class="mt-8 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-200 dark:shadow-none">
      <div class="border-b border-white/10 p-5 sm:p-6"><div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p class="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">Cron expression</p><code class="mt-2 block break-all text-2xl font-black tracking-wider sm:text-3xl">{{ expression }}</code></div><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 font-bold text-white transition hover:bg-indigo-400" @click="copyExpression"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" />{{ copied ? 'Tersalin' : 'Salin expression' }}</button></div></div>
      <div class="grid grid-cols-5 divide-x divide-white/10 bg-white/5 px-2 py-4 text-center"><div v-for="definition in cronFieldDefinitions" :key="definition.key" class="px-1"><code class="block text-sm font-black text-indigo-200">{{ expression.split(' ')[cronFieldDefinitions.indexOf(definition)] }}</code><span class="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ definition.label }}</span></div></div>
    </section>

    <div class="mt-5 flex items-start gap-3 rounded-2xl bg-indigo-50 p-4 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200"><Icon icon="mdi:text-box-check-outline" class="mt-0.5 size-5 shrink-0" /><div><p class="font-bold">{{ description }}</p><p class="mt-1 text-xs leading-5 text-indigo-600 dark:text-indigo-300">Format: menit, jam, tanggal, bulan, hari. Cron memakai zona waktu server atau platform tempat jadwal dijalankan.</p></div></div>
    <p v-if="errorMessage" role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ errorMessage }}</p>
  </ToolPageShell>
</template>
