import { describe, expect, it } from 'vitest'
import {
  applyCronPreset,
  buildCronExpression,
  createCronBuilderState,
  describeCron,
  getNextCronExecutions,
  parseCronExpression,
} from '@/composables/useCronTools'

describe('cron expression builder', () => {
  it('membuat ekspresi default setiap menit', () => {
    const state = createCronBuilderState()
    expect(buildCronExpression(state)).toBe('* * * * *')
    expect(describeCron(state)).toBe('Berjalan setiap menit.')
  })

  it('menerapkan preset hari kerja', () => {
    const state = createCronBuilderState()
    applyCronPreset(state, '0 9 * * 1-5')
    expect(buildCronExpression(state)).toBe('0 9 * * 1-5')
    expect(describeCron(state)).toBe('Berjalan setiap Senin–Jumat pukul 09:00.')
  })

  it('menolak nilai di luar rentang tanpa silent clamping', () => {
    const state = createCronBuilderState()
    state.minute.mode = 'interval'
    state.minute.step = 15
    state.hour.mode = 'specific'
    state.hour.value = 99
    expect(() => buildCronExpression(state)).toThrow('Hour must be 0–23')
  })

  it('menolak preset yang bukan cron lima field', () => {
    expect(() => applyCronPreset(createCronBuilderState(), '0 0 * *')).toThrow('5 fields')
  })

  it('memparse list, step range, dan alias lalu memberi preview timezone', () => {
    const state = parseCronExpression('0 9 1,5,10 JAN-JUN MON-FRI')
    expect(buildCronExpression(state)).toBe('0 9 1,5,10 JAN-JUN MON-FRI')
    const next = getNextCronExecutions('0 9 * * MON-FRI', { timeZone: 'UTC', from: new Date('2026-01-01T08:58:00Z') })
    expect(next[0]?.toISOString()).toBe('2026-01-01T09:00:00.000Z')
  })

  it('membangun dialect Quartz dengan field unspecified', () => {
    const state = parseCronExpression('0 9 * * MON-FRI')
    expect(buildCronExpression(state, 'quartz')).toBe('0 0 9 ? * MON-FRI')
  })
})
