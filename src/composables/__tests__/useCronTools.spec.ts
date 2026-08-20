import { describe, expect, it } from 'vitest'
import {
  applyCronPreset,
  buildCronExpression,
  createCronBuilderState,
  describeCron,
  getNextCronExecutions,
  parseCronExpression,
  quartzDowToUnix,
  unixDowToQuartz,
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

  it('memetakan weekday numeric canonical ke codec Quartz 1–7', () => {
    expect(unixDowToQuartz(0)).toBe(1)
    expect(unixDowToQuartz(1)).toBe(2)
    expect(unixDowToQuartz(6)).toBe(7)
    expect(quartzDowToUnix(1)).toBe(0)
    expect(quartzDowToUnix(2)).toBe(1)
    expect(quartzDowToUnix(7)).toBe(6)

    const monday = parseCronExpression('0 9 * * 1')
    expect(buildCronExpression(monday, 'quartz')).toBe('0 0 9 ? * 2')
    expect(buildCronExpression(parseCronExpression('0 0 9 ? * 7', 'quartz'))).toBe('0 9 * * 6')
    const preview = getNextCronExecutions('0 0 9 ? * 2', { dialect: 'quartz', timeZone: 'UTC', from: new Date('2026-01-04T08:58:00Z'), count: 1 })
    expect(preview[0]?.toISOString()).toBe('2026-01-05T09:00:00.000Z')
  })
})
