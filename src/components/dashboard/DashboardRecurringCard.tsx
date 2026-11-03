import { useEffect, useMemo, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSubmitLock } from '../../hooks/useSubmitLock'
import { pendingReminders, recurringDueDate } from '../../services/recurring'
import { fetchRecurringItems, stripRow } from '../../services/recurringSheet'
import { tickedIds } from '../../services/recurringTicks'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { RecurringItem } from '../../types'
import { getJalaliMonthKey } from '../../utils/dateRange'
import { isoToJalali, JALALI_MONTHS, getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { showInfo, showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import RecurringReminderRow from '../recurring/RecurringReminderRow'
import { useRecurringStatuses } from '../recurring/useRecurringStatuses'
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
  recurringRowsClass
} from '../ui/recurringStyles'

/**
 * «ثبت تکرارهای مهر» (resume-card family): reminder-mode items not handled this month,
 * one tick per item. «ثبت همه» posts the ticked ones and skips the rest this month.
 */
export default function DashboardRecurringCard() {
  const spreadsheetId = getSettings()?.spreadsheetId
  const revision = useDataRefresh()
  const [items, setItems] = useState<RecurringItem[]>([])
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map())
  // The user's own tick per item; without one, an item that is already recorded or probably repeats a record is off.
  const [choices, setChoices] = useState<ReadonlyMap<string, boolean>>(new Map())
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

  const statuses = useRecurringStatuses(items, today)
  // Nothing is ticked, and nothing can be posted, until the records have been checked.
  const ticked = useMemo(() => tickedIds(items, statuses, choices), [items, statuses, choices])

  if (!spreadsheetId || !items.length) return null

  const monthKey = getJalaliMonthKey(today)
  const monthName = JALALI_MONTHS[isoToJalali(today).month - 1]

  // A second tap in the same tick (before `busy` re-renders) is ignored by the lock.
  const postAll = () =>
    submitLock(async () => {
      const settings = getSettings()

      if (!settings || !statuses) return

      setBusy(true)
      try {
        // Posting (records, balances) loads only when used.
        const { postReminderItems } = await import('../../services/recurringPost')
        let marked = 0
        const written = await postReminderItems(settings, items, ticked, today, {
          // Ticked although already recorded: the user asked for a second record.
          recordAnyway: new Set(
            items.filter(item => statuses.get(item.id)?.kind === 'registered').map(item => item.id)
          ),
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
            {statuses
              ? `${ticked.size.toLocaleString('fa-IR')} از ${items.length.toLocaleString(
                  'fa-IR'
                )} تراکنش تکراری این ماه انتخاب شده`
              : 'در حال بررسی ثبت‌های قبلی…'}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          loading={busy}
          disabled={busy || !statuses}
          onClick={postAll}
        >
          ثبت همه
        </Button>
      </div>
      <div className={recurringRowsClass}>
        {items.map(item => (
          <RecurringReminderRow
            key={item.id}
            item={item}
            day={isoToJalali(recurringDueDate(item, monthKey)).day}
            account={accounts.get(item.accountId)}
            status={statuses ? statuses.get(item.id) ?? { kind: 'new' } : null}
            ticked={ticked.has(item.id)}
            disabled={busy}
            onToggle={checked => setChoices(current => new Map(current).set(item.id, checked))}
          />
        ))}
      </div>
    </Card>
  )
}
