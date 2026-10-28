import { useEffect, useMemo, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import { pendingReminders, recurringDueDate } from '../../services/recurring'
import { fetchRecurringItems, stripRow } from '../../services/recurringSheet'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { RecurringItem } from '../../types'
import { getJalaliMonthKey } from '../../utils/dateRange'
import { isoToJalali, JALALI_MONTHS, getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { showInfo, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardHintClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'
import {
  recurringCardClass,
  recurringCardHeadClass,
  recurringCheckboxClass,
  recurringRowAmountClass,
  recurringRowClass,
  recurringRowDayClass,
  recurringRowMetaClass,
  recurringRowsClass,
  recurringRowTextClass,
  recurringRowTitleClass
} from '../ui/recurringStyles'

const TYPE_LABEL = { income: 'درآمد', expense: 'هزینه' } as const

/**
 * «ثبت تکرارهای مهر» (resume-card family): reminder-mode items not handled this month,
 * one tick per item. «ثبت همه» posts the ticked ones and skips the rest this month.
 */
export default function DashboardRecurringCard() {
  const spreadsheetId = getSettings()?.spreadsheetId
  const revision = useDataRefresh()
  const [items, setItems] = useState<RecurringItem[]>([])
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map())
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const submitLock = useSubmitLock()
  const today = getTodayIso()

  useEffect(() => {
    if (!spreadsheetId) return

    let live = true

    void Promise.all([
      fetchRecurringItems(spreadsheetId),
      fetchWalletAccounts(spreadsheetId).catch(() => [])
    ])
      .then(([rows, walletAccounts]) => {
        if (!live) return
        setItems(pendingReminders(rows.map(stripRow), getTodayIso()))
        setAccounts(new Map(walletAccounts.map(account => [account.id, account.title])))
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [spreadsheetId, revision])

  const ticked = useMemo(
    () => new Set(items.filter(item => !unticked.has(item.id)).map(item => item.id)),
    [items, unticked]
  )

  if (!spreadsheetId || !items.length) return null

  const monthKey = getJalaliMonthKey(today)
  const monthName = JALALI_MONTHS[isoToJalali(today).month - 1]

  // A second tap in the same tick (before `busy` re-renders) is ignored by the lock.
  const postAll = () =>
    submitLock(async () => {
      const settings = getSettings()

      if (!settings) return

      setBusy(true)
      try {
        // Posting (records, balances) loads only when used.
        const { postReminderItems } = await import('../../services/recurringPost')
        let marked = 0
        const written = await postReminderItems(settings, items, ticked, today, {
          onDuplicate: item => {
            marked += 1
            showInfo(`«${item.title || item.category}» قبلاً ثبت شده بود؛ فقط علامت زده شد`)
          }
        })

        setItems([])
        if (written || !marked) {
          showSuccess(
            written
              ? `${written.toLocaleString('fa-IR')} تراکنش تکراری ثبت شد`
              : `تکرارهای ${monthName} رد شد`
          )
        }
      } catch (err) {
        handleSheetError(err, { fallbackMessage: 'ثبت تکرارها انجام نشد' })
      } finally {
        setBusy(false)
      }
    })

  return (
    <Card className={`${guideCardClass} ${recurringCardClass}`}>
      <div className={recurringCardHeadClass}>
        <span className={guideCardIconClass} aria-hidden="true">
          <AppIcon name="refresh" size={20} />
        </span>
        <div className={guideCardTextClass}>
          <span className={guideCardTitleClass}>{`ثبت تکرارهای ${monthName}`}</span>
          <span className={guideCardHintClass}>
            {`${ticked.size.toLocaleString('fa-IR')} از ${items.length.toLocaleString(
              'fa-IR'
            )} تراکنش تکراری این ماه انتخاب شده`}
          </span>
        </div>
        <Button type="button" size="sm" loading={busy} disabled={busy} onClick={postAll}>
          ثبت همه
        </Button>
      </div>
      <div className={recurringRowsClass}>
        {items.map(item => {
          const account = accounts.get(item.accountId)
          const day = isoToJalali(recurringDueDate(item, monthKey)).day

          return (
            <label key={item.id} className={recurringRowClass}>
              <span className={recurringRowDayClass}>{day.toLocaleString('fa-IR')}</span>
              <span className={recurringRowTextClass}>
                <span className={recurringRowTitleClass}>{item.title || item.category}</span>
                <span className={recurringRowMetaClass}>
                  {[TYPE_LABEL[item.type], account].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className={recurringRowAmountClass}>
                <MoneyText amount={item.amount} />
              </span>
              <input
                type="checkbox"
                className={recurringCheckboxClass}
                checked={ticked.has(item.id)}
                disabled={busy}
                aria-label={`ثبت ${item.title || item.category}`}
                onChange={event =>
                  setUnticked(current => {
                    const next = new Set(current)

                    if (event.target.checked) next.delete(item.id)
                    else next.add(item.id)

                    return next
                  })
                }
              />
            </label>
          )
        })}
      </div>
    </Card>
  )
}
