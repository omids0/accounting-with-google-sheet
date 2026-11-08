/**
 * The Arabic recognizer writes each line in visual left-to-right order, so the letters come out
 * reversed. Reverse the whole line, then reverse every run of digits and separators back, so the
 * numbers read normally.
 */
export function toLogicalOrder(line: string): string {
  const reversed = Array.from(line).reverse().join('')

  return reversed.replace(/[\d٠-٩۰-۹][\d٠-٩۰-۹,،٬٫./:]*/g, run =>
    Array.from(run).reverse().join('')
  )
}
