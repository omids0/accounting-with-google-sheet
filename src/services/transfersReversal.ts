import { isTransferInFlight } from './transferInFlight'
import type { TransferLeg } from './transfersLegs'
import {
  DELETED_ACCOUNT_TITLE,
  transferLedgerNet,
  transferLegInfo,
  type Transfer,
  type TransferLegInfo
} from './transfersModel'
import { fetchAllLedger, type LedgerEntry } from './walletLedger'
import type { WalletAccount } from '../types'

/**
 * The balance moves that take back what the transfer REALLY did: the net of its history rows per
 * account (`transferLedgerNet`), not the amount on the transfer row. A phantom transfer (the save
 * was cut off before any balance moved) gives none, a half-done one gives only the side that moved,
 * and one that was already reversed gives none, so nothing is ever reversed twice or invented.
 * Empty too when an account that carries a move was deleted since: its share of the money left
 * with it, and moving the other side alone would create money. `from` / `to` are the accounts as
 * they are now (undefined: deleted).
 */
export function reversalLegs(
  transfer: Transfer,
  ledger: LedgerEntry[],
  from: WalletAccount | undefined,
  to: WalletAccount | undefined
): TransferLeg[] {
  const net = transferLedgerNet(transfer, ledger)
  const alive = new Map([from, to].flatMap(account => (account ? [[account.id, account]] : [])))

  if ([...net.keys()].some(accountId => !alive.has(accountId))) return []

  const fromTitle = from?.title ?? DELETED_ACCOUNT_TITLE
  const toTitle = to?.title ?? DELETED_ACCOUNT_TITLE
  const legs: TransferLeg[] = []
  const fromNet = net.get(transfer.fromAccountId)
  const toNet = net.get(transfer.toAccountId)

  if (fromNet !== undefined) {
    legs.push({
      accountId: transfer.fromAccountId,
      delta: -fromNet,
      title: `لغو انتقال به «${toTitle}»`,
      undoTitle: `بازگرداندن لغو انتقال به «${toTitle}»`
    })
  }
  if (toNet !== undefined) {
    legs.push({
      accountId: transfer.toAccountId,
      delta: -toNet,
      title: `لغو انتقال از «${fromTitle}»`,
      undoTitle: `بازگرداندن لغو انتقال از «${fromTitle}»`
    })
  }

  return legs
}

/**
 * Per transfer id: which of its balance moves exist (for the «ناتمام» badge and the delete
 * question). Empty when the history cannot be read: then nothing is claimed about any transfer.
 */
export async function fetchTransferLegInfos(
  spreadsheetId: string,
  transfers: Transfer[]
): Promise<Map<string, TransferLegInfo>> {
  // A transfer being saved right now has no moves yet: that is not a cut-off one.
  if (isTransferInFlight()) return new Map()

  try {
    const ledger = (await fetchAllLedger(spreadsheetId)).filter(
      entry => entry.source === 'transfer'
    )

    return new Map(transfers.map(transfer => [transfer.id, transferLegInfo(transfer, ledger)]))
  } catch {
    return new Map()
  }
}
