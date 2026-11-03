import { checkIntegrity, type IntegrityReport, type OutboxIssue } from './integrityCheck'
import { loadRecordLedger } from './recordLedger'
import { getFailedOutboxEntries, getOutboxEntries, type OutboxEntry } from './syncOutbox'
import { fetchTransfers } from './transfers'
import { fetchWalletAccounts } from './wallet'
import { fetchAllLedger } from './walletLedger'
import type { AppSettings } from '../types'

function outboxIssues(spreadsheetId: string): OutboxIssue[] {
  const issue = (entry: OutboxEntry, state: OutboxIssue['state']): OutboxIssue => ({
    id: entry.id,
    state,
    sheetName: entry.operation.sheetName,
    attempts: entry.attempts,
    createdAt: entry.createdAt,
    lastError: entry.lastError
  })

  return [
    ...getFailedOutboxEntries(spreadsheetId).map(entry => issue(entry, 'failed')),
    ...getOutboxEntries(spreadsheetId).map(entry =>
      issue(entry, entry.conflict ? 'conflict' : 'pending')
    )
  ]
}

/**
 * Reads accounts, their history, transfers, records and the write queue, and checks them. Reads
 * only. A tab that cannot be read fails the whole check: a comparison against half the history
 * would report differences that are not there.
 */
export async function loadIntegrityReport(settings: AppSettings): Promise<IntegrityReport> {
  const { spreadsheetId } = settings
  const [accounts, ledger, transfers, records] = await Promise.all([
    fetchWalletAccounts(spreadsheetId),
    fetchAllLedger(spreadsheetId),
    fetchTransfers(spreadsheetId).catch(() => []),
    loadRecordLedger(settings)
  ])

  return checkIntegrity({
    accounts,
    ledger,
    transfers,
    records,
    outbox: outboxIssues(spreadsheetId),
    now: Date.now()
  })
}
