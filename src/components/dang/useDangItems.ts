import { useState, useEffect, useCallback } from 'react'

import type { DangWithRow } from './types'
import { useDangAmountEdit } from './useDangAmountEdit'
import { dangPaymentRecordIds, useDangPaymentActions } from './useDangPaymentActions'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { usePaidItemActions } from '../../hooks/usePaidItemActions'
import { useIsBuildingWorkspace } from '../../hooks/useWorkspaceType'
import { dangOriginRecordIds, repaymentSubCategory } from '../../services/buildingDang'
import { isBridgedDang, toggleBuildingDangPaid } from '../../services/buildingDangBridge'
import { syncCategoriesFromSheet } from '../../services/categories'
import { ensureCounterpartiesSheet, fetchCounterparties } from '../../services/counterparties'
import {
  deleteDang,
  ensureDangSheet,
  exportDangsCsv,
  exportDangsPdf,
  fetchDangs,
  importDangsCsv,
  sortDangs,
  toggleDangPaid
} from '../../services/dang'
import { dangPrefixes } from '../../services/dangTitles'
import { getDangCategories, getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { formatMoney } from '../../utils/formatMoney'
import { dangLinkedCount } from '../../utils/linkedRecordsDelete'
import { handleSheetError } from '../../utils/sheetError'
import type { CounterpartyWithRow } from '../counterparties/types'

export function useDangItems() {
  const [items, setItems] = useState<DangWithRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [categories, setCategories] = useState<string[]>(() => getDangCategories())
  const [counterparties, setCounterparties] = useState<CounterpartyWithRow[]>([])

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensureDangSheet(spreadsheetId)
      await syncCategoriesFromSheet(spreadsheetId)
      setCategories(getDangCategories())
      await ensureCounterpartiesSheet(spreadsheetId)
      setCounterparties(await fetchCounterparties(spreadsheetId))

      const data = await fetchDangs(spreadsheetId)

      setItems(data)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری بدهی‌ها' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems, dataRevision])

  const building = useIsBuildingWorkspace()

  const payments = useDangPaymentActions(setItems)

  const amountEdit = useDangAmountEdit(setItems)

  // A building settles a debt with one sheet (account, bridge); the personal list pays in pieces.
  const paidActions = usePaidItemActions({
    items,
    setItems,
    loadItems,
    togglePaid: building ? toggleBuildingDangPaid : toggleDangPaid,
    settle: building
      ? {
          type: 'expense',
          titleFor: item => `تسویهٔ «${item.title}» · ${formatMoney(item.amount)}`,
          amountFor: item => item.amount,
          recordIdOf: item => item.transactionRecordId,
          // A building's repayment records are titled «بازپرداخت به …»; older ones kept «بدهی: ».
          prefix: dangPrefixes(true),
          // A building's debt came from an expense: that record is the cost, not the repayment.
          linkedIds: [
            ...items.flatMap(item => (item.transactionRecordId ? [item.transactionRecordId] : [])),
            ...dangOriginRecordIds(items)
          ],
          noteFor: item =>
            `«${repaymentSubCategory(
              item.counterparty
            )}» از حساب صندوق به‌صورت انتقال ثبت می‌شود؛ هزینهٔ تازه‌ای ثبت نمی‌شود.`,
          bridgeFor: isBridgedDang
        }
      : undefined,
    deleteItem: deleteDang,
    sortItems: sortDangs,
    deleteLabel: item => `بدهی «${item.title}»`,
    deleteErrorMessage: 'خطا در حذف بدهی',
    linkedRecordCount: dangLinkedCount,
    onBeforeDelete: item => {
      if (expandedId === item.id) setExpandedId(null)
    },
    importExport: {
      exportFn: exportDangsCsv,
      exportPdfFn: exportDangsPdf,
      importFn: importDangsCsv
    }
  })

  /** Opens or closes a card; the open payment forms belong to the card that was open. */
  const toggleExpanded = (id: string | null) => {
    setExpandedId(id)
    payments.clearPaymentForms()
  }

  return {
    items: paidActions.visibleItems,
    loading,
    building,
    categories,
    setCategories,
    counterparties,
    setCounterparties,
    expandedId,
    setExpandedId,
    toggleExpanded,
    loadItems,
    ...amountEdit,
    ...paidActions,
    payments: {
      ...payments,
      linkedIds: dangPaymentRecordIds(items)
    },
    // The personal list pays through its own flow; a building through the settle sheet.
    settleFlow: building ? paidActions.settleFlow : payments.settleFlow
  }
}
