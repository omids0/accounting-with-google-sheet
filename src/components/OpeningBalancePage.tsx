import { useState, useEffect, useCallback } from 'react'

import { AccordionCollapse } from './AccordionCollapse'
import AmountInput from './AmountInput'
import AppIcon from './AppIcon'
import { FormField } from './form'
import { InstallmentCardListSkeleton } from './skeleton'
import Button from './ui/Button'
import {
  fetchAllOpeningBalances,
  setOpeningBalance,
  type MonthlyOpeningBalance
} from '../services/monthlyBalance'
import { getSettings, isConfigured } from '../services/settings'
import { requireAuth, requireSpreadsheetId } from '../utils/authGuard'
import { formatJalaliMonthLabel, getDateRange, getJalaliMonthKey } from '../utils/dateRange'
import { formatMoney } from '../utils/formatMoney'
import { handleSheetError } from '../utils/sheetError'
import { showError, showSuccess } from '../utils/toast'

type OpeningBalanceWithRow = MonthlyOpeningBalance & { rowNumber: number }

type EditState = {
  amount: number | ''
  note: string
}

export default function OpeningBalancePage() {
  const [items, setItems] = useState<OpeningBalanceWithRow[]>([])

  const [edits, setEdits] = useState<Record<string, EditState>>({})

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)

  const [savingId, setSavingId] = useState('')

  const currentMonthKey = getJalaliMonthKey(getDateRange('month-to-date').start)

  const syncEdits = useCallback((balances: OpeningBalanceWithRow[]) => {
    const next: Record<string, EditState> = {}

    for (const item of balances) {
      next[item.monthKey] = { amount: item.amount, note: item.note }
    }
    setEdits(next)
  }, [])

  const loadItems = useCallback(async () => {
    const settings = getSettings()

    if (!settings?.spreadsheetId) return
    if (!requireAuth()) return

    setLoading(true)
    try {
      const data = await fetchAllOpeningBalances(settings.spreadsheetId)

      const previousMonths = data.filter(item => item.monthKey < currentMonthKey)

      setItems(previousMonths)
      syncEdits(previousMonths)
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری موجودی اول دوره' })) return
    } finally {
      setLoading(false)
    }
  }, [currentMonthKey, syncEdits])

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
      setEdits(prev => ({
        ...prev,
        [item.monthKey]: { amount: updated.amount, note: updated.note }
      }))
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
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="installments" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>موجودی اول دوره</h2>
        <Button variant="secondary" size="sm" onClick={loadItems} disabled={loading} type="button">
          {loading ? '...' : '↻'}
        </Button>
      </div>

      <p className="opening-balance-page-hint">
        موجودی کیف پول در ابتدای هر ماه. ماه جاری را از صفحه کیف پول ویرایش کنید.
      </p>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="installments" />
          </div>
          <p>هنوز موجودی اول دوره‌ای برای ماه‌های قبل ثبت نشده</p>
        </div>
      ) : (
        items.map(item => {
          const expanded = expandedId === item.monthKey

          const edit = edits[item.monthKey]

          const displayAmount =
            edit?.amount === '' || edit?.amount == null ? item.amount : Number(edit.amount)

          return (
            <div
              key={item.monthKey}
              className={`card installment-card interactive-card dashboard-opening-card wallet-item-card${
                expanded ? ' installment-card--expanded' : ''
              }`}
            >
              <button
                type="button"
                className={`installment-header wallet-item-header${
                  expanded ? ' installment-header--expanded' : ''
                }`}
                onClick={() => setExpandedId(expanded ? null : item.monthKey)}
              >
                <div className="wallet-item-info">
                  <div className="wallet-item-title-row">
                    <div className="wallet-item-title">{formatJalaliMonthLabel(item.monthKey)}</div>
                    <div className="wallet-item-amount list-card-amount-pill" dir="ltr">
                      {formatMoney(displayAmount)}
                    </div>
                  </div>
                  {item.updatedAt && (
                    <div className="wallet-item-note">آخرین ویرایش: {item.updatedAt}</div>
                  )}
                </div>
                <span className="installment-chevron">▼</span>
              </button>

              <AccordionCollapse open={expanded && !!edit}>
                <div className="installment-payments dashboard-opening-body">
                  <FormField label="موجودی اول دوره">
                    <AmountInput
                      value={edit.amount}
                      onChange={val =>
                        setEdits(prev => ({
                          ...prev,
                          [item.monthKey]: { ...prev[item.monthKey], amount: val }
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="توضیحات">
                    <textarea
                      value={edit.note}
                      onChange={e =>
                        setEdits(prev => ({
                          ...prev,
                          [item.monthKey]: { ...prev[item.monthKey], note: e.target.value }
                        }))
                      }
                      placeholder="توضیحات اختیاری"
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave(item)}
                    disabled={savingId === item.monthKey || loading}
                  >
                    {savingId === item.monthKey ? '...' : 'ذخیره'}
                  </Button>
                </div>
              </AccordionCollapse>
            </div>
          )
        })
      )}
    </div>
  )
}
