import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useTransferModal } from './transfers/useTransferModal'
import type { WalletAccountWithRow } from './types'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { getPathForTab } from '../../routes/paths'
import { buildEntryDraftState } from '../../services/entryDraft'
import { isConfigured } from '../../services/settings'
import type { LedgerEntry } from '../../services/walletLedger'
import { exportLedgerCsv, exportLedgerPdf } from '../../services/walletLedgerExport'
import AppIcon from '../AppIcon'
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
 * move money out of it to another account («انتقال»), refresh, and export the history as CSV or PDF.
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
    exportFn: () => exportLedgerCsv(account.title, entries),
    exportPdfFn: () => exportLedgerPdf(account.title, entries)
  })

  const { canTransfer, openTransfer, modalProps } = useTransferModal()

  const openEntry = useCallback(
    (formType: 'income' | 'expense') =>
      navigate(getPathForTab('entry', { formType }), {
        state: buildEntryDraftState(formType, { [WALLET_ACCOUNT_FIELD_ID]: account.id })
      }),
    [account.id, navigate]
  )

  const config = useMemo(() => {
    if (!isConfigured()) return null

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
        ...(canTransfer
          ? [
              {
                id: 'transfer',
                label: 'انتقال',
                icon: <AppIcon name="swap" size={18} />,
                onClick: () => openTransfer(account.id)
              }
            ]
          : []),
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: () => void reload(),
          disabled: loading
        },
        {
          id: 'export',
          label: 'خروجی CSV',
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
  }, [
    account.id,
    canTransfer,
    entries.length,
    handleExport,
    handleExportPdf,
    loading,
    openEntry,
    openTransfer,
    reload
  ])

  useRegisterPageSpeedDial(config)

  return { confirmModal: importExportConfirmModal, openEntry, transferModalProps: modalProps }
}
