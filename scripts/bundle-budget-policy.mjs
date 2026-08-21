export function evaluateBundleBudget({ name, currentBytes, absoluteBudgetBytes, baselineBytes, regressionTolerance }) {
  if (currentBytes <= absoluteBudgetBytes) {
    return { name, currentBytes, absoluteBudgetBytes, baselineBytes, gateBytes: absoluteBudgetBytes, status: 'OK' }
  }
  const gateBytes = baselineBytes > absoluteBudgetBytes
    ? Math.floor(baselineBytes * (1 + regressionTolerance))
    : absoluteBudgetBytes
  return {
    name,
    currentBytes,
    absoluteBudgetBytes,
    baselineBytes,
    gateBytes,
    status: currentBytes <= gateBytes ? 'BASELINE' : 'FAIL',
  }
}
