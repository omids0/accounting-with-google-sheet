import { useState, useEffect, useCallback } from 'react'

import AppIcon from './AppIcon'
import OpeningBalanceCard, {
  type OpeningBalanceEditState
} from './openingBalances/OpeningBalanceCard'
import { InstallmentCardListSkeleton } from './skeleton'
import Button from './ui/Button'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'
import { listCardsContainerClass, listModulePageClass } from './ui/featureCardStyles'
import { cardHeaderRowClass, openingBalancePageHintClass } from './ui/recordsStyles'
import {
  fetchAllOpeningBalances,
  setOpeningBalance,
  type MonthlyOpeningBalance
} from '../services/monthlyBalance'
import { isBeforeAnchor } from '../services/openingBalanceDerive'
import { getAnchorMonthKey } from '../services/periodSettings'
import { getSettings, isConfigured } from '../services/settings'
import { requireAuth, requireSpreadsheetId } from '../utils/authGuard'
import { formatJalaliMonthLabel } from '../utils/dateRange'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'

type OpeningBalanceWithRow = MonthlyOpeningBalance & { rowNumber: number }

/**
 * Without a known anchor nothing is derived yet, so months stay editable rather
 * than silently locking the whole history behind a failed lookup.
 */
function isEditableMonth(monthKey: string, anchorMonthKey: string): boolean {
  if (!anchorMonthKey) return true

  return isBeforeAnchor(monthKey, anchorMonthKey)
}

export default function OpeningBalancePage() {
  const [items, setItems] = useState<OpeningBalanceWithRow[]>([])

  const [edits, setEdits] = useState<Record<string, OpeningBalanceEditState>>({})

  const [anchorMonthKey, setAnchorMonthKey] = useState('')

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  const [savingId, setSavingId] = useState('')

  const syncEdits = useCallback((balances: OpeningBalanceWithRow[]) => {
    setEdits(prev => {
      const next = { ...prev }

      for (const item of balances) {
        next[item.monthKey] = { amount: item.amount, note: item.note }
      }

      return next
    })
  }, [])

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    setLoading(true)
    try {
      const [data, anchor] = await Promise.all([
        fetchAllOpeningBalances(settings.spreadsheetId),
        getAnchorMonthKey(settings.spreadsheetId).catch(() => '')
      ])

      setAnchorMonthKey(anchor)
      setItems(data)
      syncEdits(data.filter(item => isEditableMonth(item.monthKey, anchor)))
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری موجودی اول دوره' })) return
    } finally {
      setLoading(false)
    }
  }, [syncEdits])

  useEffect(() => {
    if (isConfigured()) loadItems()
  }, [loadItems])

  const handleSave = async (item: OpeningBalanceWithRow) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const edit = edits[item.monthKey]

    if (!edit || edit.amount === '' || edit.amount < 0) {
      showError('مبلغ نامعتبر است')
      syncEdits([item])

      return
    }
    if (edit.amount === item.amount && edit.note === item.note) return

    setSavingId(item.monthKey)
    try {
      const updated = await setOpeningBalance(
        spreadsheetId,
        item.monthKey,
        Number(edit.amount),
        edit.note.trim()
      )

      setItems(prev =>
        prev
          .map(entry =>
            entry.monthKey === item.monthKey ? { ...updated, rowNumber: item.rowNumber } : entry
          )
          .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      )
      syncEdits([{ ...updated, rowNumber: item.rowNumber }])
      showSuccess(`موجودی ${formatJalaliMonthLabel(item.monthKey)} ذخیره شد`)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در ذخیره موجودی اول' })) return
      syncEdits([item])
    } finally {
      setSavingId('')
    }
  }

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="installments" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={listModulePageClass}>
      <div className={cardHeaderRowClass} style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>موجودی اول دوره</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadItems}
          disabled={loading}
          loading={loading}
          type="button"
        >
          ↻
        </Button>
      </div>

      <p className={openingBalancePageHintClass}>
        {anchorMonthKey
          ? `از ${formatJalaliMonthLabel(
              anchorMonthKey
            )} به بعد، موجودی اول هر ماه خودکار از مانده پایان ماه قبل محاسبه می‌شود و قابل ویرایش نیست.`
          : 'موجودی کیف پول در ابتدای هر ماه.'}
      </p>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton />
      ) : items.length === 0 ? (
        <div className={emptyStateClass}>
          <div className={emptyStateIconClass}>
            <AppIcon name="installments" />
          </div>
          <p>هنوز موجودی اول دوره‌ای ثبت نشده</p>
        </div>
      ) : (
        <div className={listCardsContainerClass}>
          {items.map(item => (
            <OpeningBalanceCard
              key={item.monthKey}
              item={item}
              expanded={expandedId === item.monthKey}
              derived={!isEditableMonth(item.monthKey, anchorMonthKey)}
              isAnchor={item.monthKey === anchorMonthKey}
              edit={edits[item.monthKey]}
              saving={savingId === item.monthKey}
              onToggle={() => setExpandedId(expandedId === item.monthKey ? null : item.monthKey)}
              onEditChange={next => setEdits(prev => ({ ...prev, [item.monthKey]: next }))}
              onSave={() => handleSave(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
