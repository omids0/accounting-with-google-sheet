import { readBridgePrefs } from './bridgePrefs'
import { expenseIdOfDang } from './buildingExpenseSplit'
import { toggleDangPaid } from './dang'
import type { SettleOptions, UnlinkChoice } from './settleOptions'
import type { Dang } from '../types'

/** True for the debt of an expense whose receivable was written to the personal spreadsheet. */
export const isBridgedDang = (dang: Pick<Dang, 'id'>): boolean =>
  Boolean(readBridgePrefs().sent[expenseIdOfDang(dang.id)])

/**
 * Settling a building's debt (Step 7 writes the repayment transfer) also pays the personal
 * receivable it was bridged to, into the personal account the settle sheet asked for. The bridge
 * part runs after the repayment and only reports nothing on failure: the repayment stays.
 */
export async function toggleBuildingDangPaid(
  spreadsheetId: string,
  dang: Dang & { rowNumber: number },
  paid: boolean,
  options?: SettleOptions,
  unlink?: UnlinkChoice
): Promise<Dang> {
  const updated = await toggleDangPaid(spreadsheetId, dang, paid, options, unlink)

  if (paid && !dang.paid && options?.bridgeAccount !== undefined && isBridgedDang(dang)) {
    const { settleBridgedReceivable } = await import('./buildingBridge')

    void settleBridgedReceivable(expenseIdOfDang(dang.id), {
      amount: dang.amount,
      date: options.date,
      account: options.bridgeAccount
    }).catch(() => undefined)
  }

  return updated
}
