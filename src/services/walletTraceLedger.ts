import { parseCreatedAtMs } from './recordDuplicates'
import type { LedgerEntry } from './walletLedger'
import { make, relevant, type Draft } from './walletTraceDraft'
import { isSignificant, ledgerDelta, money, sumDelta } from './walletTraceRecords'
import {
  isTransferEntry,
  orphanTransferFindings,
  transferDraft,
  transferRowExists
} from './walletTraceTransfers'
import type { TraceContext, TraceFinding } from './walletTraceTypes'
import { roundMoney } from '../utils/roundMoney'
import { normalizeSheetDate } from '../utils/sheetValues'

function entryDraft(ctx: TraceContext, entry: LedgerEntry): Draft {
  const account = ctx.accountTitles.get(entry.accountId) ?? 'حساب'
  const base = {
    id: '',
    effect: entry.delta,
    date: normalizeSheetDate(entry.date),
    accountId: entry.accountId,
    likely: false
  }

  if (entry.source === 'goal-deposit') {
    return {
      ...base,
      id: `goal:${entry.id}`,
      kind: 'goal',
      suspect: false,
      title: entry.title || 'هدف پس‌انداز',
      detail: `${entry.delta < 0 ? 'پول از' : 'پول به'} «${account}» ${
        entry.delta < 0 ? 'به هدف پس‌انداز رفته' : 'از هدف پس‌انداز برگشته'
      }؛ هزینه یا درآمد نیست ولی موجودی حساب را عوض می‌کند، پس محاسبه آن را نمی‌بیند.`
    }
  }

  if (isTransferEntry(entry)) return transferDraft(ctx, entry)

  if (entry.source === 'اصلاح دستی') {
    return {
      ...base,
      id: `manual-balance:${entry.id}`,
      kind: 'manual-balance',
      suspect: true,
      title: `ویرایش دستی موجودی «${account}»`,
      detail: `موجودی از ${money(entry.balanceAfter - entry.delta)} به ${money(
        entry.balanceAfter
      )} تغییر کرده، بدون ثبت درآمد یا هزینه. اگر عدد را اشتباه زده‌ای، همین جا اختلاف ساخته شده.`
    }
  }

  if (entry.source === 'موجودی اولیه') {
    return {
      ...base,
      id: `initial-balance:${entry.id}`,
      kind: 'initial-balance',
      suspect: false,
      title: `حساب جدید «${account}»`,
      detail: `این حساب بعد از شروع محاسبه با موجودی ${money(
        entry.delta
      )} ساخته شده؛ این پول درآمد ثبت نشده، پس در محاسبه نیست.`
    }
  }

  return {
    ...base,
    id: `unlinked-ledger:${entry.id}`,
    kind: 'unlinked-ledger',
    suspect: true,
    likely: true,
    title: entry.title || 'تغییر موجودی',
    detail: `موجودی «${account}» به اندازهٔ ${money(
      entry.delta
    )} عوض شده، بدون اینکه به رکوردی وصل باشد.`
  }
}

/** History rows no income/expense record explains: goals, typed balances, new accounts, deleted records. */
export function unlinkedFindings(ctx: TraceContext): TraceFinding[] {
  const findings: TraceFinding[] = []
  const orphans = new Map<string, LedgerEntry[]>()
  const transferOrphans = new Map<string, LedgerEntry[]>()

  for (const entry of ctx.input.ledger) {
    if (!entry.applied || !entry.accountId) continue
    if (entry.recordId && ctx.recordIds.has(entry.recordId)) continue
    if (!relevant(ctx, entry)) continue

    if (isTransferEntry(entry) && entry.recordId && !transferRowExists(ctx, entry)) {
      const key = `${entry.recordId}:${entry.accountId}`

      transferOrphans.set(key, [...(transferOrphans.get(key) ?? []), entry])
      continue
    }
    if (entry.recordId && entry.source !== 'goal-deposit' && !isTransferEntry(entry)) {
      orphans.set(entry.recordId, [...(orphans.get(entry.recordId) ?? []), entry])
      continue
    }
    findings.push(make(ctx, entryDraft(ctx, entry)))
  }

  for (const [recordId, entries] of orphans) {
    const effect = sumDelta(entries)

    if (!isSignificant(effect)) continue

    const last = entries[entries.length - 1]

    findings.push(
      make(ctx, {
        id: `orphan-ledger:${recordId}`,
        kind: 'orphan-ledger',
        suspect: true,
        likely: true,
        effect,
        title: last.title || 'رکورد ناپیدا',
        detail: `گردش حساب برای رکوردی ثبت شده که دیگر پیدا نمی‌شود، ولی اثرش روی موجودی (${money(
          effect
        )}) برنگشته؛ احتمالاً رکورد مستقیم در فایل گوگل‌شیت پاک شده.`,
        date: normalizeSheetDate(last.date),
        accountId: last.accountId
      })
    )
  }

  return [...findings, ...orphanTransferFindings(ctx, transferOrphans)]
}

/** Equal and opposite gaps of one account are two rows appended out of order, not a real change. */
function dropReorderNoise(gaps: TraceFinding[]): TraceFinding[] {
  const kept = [...gaps]

  for (let i = 0; i < kept.length; i += 1) {
    const j = kept.findIndex(
      (other, index) => index > i && Math.abs(other.effect + kept[i].effect) < 0.5
    )

    if (j > -1) {
      kept.splice(j, 1)
      kept.splice(i, 1)
      i -= 1
    }
  }

  return kept
}

function accountGaps(ctx: TraceContext, accountId: string, balance: number): TraceFinding[] {
  const entries = ctx.input.ledger.filter(entry => entry.accountId === accountId)
  const title = ctx.accountTitles.get(accountId) ?? 'حساب'
  const gaps: TraceFinding[] = []
  const add = (entry: LedgerEntry, id: string, gap: number, detail: string, dated: boolean) => {
    gaps.push(
      make(ctx, {
        id,
        kind: 'outside-ledger',
        suspect: true,
        likely: true,
        effect: gap,
        title: `موجودی «${title}» بدون گردش عوض شده`,
        detail,
        date: dated ? normalizeSheetDate(entry.date) : '',
        accountId
      })
    )
  }

  entries.forEach((entry, index) => {
    const before = index ? entries[index - 1].balanceAfter : 0
    const gap = roundMoney(entry.balanceAfter - ledgerDelta(entry) - before)

    // The first row of an older account starts from an unknown balance.
    if (!isSignificant(gap) || !relevant(ctx, entry)) return
    if (!index && entry.source !== 'موجودی اولیه') return
    add(
      entry,
      `outside-ledger:${entry.id}`,
      gap,
      `${
        index ? `بین «${entries[index - 1].title}» و «${entry.title}»` : 'قبل از «موجودی اولیه»'
      } موجودی «${title}» به اندازهٔ ${money(
        gap
      )} بدون ثبت گردش عوض شده؛ مثلاً ویرایش مستقیم در فایل گوگل‌شیت یا ثبت هم‌زمان از دو دستگاه.`,
      true
    )
  })

  const last = entries[entries.length - 1]
  const tail = last ? roundMoney(balance - last.balanceAfter) : 0

  if (last && isSignificant(tail) && relevant(ctx, last)) {
    add(
      last,
      `outside-ledger:${accountId}:tail`,
      tail,
      `بعد از آخرین گردش («${last.title}») موجودی «${title}» به اندازهٔ ${money(
        tail
      )} بدون ثبت گردش عوض شده؛ مثلاً ویرایش مستقیم در فایل گوگل‌شیت یا ثبت هم‌زمان از دو دستگاه.`,
      false
    )
  }

  return dropReorderNoise(gaps)
}

/** Balance changes with no history row, accounts born with money, and deleted accounts. */
export function accountFindings(ctx: TraceContext): TraceFinding[] {
  const { accounts, ledger, anchorWrittenAtMs } = ctx.input
  const findings: TraceFinding[] = []
  const known = new Set(accounts.map(account => account.id))

  for (const account of accounts) {
    if (ledger.some(entry => entry.accountId === account.id)) {
      findings.push(...accountGaps(ctx, account.id, account.balance))
      continue
    }

    const created = parseCreatedAtMs(account.createdAt)

    if (!account.balance || created == null || anchorWrittenAtMs == null) continue
    if (created < anchorWrittenAtMs) continue
    findings.push(
      make(ctx, {
        id: `outside-ledger:${account.id}:new`,
        kind: 'outside-ledger',
        suspect: true,
        likely: true,
        effect: account.balance,
        title: `حساب «${account.title}» با موجودی و بدون گردش`,
        detail: `این حساب بعد از شروع محاسبه با موجودی ${money(
          account.balance
        )} ساخته شده و هیچ گردشی ندارد؛ این پول درآمد ثبت نشده، پس در محاسبه نیست.`,
        date: '',
        accountId: account.id
      })
    )
  }

  const gone = new Map<string, LedgerEntry[]>()

  for (const entry of ledger) {
    if (entry.accountId && !known.has(entry.accountId)) {
      gone.set(entry.accountId, [...(gone.get(entry.accountId) ?? []), entry])
    }
  }

  for (const [accountId, entries] of gone) {
    const last = entries[entries.length - 1]

    if (!isSignificant(last.balanceAfter) || !entries.some(entry => relevant(ctx, entry))) continue
    findings.push(
      make(ctx, {
        id: `deleted-account:${accountId}`,
        kind: 'deleted-account',
        suspect: true,
        likely: true,
        effect: -last.balanceAfter,
        title: 'حساب حذف‌شده با موجودی',
        detail: `حسابی که آخرین موجودی‌اش ${money(last.balanceAfter)} بود (آخرین گردش: «${
          last.title
        }») حذف شده و این پول از مجموع کیف پول بیرون رفته، بدون اینکه هزینه‌ای ثبت شود.`,
        date: '',
        accountId
      })
    )
  }

  return findings
}
