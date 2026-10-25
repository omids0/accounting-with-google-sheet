/**
 * The count line above a list that shows its rows in steps: «۵۰ از ۸٬۴۵۷ مورد» while rows are
 * still hidden, «۸٬۴۵۷ مورد» once everything is shown.
 */
export function listCountLabel(shown: number, total: number, unit: string): string {
  const totalText = total.toLocaleString('fa-IR')

  return shown < total
    ? `${shown.toLocaleString('fa-IR')} از ${totalText} ${unit}`
    : `${totalText} ${unit}`
}
