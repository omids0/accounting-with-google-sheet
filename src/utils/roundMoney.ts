/**
 * Money is kept to two decimals at most. Sums and differences of fractional numbers leave
 * binary noise (`10931882.299999997`, `0.10000000894069672`) that must never reach a sheet
 * cell or the screen. Whole values stay whole; non-finite input reads as 0.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0

  const rounded = Math.sign(value) * (Math.round(Math.abs(value) * 100 + Number.EPSILON) / 100)

  // «-0» (a tiny negative rounded away) must not print as «−۰».
  return rounded === 0 ? 0 : rounded
}

/**
 * What the screen shows: up to three decimals, like `Intl` always did (unit prices of the treasury
 * carry them), which still sweeps away binary noise. Non-finite input is not a number: `NaN`.
 */
export function roundForDisplay(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN

  const rounded = Math.sign(value) * (Math.round(Math.abs(value) * 1000 + Number.EPSILON) / 1000)

  return rounded === 0 ? 0 : rounded
}

/** Sum of amounts without the noise of adding fractions one by one. */
export function sumMoney(values: Iterable<number>): number {
  let total = 0

  for (const value of values) total += value

  return roundMoney(total)
}
