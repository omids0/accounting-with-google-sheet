import { useMemo, useState, type ReactNode } from 'react'

import { DAYS_1_28 } from './buildingOptions'
import IssuePreviewTable from './IssuePreviewTable'
import { useBuildingSetupData } from './useBuildingSetupData'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { issueCharges } from '../../services/buildingChargeActions'
import { planIssueFrom } from '../../services/buildingChargePlan'
import { latestChargeMonth, missingIssueMonths } from '../../services/buildingCharges'
import { dueDateOf, monthLabel, monthName, nextMonthKey } from '../../services/buildingMonths'
import { chargeResidents } from '../../services/buildingResidents'
import { getSettings } from '../../services/settings'
import { getTodayIso } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import { journeyNoteClass, journeyTotalClass } from '../ui/buildingStyles'

export interface IssueChargesSheetProps {
  open: boolean
  /** Jalali `YYYY-MM`: the month to issue. */
  monthKey: string
  /** The journey's first issue: always manual, with the preview. */
  firstIssue?: boolean
  /** The journey's step bar. */
  header?: ReactNode
  onClose: () => void
  /** Called once the charges are written; `count` is how many units were billed. */
  onIssued: (count: number) => void
}

const fa = (value: number) => toPersianDigits(String(value))

function IssueChargesForm({
  monthKey,
  firstIssue,
  header,
  onClose,
  onIssued
}: Omit<IssueChargesSheetProps, 'open'>) {
  const data = useBuildingSetupData()
  const { can } = useBuildingAccess()
  const [month, setMonth] = useState(monthKey)
  const [dueDay, setDueDay] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const { profile, units, stays, persons, receivables } = data

  const months = useMemo(() => {
    const missing = profile ? missingIssueMonths(profile, receivables, getTodayIso()) : []

    const latest = latestChargeMonth(receivables)

    return [...new Set([...missing, monthKey, ...(latest ? [nextMonthKey(latest)] : [])])].sort()
  }, [profile, receivables, monthKey])

  const plan = useMemo(
    () =>
      profile
        ? planIssueFrom(profile, units, chargeResidents(stays, persons), receivables, month)
        : null,
    [profile, units, stays, persons, receivables, month]
  )

  const day = dueDay || String(profile?.dueDay ?? 10)

  const submit = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!plan || !spreadsheetId) return
    if (!can('issue')) {
      showError('دسترسی ندارید')

      return
    }

    setSaving(true)
    try {
      const count = await issueCharges(
        spreadsheetId,
        plan,
        dueDateOf(month, Number(day)),
        note.trim()
      )

      showSuccess(
        count
          ? `شارژ ${monthName(month)} برای ${fa(count)} واحد صادر شد`
          : 'همهٔ واحدها قبلاً صادر شده‌اند (تکراری ساخته نشد)'
      )
      await data.reload()
      onIssued(count)
    } catch (err) {
      showError(toUserMessage(err, 'صدور شارژ ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const skipped = plan?.rows.filter(row => row.skip === 'no-debtor') ?? []

  const credit = plan?.rows.reduce((sum, row) => sum + row.fromCredit, 0) ?? 0

  return (
    <FormModal
      open
      title={firstIssue ? 'شارژ اول' : 'صدور شارژ'}
      header={header}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
      saving={saving}
      saveDisabled={!plan?.count || !can('issue')}
      saveHint={can('issue') ? undefined : 'صدور شارژ با نقش شما ممکن نیست'}
      saveLabel={plan?.count ? `صدور برای ${fa(plan.count)} واحد` : 'همه قبلاً صادر شده'}
      cancelLabel="بستن"
    >
      {firstIssue ? (
        <p className={journeyNoteClass}>
          شارژ اول همیشه دستی و با پیش‌نمایش صادر می‌شود؛ صدور خودکار ماه‌های بعد فقط بعد از آن شروع
          می‌شود.
        </p>
      ) : null}
      <FormSelect
        label="ماه"
        value={month}
        onChange={setMonth}
        options={months.map(value => ({ value, label: monthLabel(value) }))}
      />
      <FormSelect label="سررسید (روز ماه)" value={day} onChange={setDueDay} options={DAYS_1_28} />
      <FormField label="یادداشت (اختیاری)">
        <input value={note} onChange={event => setNote(event.target.value)} />
      </FormField>
      {plan ? (
        <>
          <IssuePreviewTable rows={plan.rows} />
          {skipped.length ? (
            <p className="m-0 text-[0.78rem] leading-[1.8] text-danger">
              بدون ساکن و مالک (صادر نمی‌شود):{' '}
              {skipped.map(row => toPersianDigits(row.unit.number)).join('، ')}
            </p>
          ) : null}
          <div className={journeyTotalClass}>
            <span>جمع · {fa(plan.count)} واحد</span>
            <MoneyText amount={plan.total} />
          </div>
          {credit > 0 ? (
            <p className="m-0 text-[0.78rem] leading-[1.8] text-success">
              اعتبار واحدها (<MoneyText amount={credit} />) خودکار از این شارژ کسر می‌شود.
            </p>
          ) : null}
        </>
      ) : (
        <p className={journeyNoteClass}>در حال بارگذاری...</p>
      )}
    </FormModal>
  )
}

/**
 * Round 11, Step 4 (screen 19): the issue sheet. A preview of what each unit will be billed —
 * debtor, basis, amount, the vacancy rule and the credit applied — with the month, the due day
 * and a note; units the month already has are greyed and skipped. «صدور برای N واحد» writes one
 * receivable per unit, and writing it twice writes nothing the second time.
 */
export default function IssueChargesSheet(props: IssueChargesSheetProps) {
  const { open, ...rest } = props

  return open ? <IssueChargesForm {...rest} /> : null
}
