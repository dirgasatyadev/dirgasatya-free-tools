export type CronFieldKey = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'
export type CronFieldMode = 'every' | 'specific' | 'interval' | 'range' | 'custom'
export type CronDialect = 'unix' | 'github' | 'quartz'

export interface CronFieldDefinition {
  key: CronFieldKey
  label: string
  englishLabel: string
  shortLabel: string
  min: number
  max: number
  defaultValue: number
  aliases?: Record<string, number>
}

export interface CronFieldValue {
  mode: CronFieldMode
  value: number
  start: number
  end: number
  step: number
  custom: string
}

export type CronBuilderState = Record<CronFieldKey, CronFieldValue>

const monthAliases = Object.fromEntries(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((name, index) => [name, index + 1]))
const dayAliases = Object.fromEntries(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((name, index) => [name, index]))

export const cronFieldDefinitions: CronFieldDefinition[] = [
  { key: 'minute', label: 'Menit', englishLabel: 'Minute', shortLabel: 'menit', min: 0, max: 59, defaultValue: 0 },
  { key: 'hour', label: 'Jam', englishLabel: 'Hour', shortLabel: 'jam', min: 0, max: 23, defaultValue: 0 },
  { key: 'dayOfMonth', label: 'Tanggal', englishLabel: 'Day of month', shortLabel: 'tanggal', min: 1, max: 31, defaultValue: 1 },
  { key: 'month', label: 'Bulan', englishLabel: 'Month', shortLabel: 'bulan', min: 1, max: 12, defaultValue: 1, aliases: monthAliases },
  { key: 'dayOfWeek', label: 'Hari', englishLabel: 'Day of week', shortLabel: 'hari', min: 0, max: 6, defaultValue: 0, aliases: dayAliases },
]

function createField(definition: CronFieldDefinition): CronFieldValue {
  return { mode: 'every', value: definition.defaultValue, start: definition.min, end: Math.min(definition.min + 1, definition.max), step: 1, custom: '' }
}

export function createCronBuilderState(): CronBuilderState {
  return Object.fromEntries(cronFieldDefinitions.map((definition) => [definition.key, createField(definition)])) as CronBuilderState
}

function integerInRange(value: number, definition: CronFieldDefinition, label = definition.englishLabel) {
  if (!Number.isInteger(value) || value < definition.min || value > definition.max) {
    throw new Error(`${label} must be ${definition.min}–${definition.max}.`)
  }
  return value
}

function parseAtom(atom: string, definition: CronFieldDefinition) {
  const normalized = atom.toUpperCase()
  if (definition.aliases?.[normalized] !== undefined) return definition.aliases[normalized]
  if (!/^\d+$/.test(atom)) throw new Error(`${definition.englishLabel} contains an unsupported value: ${atom}.`)
  return integerInRange(Number(atom), definition)
}

function validateCronPart(part: string, definition: CronFieldDefinition) {
  const stepSplit = part.split('/')
  if (stepSplit.length > 2 || !stepSplit[0]) throw new Error(`${definition.englishLabel} has an invalid step expression.`)
  const base = stepSplit[0]
  if (stepSplit[1] !== undefined) {
    if (!/^\d+$/.test(stepSplit[1])) throw new Error(`${definition.englishLabel} step must be an integer.`)
    const step = Number(stepSplit[1])
    const span = definition.max - definition.min + 1
    if (step < 1 || step > span) throw new Error(`${definition.englishLabel} step must be 1–${span}.`)
  }
  if (base === '*') return
  const range = base.split('-')
  if (range.length > 2 || !range[0]) throw new Error(`${definition.englishLabel} has an invalid range.`)
  const start = parseAtom(range[0], definition)
  if (range[1] !== undefined) {
    const end = parseAtom(range[1], definition)
    if (end < start) throw new Error(`${definition.englishLabel} range end must not be smaller than its start.`)
  }
}

export function validateCronFieldExpression(expression: string, definition: CronFieldDefinition) {
  const normalized = expression.trim().toUpperCase()
  if (!normalized) throw new Error(`${definition.englishLabel} is required.`)
  const parts = normalized.split(',')
  if (parts.some((part) => !part)) throw new Error(`${definition.englishLabel} list contains an empty item.`)
  for (const part of parts) validateCronPart(part, definition)
  return normalized
}

export function cronFieldToExpression(field: CronFieldValue, definition: CronFieldDefinition) {
  if (field.mode === 'every') return '*'
  if (field.mode === 'specific') return String(integerInRange(field.value, definition))
  if (field.mode === 'interval') {
    const span = definition.max - definition.min + 1
    if (!Number.isInteger(field.step) || field.step < 1 || field.step > span) throw new Error(`${definition.englishLabel} step must be 1–${span}.`)
    return `*/${field.step}`
  }
  if (field.mode === 'range') {
    const start = integerInRange(field.start, definition, `${definition.englishLabel} range start`)
    const end = integerInRange(field.end, definition, `${definition.englishLabel} range end`)
    if (end < start) throw new Error(`${definition.englishLabel} range end must not be smaller than its start.`)
    return `${start}-${end}`
  }
  return validateCronFieldExpression(field.custom, definition)
}

export function buildCronExpression(state: CronBuilderState, dialect: CronDialect = 'unix') {
  const fields = cronFieldDefinitions.map((definition) => cronFieldToExpression(state[definition.key], definition))
  if (dialect !== 'quartz') return fields.join(' ')
  const domRestricted = fields[2] !== '*'
  const dowRestricted = fields[4] !== '*'
  if (domRestricted && dowRestricted) throw new Error('Quartz requires either Day of month or Day of week to be unspecified (?).')
  if (dowRestricted) fields[2] = '?'
  else fields[4] = '?'
  return ['0', ...fields].join(' ')
}

function setFieldFromExpression(field: CronFieldValue, expression: string, definition: CronFieldDefinition) {
  const normalized = validateCronFieldExpression(expression, definition)
  if (normalized === '*') field.mode = 'every'
  else if (/^\*\/\d+$/.test(normalized)) {
    field.mode = 'interval'
    field.step = Number(normalized.slice(2))
  } else if (/^\d+-\d+$/.test(normalized)) {
    const [start, end] = normalized.split('-').map(Number)
    field.mode = 'range'; field.start = start!; field.end = end!
  } else if (/^\d+$/.test(normalized)) {
    field.mode = 'specific'; field.value = Number(normalized)
  } else {
    field.mode = 'custom'; field.custom = normalized
  }
}

export function parseCronExpression(expression: string, dialect: CronDialect = 'unix') {
  const segments = expression.trim().split(/\s+/)
  let fields = segments
  if (dialect === 'quartz') {
    if (segments.length !== 6) throw new Error('Quartz cron must have 6 fields: second, minute, hour, day, month, weekday.')
    if (segments[0] !== '0') throw new Error('Quartz seconds must be 0 in this builder.')
    fields = segments.slice(1)
    if (fields[2] === '?') fields[2] = '*'
    if (fields[4] === '?') fields[4] = '*'
  } else if (segments.length !== 5) throw new Error(`${dialect === 'github' ? 'GitHub Actions' : 'Unix'} cron must have 5 fields.`)
  const state = createCronBuilderState()
  cronFieldDefinitions.forEach((definition, index) => setFieldFromExpression(state[definition.key], fields[index]!, definition))
  return state
}

export function applyCronPreset(state: CronBuilderState, expression: string, dialect: CronDialect = 'unix') {
  const parsed = parseCronExpression(expression, dialect)
  for (const definition of cronFieldDefinitions) Object.assign(state[definition.key], parsed[definition.key])
}

function pad(value: number) { return String(value).padStart(2, '0') }

export function describeCron(state: CronBuilderState, dialect: CronDialect = 'unix') {
  const expression = buildCronExpression(state, dialect)
  if (expression === '* * * * *') return 'Berjalan setiap menit.'
  if (dialect !== 'quartz' && state.minute.mode === 'interval' && expression.endsWith(' * * * *')) return `Berjalan setiap ${state.minute.step} menit.`
  if (expression === '0 * * * *') return 'Berjalan setiap awal jam.'
  if (state.minute.mode === 'specific' && state.hour.mode === 'specific') {
    const time = `${pad(state.hour.value)}:${pad(state.minute.value)}`
    if (dialect !== 'quartz' && expression.endsWith(' * * 1-5')) return `Berjalan setiap Senin–Jumat pukul ${time}.`
    if (state.dayOfMonth.mode === 'specific' && state.month.mode === 'every' && state.dayOfWeek.mode === 'every') return `Berjalan setiap tanggal ${state.dayOfMonth.value} pukul ${time}.`
    if (state.dayOfMonth.mode === 'every' && state.month.mode === 'every' && state.dayOfWeek.mode === 'every') return `Berjalan setiap hari pukul ${time}.`
  }
  return `Jadwal ${dialect === 'quartz' ? 'Quartz' : dialect === 'github' ? 'GitHub Actions' : 'Unix'}: ${expression}.`
}

function expandPart(part: string, definition: CronFieldDefinition) {
  const [base, stepText] = part.split('/')
  const step = stepText ? Number(stepText) : 1
  let start = definition.min
  let end = definition.max
  if (base !== '*') {
    const [startText, endText] = base!.split('-')
    start = parseAtom(startText!, definition)
    end = endText === undefined ? start : parseAtom(endText, definition)
  }
  const values: number[] = []
  for (let value = start; value <= end; value += step) values.push(value)
  return values
}

function valuesForExpression(expression: string, definition: CronFieldDefinition) {
  const normalized = validateCronFieldExpression(expression, definition)
  return new Set(normalized.split(',').flatMap((part) => expandPart(part, definition)))
}

const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' })
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return { minute: Number(parts.minute), hour: Number(parts.hour), dayOfMonth: Number(parts.day), month: Number(parts.month), dayOfWeek: weekdayIndex[parts.weekday!]! }
}

export function getNextCronExecutions(expression: string, options: { dialect?: CronDialect; timeZone?: string; count?: number; from?: Date } = {}) {
  const dialect = options.dialect ?? 'unix'
  const state = parseCronExpression(expression, dialect)
  const baseExpression = buildCronExpression(state, 'unix').split(' ')
  const sets = cronFieldDefinitions.map((definition, index) => valuesForExpression(baseExpression[index]!, definition))
  const domRestricted = baseExpression[2] !== '*'
  const dowRestricted = baseExpression[4] !== '*'
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const count = Math.min(20, Math.max(1, options.count ?? 5))
  const cursor = new Date(options.from ?? Date.now())
  cursor.setUTCSeconds(0, 0)
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
  const matches: Date[] = []
  const maxChecks = 60 * 24 * 366 * 2
  for (let checks = 0; checks < maxChecks && matches.length < count; checks += 1) {
    const parts = zonedParts(cursor, timeZone)
    const domMatch = sets[2]!.has(parts.dayOfMonth)
    const dowMatch = sets[4]!.has(parts.dayOfWeek)
    const dayMatch = dialect === 'quartz' || !domRestricted || !dowRestricted ? domMatch && dowMatch : domMatch || dowMatch
    if (sets[0]!.has(parts.minute) && sets[1]!.has(parts.hour) && dayMatch && sets[3]!.has(parts.month)) matches.push(new Date(cursor))
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
  }
  if (matches.length < count) throw new Error('Tidak dapat menemukan preview jadwal dalam dua tahun ke depan.')
  return matches
}

export function cronDayBehaviorExplanation(dialect: CronDialect) {
  return dialect === 'quartz'
    ? 'Quartz mewajibkan salah satu Day of month atau Day of week memakai ? (unspecified); builder menentukannya otomatis.'
    : 'Unix dan GitHub Actions memakai OR ketika Day of month dan Day of week sama-sama dibatasi: jadwal berjalan jika salah satunya cocok.'
}
