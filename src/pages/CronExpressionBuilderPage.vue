<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import {
  applyCronPreset,
  buildCronExpression,
  createCronBuilderState,
  cronDayBehaviorExplanation,
  cronFieldDefinitions,
  describeCron,
  getNextCronExecutions,
  type CronDialect,
  type CronFieldDefinition,
} from '@/composables/useCronTools'

const presets = [
  { label: 'Setiap menit', expression: '* * * * *' },
  { label: 'Setiap 5 menit', expression: '*/5 * * * *' },
  { label: 'Setiap jam', expression: '0 * * * *' },
  { label: 'Setiap hari', expression: '0 0 * * *' },
  { label: 'Hari kerja 09:00', expression: '0 9 * * MON-FRI' },
  { label: 'Jan–Jun / 5 hari', expression: '0 8 1,5,10 JAN-JUN *' },
]
const modeOptions = [
  { value: 'every', label: 'Setiap' },
  { value: 'specific', label: 'Pada nilai' },
  { value: 'interval', label: 'Setiap interval' },
  { value: 'range', label: 'Dalam rentang' },
  { value: 'custom', label: 'List / expression' },
] as const
const state = reactive(createCronBuilderState())
const dialect = ref<CronDialect>('unix')
const pastedExpression = ref('* * * * *')
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
const copied = ref(false)
const actionError = ref('')
const timezoneOptions = Array.from(new Set([timezone.value, 'UTC', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles']))

const buildResult = computed(() => {
  try {
    const expression = buildCronExpression(state, dialect.value)
    return { expression, description: describeCron(state, dialect.value), error: '' }
  } catch (error) {
    return { expression: '', description: '', error: error instanceof Error ? error.message : 'Cron tidak valid.' }
  }
})
const nextExecutions = computed(() => {
  if (!buildResult.value.expression) return []
  try { return getNextCronExecutions(buildResult.value.expression, { dialect: dialect.value, timeZone: timezone.value, count: 5 }) }
  catch { return [] }
})

function applyExpression(expressionValue: string, sourceDialect: CronDialect = dialect.value) {
  try {
    applyCronPreset(state, expressionValue, sourceDialect)
    actionError.value = ''
  } catch (error) { actionError.value = error instanceof Error ? error.message : 'Expression tidak dapat diparse.' }
}
function applyPreset(expressionValue: string) { applyExpression(expressionValue, 'unix') }
function resetBuilder() { applyExpression('* * * * *', 'unix') }
async function copyExpression() {
  if (!buildResult.value.expression) return
  try { await navigator.clipboard.writeText(buildResult.value.expression); copied.value = true; window.setTimeout(() => (copied.value = false), 1_500) }
  catch { actionError.value = 'Browser tidak mengizinkan penyalinan otomatis.' }
}
function valueLabel(definition: CronFieldDefinition, value: number) {
  if (definition.key === 'dayOfWeek') return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][value]
  if (definition.key === 'month') return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][value - 1]
  return String(value).padStart(2, '0')
}
function formatExecution(date: Date) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: timezone.value, dateStyle: 'full', timeStyle: 'short' }).format(date)
}
</script>

<template>
  <ToolPageShell title="Cron Expression Builder" description="Parse, validasi, susun, dan preview cron Unix, GitHub Actions, atau Quartz tanpa silent clamping." icon="mdi:calendar-clock-outline" category="Developer">
    <section class="grid gap-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700 lg:grid-cols-[12rem_1fr_auto]">
      <label class="text-sm font-bold">Dialect<select v-model="dialect" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option value="unix">Unix (5 field)</option><option value="github">GitHub Actions</option><option value="quartz">Quartz (6 field)</option></select></label>
      <label class="text-sm font-bold">Paste cron expression<input v-model="pastedExpression" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" placeholder="0 9 * * MON-FRI" @keyup.enter="applyExpression(pastedExpression)" /></label>
      <button type="button" class="min-h-11 self-end rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700" @click="applyExpression(pastedExpression)">Parse ke builder</button>
    </section>

    <section class="mt-7"><div class="flex items-center justify-between gap-4"><div><h2 class="text-lg font-black">Preset</h2><p class="mt-1 text-sm text-slate-500">Preset dimuat ke builder lalu diserialisasi sesuai dialect.</p></div><button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700" @click="resetBuilder"><Icon icon="mdi:restore" class="size-5" /> Reset</button></div><div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><button v-for="preset in presets" :key="preset.expression" type="button" class="min-h-16 rounded-xl border border-slate-200 px-3 text-xs font-bold transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-500/10" @click="applyPreset(preset.expression)">{{ preset.label }}</button></div></section>

    <section class="mt-8"><h2 class="text-lg font-black">Atur field cron</h2><div class="mt-4 grid gap-3 lg:grid-cols-5">
      <article v-for="definition in cronFieldDefinitions" :key="definition.key" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <h3 class="font-black">{{ definition.label }}</h3>
        <label class="mt-3 block text-xs font-bold text-slate-500">Mode<select v-model="state[definition.key].mode" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><option v-for="option in modeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
        <label v-if="state[definition.key].mode === 'specific'" class="mt-3 block text-xs font-bold text-slate-500">Nilai<select v-model.number="state[definition.key].value" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><option v-for="value in definition.max - definition.min + 1" :key="value" :value="value + definition.min - 1">{{ valueLabel(definition, value + definition.min - 1) }}</option></select></label>
        <label v-else-if="state[definition.key].mode === 'interval'" class="mt-3 block text-xs font-bold text-slate-500">Interval<input v-model.number="state[definition.key].step" type="number" min="1" :max="definition.max - definition.min + 1" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" /></label>
        <div v-else-if="state[definition.key].mode === 'range'" class="mt-3 grid grid-cols-2 gap-2"><label class="text-xs font-bold text-slate-500">Dari<input v-model.number="state[definition.key].start" type="number" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" /></label><label class="text-xs font-bold text-slate-500">Sampai<input v-model.number="state[definition.key].end" type="number" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" /></label></div>
        <label v-else-if="state[definition.key].mode === 'custom'" class="mt-3 block text-xs font-bold text-slate-500">List / range / step<input v-model="state[definition.key].custom" class="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono uppercase dark:border-slate-700 dark:bg-slate-900" :placeholder="definition.key === 'dayOfWeek' ? 'MON-FRI' : definition.key === 'month' ? 'JAN,JUN,DEC' : '10-50/5'" /></label>
        <p v-else class="mt-3 min-h-11 rounded-xl bg-white px-3 py-3 text-xs font-semibold text-slate-400 dark:bg-slate-900">Semua {{ definition.shortLabel }}</p>
        <p class="mt-3 text-[11px] font-semibold text-slate-400">Valid: {{ definition.min }}–{{ definition.max }}<template v-if="definition.aliases"> atau alias</template></p>
      </article>
    </div></section>

    <p v-if="buildResult.error || actionError" role="alert" class="mt-5 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ actionError || buildResult.error }}</p>
    <section v-else class="mt-8 overflow-hidden rounded-2xl bg-slate-950 text-white"><div class="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center"><div><p class="text-xs font-black uppercase tracking-wider text-indigo-300">Valid {{ dialect }} expression</p><code class="mt-2 block break-all text-2xl font-black sm:text-3xl">{{ buildResult.expression }}</code></div><button type="button" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 font-bold hover:bg-indigo-400" @click="copyExpression"><Icon :icon="copied ? 'mdi:check' : 'mdi:content-copy'" class="size-5" />{{ copied ? 'Tersalin' : 'Salin' }}</button></div><p class="p-5 text-sm text-slate-300">{{ buildResult.description }}</p></section>

    <section class="mt-6 grid gap-5 lg:grid-cols-[16rem_1fr]"><label class="text-sm font-bold">Timezone preview<select v-model="timezone" class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option v-for="zone in timezoneOptions" :key="zone" :value="zone">{{ zone }}</option></select></label><div><h2 class="text-sm font-black">5 eksekusi berikutnya</h2><ol class="mt-2 space-y-2"><li v-for="(date, index) in nextExecutions" :key="date.toISOString()" class="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200"><span class="mr-2 text-indigo-400">{{ index + 1 }}.</span>{{ formatExecution(date) }}</li></ol></div></section>
    <div class="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><p class="font-bold">Perilaku Day of month / Day of week</p><p>{{ cronDayBehaviorExplanation(dialect) }}</p><p v-if="dialect === 'github'" class="mt-2">GitHub Actions memakai UTC secara default dan interval schedule tercepat yang dijamin adalah 5 menit.</p></div>
  </ToolPageShell>
</template>
