import { describe, expect, it } from 'vitest'
import {
  applyCronPreset,
  buildCronExpression,
  createCronBuilderState,
  describeCron,
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

  it('membuat interval dan membatasi nilai ke rentang field', () => {
    const state = createCronBuilderState()
    state.minute.mode = 'interval'
    state.minute.step = 15
    state.hour.mode = 'specific'
    state.hour.value = 99
    expect(buildCronExpression(state)).toBe('*/15 23 * * *')
  })

  it('menolak preset yang bukan cron lima field', () => {
    expect(() => applyCronPreset(createCronBuilderState(), '0 0 * *')).toThrow('5 field')
  })
})
