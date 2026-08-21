import { describe, expect, it } from 'vitest'
import { evaluateBundleBudget } from '../bundle-budget-policy.mjs'

describe('bundle budget policy', () => {
  it('menerapkan target absolut untuk bundle yang sudah di bawah budget', () => {
    expect(evaluateBundleBudget({
      name: 'Homepage JS',
      currentBytes: 70,
      absoluteBudgetBytes: 250,
      baselineBytes: 70,
      regressionTolerance: 0.1,
    })).toMatchObject({ gateBytes: 250, status: 'OK' })
  })

  it('memberi ruang 10 persen untuk baseline legacy di atas target', () => {
    expect(evaluateBundleBudget({
      name: 'Largest route',
      currentBytes: 900,
      absoluteBudgetBytes: 600,
      baselineBytes: 840,
      regressionTolerance: 0.1,
    })).toMatchObject({ gateBytes: 924, status: 'BASELINE' })
  })

  it('menggagalkan regresi yang melewati gate baseline', () => {
    expect(evaluateBundleBudget({
      name: 'Largest route',
      currentBytes: 925,
      absoluteBudgetBytes: 600,
      baselineBytes: 840,
      regressionTolerance: 0.1,
    })).toMatchObject({ gateBytes: 924, status: 'FAIL' })
  })
})
