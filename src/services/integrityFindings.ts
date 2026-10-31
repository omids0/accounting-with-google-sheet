import type { IntegrityFinding, IntegrityInput, OutboxIssue, RecordRef } from './integrityTypes'
import { OUTBOX_STUCK_AFTER_MS, OUTBOX_STUCK_ATTEMPTS } from './integrityTypes'
import { transferLegInfo, type Transfer } from './transfersModel'
import type { LedgerEntry } from './walletLedger'
import type { WalletAccount } from '../types'

export const nameOf = (account: WalletAccount | undefined) => account?.title.trim() || 'حساب'

export function recordFindings(
  records: RecordRef[],
  accounts: WalletAccount[]
): IntegrityFinding[] {
  const known = new Set(accounts.map(account => account.id))
  const seen = new Set<string>()
  const found: IntegrityFinding[] = []

  records.forEach((record, index) => {
    const accountId = record.accountId.trim()

    if (!accountId || known.has(accountId)) return

    const label = record.title?.trim() || record.category?.trim() || 'بدون عنوان'
    const id = `record-missing-account:${record.id || index}`

    if (seen.has(id)) return
    seen.add(id)
    found.push({
      id,
      kind: 'record-missing-account',
      severity: 'note',
      title: `رکورد «${label}» به حسابی اشاره می‌کند که نیست`,
      detail:
        'حساب این رکورد حذف شده یا شناسه‌اش در شیت عوض شده؛ موجودی هیچ حسابی از آن اثر نمی‌گیرد.',
      amount: record.amount,
      recordId: record.id
    })
  })

  return found
}

export function transferFindings(
  transfers: Transfer[],
  ledger: LedgerEntry[],
  accounts: WalletAccount[]
): IntegrityFinding[] {
  const titles = new Map(accounts.map(account => [account.id, nameOf(account)]))
  const label = (id: string) => `«${titles.get(id) ?? 'حساب حذف‌شده'}»`

  return transfers.flatMap<IntegrityFinding>(transfer => {
    const state = transferLegInfo(transfer, ledger).state

    if (state === 2) return []

    const where = `از ${label(transfer.fromAccountId)} به ${label(transfer.toAccountId)}`

    return [
      {
        id: `transfer-${state === 1 ? 'one' : 'no'}-leg:${transfer.id}`,
        kind: state === 1 ? 'transfer-one-leg' : 'transfer-no-leg',
        severity: 'problem',
        title:
          state === 1
            ? `انتقال ${where} فقط یک طرف دارد`
            : `انتقال ${where} هیچ‌کدام از دو طرفش اجرا نشده`,
        detail:
          state === 1
            ? 'پول فقط از یک حساب کم یا به یک حساب اضافه شده؛ معمولاً یعنی ثبت انتقال نیمه‌کاره ماند.'
            : 'ردیف انتقال هست ولی موجودی هیچ حسابی تغییر نکرده؛ معمولاً یعنی ثبت انتقال نیمه‌کاره ماند.',
        amount: transfer.amount,
        transferId: transfer.id
      }
    ]
  })
}

export function duplicateFindings(input: IntegrityInput): IntegrityFinding[] {
  const tabs: [string, (string | undefined)[]][] = [
    ['حساب‌ها', input.accounts.map(item => item.id)],
    ['گردش حساب', input.ledger.map(item => item.id)],
    ['انتقال‌ها', input.transfers.map(item => item.id)],
    ['رکوردها', input.records.map(item => item.id)]
  ]

  return tabs.flatMap(([tab, ids]) => {
    const count = new Map<string, number>()

    for (const id of ids) if (id?.trim()) count.set(id, (count.get(id) ?? 0) + 1)

    return [...count]
      .filter(([, times]) => times > 1)
      .map<IntegrityFinding>(([id, times]) => ({
        id: `duplicate-id:${tab}:${id}`,
        kind: 'duplicate-id',
        severity: 'problem',
        title: `شناسهٔ تکراری در «${tab}»`,
        detail: `یک شناسه ${times.toLocaleString(
          'fa-IR'
        )} بار آمده. معمولاً یعنی یک ردیف دو بار نوشته شده و در جمع‌ها دو بار شمرده می‌شود.`
      }))
  })
}

export function outboxFindings(outbox: OutboxIssue[], now: number): IntegrityFinding[] {
  return outbox.flatMap<IntegrityFinding>(issue => {
    const waited = now - issue.createdAt
    const stuck =
      issue.state !== 'pending' ||
      issue.attempts >= OUTBOX_STUCK_ATTEMPTS ||
      waited > OUTBOX_STUCK_AFTER_MS

    if (!stuck) return []

    const why = {
      failed: 'گوگل این تغییر را نپذیرفته و کنار گذاشته شده است.',
      conflict: 'این تغییر منتظر انتخاب شماست (نسخهٔ دستگاه دیگر فرق دارد).',
      pending: 'این تغییر مدتی است در صف مانده و به شیت نرسیده.'
    }[issue.state]

    return [
      {
        id: `outbox-stuck:${issue.id}`,
        kind: 'outbox-stuck',
        severity: issue.state === 'failed' ? 'problem' : 'note',
        title: `تغییر معلق در «${issue.sheetName}»`,
        detail: issue.lastError ? `${why} (${issue.lastError})` : why
      }
    ]
  })
}
