import { parseCreatedAtMs, type LedgerEntry as RecordEntry } from './recordDuplicates'
import type { LedgerEntry as WalletLedgerEntry } from './walletLedger'
import type { TraceContext, TraceFinding, TraceKind } from './walletTraceTypes'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { RECONCILIATION_CATEGORY, SMS_RECONCILE_CATEGORY } from '../utils/protectedCategories'
import { roundMoney } from '../utils/roundMoney'

/** Below this a figure is rounding noise, not a finding. */
const MONEY_EPS = 0.5

export function isSignificant(amount: number): boolean {
  return Math.abs(amount) >= MONEY_EPS
}

/** What one history row did to a balance: a row marked «بدون اثر» (or without account) did nothing. */
export function ledgerDelta(entry: WalletLedgerEntry): number {
  return entry.applied && entry.accountId ? entry.delta : 0
}

/**
 * Whether a history row happened after the opening of the first month was set. An opening
 * taken automatically from the wallet total already contains everything before that moment.
 */
export function countsAfterOpening(ctx: TraceContext, entry: WalletLedgerEntry): boolean {
  const { anchorIsSnapshot, anchorWrittenAtMs } = ctx.input

  if (!anchorIsSnapshot || anchorWrittenAtMs == null) return true

  const created = parseCreatedAtMs(entry.createdAt)

  return created == null || created >= anchorWrittenAtMs
}

export function sumDelta(entries: WalletLedgerEntry[]): number {
  return roundMoney(entries.reduce((sum, entry) => sum + ledgerDelta(entry), 0))
}

function signedAmount(record: RecordEntry): number {
  return record.type === 'income' ? record.amount : -record.amount
}

function recordLabel(record: RecordEntry): string {
  return record.title || record.category || (record.type === 'expense' ? 'هزینه' : 'درآمد')
}

function typeWord(record: RecordEntry): string {
  return record.type === 'expense' ? 'هزینه' : 'درآمد'
}

/** An amount without its sign, for sentences that already say which way it went. */
export const money = (amount: number) => formatMoney(Math.abs(amount))

/** The record was written before the first wallet-history row existed, so no account was possible. */
function enteredBeforeAccounts(ctx: TraceContext, record: RecordEntry): boolean {
  const { firstAccountAtMs } = ctx

  return (
    firstAccountAtMs != null && record.createdAtMs != null && record.createdAtMs < firstAccountAtMs
  )
}

function isPlugRecord(record: RecordEntry): boolean {
  return (
    !record.accountId &&
    (record.category === RECONCILIATION_CATEGORY || record.category === SMS_RECONCILE_CATEGORY)
  )
}

interface Draft {
  kind: TraceKind
  suspect: boolean
  likely: boolean
  effect: number
  title: string
  detail: string
}

function finding(ctx: TraceContext, record: RecordEntry, draft: Draft): TraceFinding {
  return {
    id: `${draft.kind}:${record.id}:${draft.effect}`,
    kind: draft.kind,
    group: draft.suspect ? 'suspect' : 'known',
    certainty: draft.likely ? 'likely' : 'exact',
    effect: draft.effect,
    title: draft.title,
    detail: draft.detail,
    date: record.date,
    accountId: record.accountId || undefined,
    accountTitle: record.accountId ? ctx.accountTitles.get(record.accountId) : undefined,
    record: record.id ? { id: record.id, type: record.type } : undefined
  }
}

/** A record that sits inside the calculated balance: it should have moved a balance by the same amount. */
function inWindowDraft(
  ctx: TraceContext,
  record: RecordEntry,
  entries: WalletLedgerEntry[],
  counted: WalletLedgerEntry[]
): Draft | null {
  const signed = signedAmount(record)
  const moved = sumDelta(counted)
  const effect = roundMoney(moved - signed)

  if (!isSignificant(effect)) return null

  const label = recordLabel(record)
  const account = ctx.accountTitles.get(record.accountId) ?? 'حساب'
  const base = { effect, suspect: true, likely: false }

  if (isPlugRecord(record)) {
    return {
      ...base,
      kind: 'plug',
      suspect: false,
      title: `اصلاح قبلی: ${label}`,
      detail:
        'این رکورد را قبلاً برای بستن یک اختلاف ثبت کرده‌ای و روی هیچ حسابی اثر ندارد. اگر علت اصلی را پیدا کردی، می‌توانی آن را پاک کنی.'
    }
  }

  if (!record.accountId && enteredBeforeAccounts(ctx, record)) {
    return {
      ...base,
      kind: 'pre-accounts',
      suspect: false,
      title: `${label} — قبل از شروع گردش حساب`,
      detail: `این رکورد پیش از شروع «گردش حساب» ثبت شده؛ آن موقع اپ تغییر موجودی حساب‌ها را یادداشت نمی‌کرد، پس حسابی ندارد و بررسی‌اش ممکن نیست. ${money(
        signed
      )} در محاسبه آمده ولی روی هیچ حسابی ننشسته.`
    }
  }

  if (!record.accountId) {
    return {
      ...base,
      kind: 'no-account',
      title: `${label} — بدون حساب`,
      detail: `${typeWord(record)} ${money(
        signed
      )} در محاسبه آمده، ولی حسابی ندارد؛ پس موجودی هیچ حسابی عوض نشده. اگر پول واقعاً از یک حساب رفته یا به آن آمده، حساب را روی رکورد انتخاب کن.`
    }
  }

  if (record.moved === false) {
    return {
      ...base,
      kind: 'unapplied',
      title: `${label} — بدون اثر بر موجودی`,
      detail: `«اثر بر موجودی» روی این رکورد خاموش است؛ ${money(
        signed
      )} در محاسبه آمده ولی موجودی «${account}» عوض نشده. اگر پول واقعاً جابه‌جا شده، آن را روشن کن.`
    }
  }

  if (!entries.length) {
    return {
      ...base,
      likely: true,
      kind: 'no-ledger',
      title: `${label} — ثبت‌نشده در گردش حساب`,
      detail: `این رکورد به «${account}» وصل است ولی در گردش حساب ردی از آن نیست؛ احتمالاً موجودی هیچ‌وقت عوض نشده (رکورد قدیمی، ورود از فایل یا ثبت مستقیم در فایل گوگل‌شیت).`
    }
  }

  if (!counted.length && ctx.input.anchorIsSnapshot) {
    return {
      ...base,
      likely: true,
      kind: 'in-anchor',
      title: `${label} — دوبار شمرده شده`,
      detail:
        'موجودیِ این رکورد پیش از ثبت خودکار «موجودی اول» روی حساب نشسته بود و همان‌جا شمرده شد؛ محاسبه دوباره آن را اضافه کرده است.'
    }
  }

  const flipped = Math.sign(moved) !== Math.sign(signed) && moved !== 0

  return {
    ...base,
    kind: 'amount-mismatch',
    title: `${label} — مبلغ با حساب نمی‌خواند`,
    detail: `مبلغ رکورد ${money(signed)} است ولی اثر ثبت‌شده روی «${account}» ${money(moved)}${
      flipped ? ' و در جهت مخالف' : ''
    } است؛ بعد از ثبت، مبلغ یا نوع رکورد جای دیگری (مثلاً مستقیم در فایل گوگل‌شیت) عوض شده.`
  }
}

/** A record outside the calculated window that still moved a balance. */
function outsideWindowDraft(
  ctx: TraceContext,
  record: RecordEntry,
  counted: WalletLedgerEntry[]
): Draft | null {
  const { anchorStart, anchorWrittenAtMs, today } = ctx.input
  const label = recordLabel(record)

  if (record.date > today) {
    const effect = sumDelta(counted)

    return isSignificant(effect)
      ? {
          effect,
          suspect: false,
          likely: false,
          kind: 'future-dated',
          title: `${label} — تاریخ آینده`,
          detail: `تاریخ این رکورد ${formatIsoDatePersian(
            record.date
          )} است (بعد از امروز) و موجودی حساب همین حالا عوض شده، ولی محاسبه آن را تا رسیدن آن روز نمی‌شمارد. با گذر زمان خودش درست می‌شود.`
        }
      : null
  }

  if (record.date < anchorStart && anchorWrittenAtMs != null) {
    const late = counted.filter(entry => {
      const created = parseCreatedAtMs(entry.createdAt)

      return created != null && created >= anchorWrittenAtMs
    })
    const effect = sumDelta(late)

    return isSignificant(effect)
      ? {
          effect,
          suspect: true,
          likely: true,
          kind: 'backdated',
          title: `${label} — با تاریخ قدیمی`,
          detail: `تاریخ رکورد (${formatIsoDatePersian(
            record.date
          )}) قبل از ماه شروع محاسبه است، ولی بعد از ثبت «موجودی اول» وارد شد؛ موجودی حساب عوض شد و محاسبه آن را نمی‌شمارد.`
        }
      : null
  }

  return null
}

/** One finding per income/expense record that disagrees with the balance history. */
export function recordFindings(ctx: TraceContext): TraceFinding[] {
  const { anchorStart, today } = ctx.input
  const findings: TraceFinding[] = []

  for (const record of ctx.input.records) {
    if (!record.id || !record.date || !(record.amount > 0)) continue

    const entries = ctx.ledgerByRecord.get(record.id) ?? []
    const counted = entries.filter(
      entry => entry.applied && entry.accountId && countsAfterOpening(ctx, entry)
    )
    const inWindow = record.date >= anchorStart && record.date <= today
    const draft = inWindow
      ? inWindowDraft(ctx, record, entries, counted)
      : outsideWindowDraft(ctx, record, counted)

    if (draft) findings.push(finding(ctx, record, draft))
  }

  return findings
}
