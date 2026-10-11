import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import type { WalletAccountWithRow } from './types'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { getPathForTab } from '../../routes/paths'
import { buildEntryDraftState } from '../../services/entryDraft'
import { isConfigured } from '../../services/settings'
import type { LedgerEntry } from '../../services/walletLedger'
import { exportLedgerCsv, exportLedgerPdf } from '../../services/walletLedgerExport'
import { WALLET_ACCOUNT_FIELD_ID } from '../form'
import SpeedDialIcon from '../SpeedDialIcon'
import {
  speedDialActionExpenseClass,
  speedDialActionIncomeClass,
  speedDialTypeIconExpenseClass,
  speedDialTypeIconIncomeClass
} from '../ui/speedDialStyles'

/**
 * Account history actions: record income/expense on this account (back here after saving),
 * refresh, and export the history as CSV or PDF.
 */
export function useWalletLedgerSpeedDial({
  account,
  entries,
  loading,
  reload
}: {
  account: WalletAccountWithRow
  entries: LedgerEntry[]
  loading: boolean
  reload: () => Promise<void>
}) {
  const navigate = useNavigate()
  const { handleExport, handleExportPdf, importExportConfirmModal } = useSheetImportExport({
    exportFn: async () => exportLedgerCsv(account.title, entries),
    exportPdfFn: async () => exportLedgerPdf(account.title, entries),
    importFn: async () => ({ imported: 0, skipped: 0 }),
    onComplete: () => {}
  })

  const config = useMemo(() => {
    if (!isConfigured()) return null

    const openEntry = (formType: 'income' | 'expense') =>
      navigate(getPathForTab('entry', { formType }), {
        state: buildEntryDraftState(formType, { [WALLET_ACCOUNT_FIELD_ID]: account.id })
      })

    return {
      ariaLabel: 'عملیات گردش حساب',
      actions: [
        {
          id: 'income',
          label: 'ثبت درآمد',
          icon: <span className={speedDialTypeIconIncomeClass}>+</span>,
          className: speedDialActionIncomeClass,
          onClick: () => openEntry('income')
        },
        {
          id: 'expense',
          label: 'ثبت هزینه',
          icon: <span className={speedDialTypeIconExpenseClass}>−</span>,
          className: speedDialActionExpenseClass,
          onClick: () => openEntry('expense')
        },
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: () => void reload(),
          disabled: loading
        },
        {
          id: 'export',
          label: 'اکسپورت',
          icon: <SpeedDialIcon name="export" />,
          onClick: handleExport,
          disabled: !entries.length
        },
        {
          id: 'export-pdf',
          label: 'خروجی PDF',
          icon: <SpeedDialIcon name="pdf" />,
          onClick: handleExportPdf,
          disabled: !entries.length
        }
      ]
    }
  }, [account.id, entries.length, handleExport, handleExportPdf, loading, navigate, reload])

  useRegisterPageSpeedDial(config)

  return importExportConfirmModal
}
