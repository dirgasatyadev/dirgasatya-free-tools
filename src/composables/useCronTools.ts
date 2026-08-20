export type CronFieldKey = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'
export type CronFieldMode = 'every' | 'specific' | 'interval' | 'range'

export interface CronFieldDefinition {
  key: CronFieldKey
  label: string
  shortLabel: string
  min: number
  max: number
  defaultValue: number
}

export interface CronFieldValue {
  mode: CronFieldMode
  value: number
  start: number
  end: number
  step: number
}

export type CronBuilderState = Record<CronFieldKey, CronFieldValue>

export const cronFieldDefinitions: CronFieldDefinition[] = [
  { key: 'minute', label: 'Menit', shortLabel: 'menit', min: 0, max: 59, defaultValue: 0 },
  { key: 'hour', label: 'Jam', shortLabel: 'jam', min: 0, max: 23, defaultValue: 0 },
  { key: 'dayOfMonth', label: 'Tanggal', shortLabel: 'tanggal', min: 1, max: 31, defaultValue: 1 },
  { key: 'month', label: 'Bulan', shortLabel: 'bulan', min: 1, max: 12, defaultValue: 1 },
  { key: 'dayOfWeek', label: 'Hari', shortLabel: 'hari', min: 0, max: 6, defaultValue: 0 },
]

function createField(definition: CronFieldDefinition): CronFieldValue {
  return {
    mode: 'every',
    value: definition.defaultValue,
    start: definition.min,
    end: Math.min(definition.min + 1, definition.max),
    step: 1,
  }
}

export function createCronBuilderState(): CronBuilderState {
  return Object.fromEntries(
    cronFieldDefinitions.map((definition) => [definition.key, createField(definition)]),
  ) as CronBuilderState
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function cronFieldToExpression(field: CronFieldValue, definition: CronFieldDefinition) {
  if (field.mode === 'every') return '*'
  if (field.mode === 'specific') return String(clampInteger(field.value, definition.min, definition.max))
  if (field.mode === 'interval') return `*/${clampInteger(field.step, 1, definition.max - definition.min + 1)}`
  const start = clampInteger(field.start, definition.min, definition.max)
  const end = clampInteger(field.end, start, definition.max)
  return `${start}-${end}`
}

export function buildCronExpression(state: CronBuilderState) {
  return cronFieldDefinitions
    .map((definition) => cronFieldToExpression(state[definition.key], definition))
    .join(' ')
}

export function applyCronPreset(state: CronBuilderState, expression: string) {
  const segments = expression.trim().split(/\s+/)
  if (segments.length !== cronFieldDefinitions.length) throw new Error('Preset cron harus memiliki 5 field.')

  cronFieldDefinitions.forEach((definition, index) => {
    const segment = segments[index]!
    const field = state[definition.key]
    if (segment === '*') field.mode = 'every'
    else if (/^\*\/\d+$/.test(segment)) {
      field.mode = 'interval'
      field.step = Number(segment.slice(2))
    } else if (/^\d+-\d+$/.test(segment)) {
      const [start, end] = segment.split('-').map(Number)
      field.mode = 'range'
      field.start = start!
      field.end = end!
    } else if (/^\d+$/.test(segment)) {
      field.mode = 'specific'
      field.value = Number(segment)
    } else throw new Error(`Field ${definition.label} pada preset tidak didukung.`)
  })
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function describeCron(state: CronBuilderState) {
  const expression = buildCronExpression(state)
  const minute = state.minute.value
  const hour = state.hour.value

  if (expression === '* * * * *') return 'Berjalan setiap menit.'
  if (state.minute.mode === 'interval' && expression.endsWith(' * * * *')) {
    return `Berjalan setiap ${state.minute.step} menit.`
  }
  if (expression === '0 * * * *') return 'Berjalan setiap awal jam.'
  if (state.minute.mode === 'specific' && state.hour.mode === 'specific') {
    const time = `${pad(hour)}:${pad(minute)}`
    if (expression.endsWith(' * * 1-5')) return `Berjalan setiap Senin–Jumat pukul ${time}.`
    if (state.dayOfMonth.mode === 'specific' && state.month.mode === 'every' && state.dayOfWeek.mode === 'every') {
      return `Berjalan setiap tanggal ${state.dayOfMonth.value} pukul ${time}.`
    }
    if (expression.endsWith(' * * *')) return `Berjalan setiap hari pukul ${time}.`
  }

  return `Jadwal cron: ${expression}. Waktu mengikuti zona waktu sistem yang menjalankannya.`
}
