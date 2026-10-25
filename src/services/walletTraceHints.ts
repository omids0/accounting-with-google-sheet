import type { LedgerEntry as RecordEntry } from './recordDuplicates'
import type { TraceHint } from './walletTraceTypes'
import { formatMoney } from '../utils/formatMoney'

const MAX_HINTS = 6
/** A figure this small is not worth a guess. */
const MIN_HINT_AMOUNT = 1000

/** The same amount, to the toman. */
const same = (a: number, b: number) => Math.abs(a - b) < 0.5

function label(record: RecordEntry): string {
  return record.title || record.category || (record.type === 'expense' ? 'هزینه' : 'درآمد')
}

/**
 * Guesses for the part nothing in the data explains: a record with exactly that amount, one
 * entered in the wrong direction (the gap is twice its amount) or with a zero too many
 * (the gap is nine tenths of it).
 */
export function amountHints(
  remainder: number,
  records: RecordEntry[],
  start: string,
  today: string,
  /** Records that already explain a part of the difference: a guess must not repeat them. */
  skip: Set<string>
): TraceHint[] {
  const gap = Math.abs(remainder)

  if (gap < MIN_HINT_AMOUNT) return []

  const hints: TraceHint[] = []

  for (const record of records) {
    if (!record.id || skip.has(record.id)) continue
    if (!record.date || record.date < start || record.date > today) continue

    const text = `«${label(record)}» (${formatMoney(record.amount)})`
    const ref = { record: { id: record.id, type: record.type }, date: record.date }

    if (same(record.amount, gap)) {
      hints.push({ ...ref, text: `${text} دقیقاً به اندازهٔ همین اختلافِ پیدا‌نشده است.` })
    } else if (same(record.amount * 2, gap)) {
      hints.push({
        ...ref,
        text: `${text} نصف اختلافِ پیدا‌نشده است؛ اگر نوع آن (درآمد/هزینه) برعکس ثبت شده، اختلاف دو برابر مبلغش می‌شود.`
      })
    } else if (same(record.amount * 0.9, gap)) {
      hints.push({
        ...ref,
        text: `${text} را اگر با یک صفر اضافه زده باشی، اختلاف ۹۰٪ مبلغش می‌شود.`
      })
    }
  }

  return hints.slice(0, MAX_HINTS)
}
