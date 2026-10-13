import type { ReconcileWizard } from './useReconcileWizard'
import { smsRecordDate } from '../../../services/bankSmsDate'
import type { ConfirmableSms } from '../../../services/bankSmsQueue'
import { smsMomentLabel } from '../../../services/bankSmsReconcile'
import type { LedgerEntry } from '../../../services/recordDuplicates'
import CalmBlock from '../../CalmBlock'
import DayBadge from '../../DayBadge'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import {
  calmEmptyClass,
  calmListClass,
  calmRowClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../../ui/calmListStyles'

const moreButtonClass =
  'inline-flex h-touch-min w-touch-min shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent text-[1.1rem] text-muted hover:text-text'

function SmsRow({ item, wizard }: { item: ConfirmableSms; wizard: ReconcileWizard }) {
  const debit = item.result.direction === 'debit'
  const category = wizard.choiceFor(item)?.category
  const when = smsMomentLabel(item.sms.receivedAt)

  return (
    <li className={calmRowClass}>
      <DayBadge date={smsRecordDate(item.sms.body, item.sms.receivedAt)} />
      <span className={calmRowMainClass}>
        <span className={calmRowTitleClass}>
          {debit ? 'برداشت' : 'واریز'} <MoneyText amount={item.amount} />
        </span>
        <span className={calmRowSubClass}>{category ? `${when} · ${category}` : when}</span>
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={wizard.busyKey === item.sms.id}
        disabled={wizard.busyKey !== null}
        onClick={() => wizard.save(item)}
      >
        ثبت
      </Button>
    </li>
  )
}

function RecordRow({ record, wizard }: { record: LedgerEntry; wizard: ReconcileWizard }) {
  const title = record.title || record.category || (record.type === 'expense' ? 'هزینه' : 'درآمد')

  return (
    <li className={calmRowClass}>
      <DayBadge date={record.date} />
      <span className={calmRowMainClass}>
        <span className={calmRowTitleClass}>
          {title} <MoneyText amount={record.amount} />
        </span>
        <span className={calmRowSubClass}>نقدی بوده؟ حساب را عوض کن</span>
      </span>
      <button
        type="button"
        className={moreButtonClass}
        aria-label={`ویرایش ${title}`}
        onClick={() => wizard.edit(record)}
      >
        ⋯
      </button>
    </li>
  )
}

/** Parts 2 and 3: SMS the app has no record for, and records no SMS confirms. */
export default function ReconcileLists({ wizard }: { wizard: ReconcileWizard }) {
  const missing = wizard.view?.missing ?? []
  const unmatched = wizard.view?.unmatched ?? []

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CalmBlock title="پیامک‌هایی که در اپ نیستند">
        {missing.length ? (
          <ul className={calmListClass}>
            {missing.map(item => (
              <SmsRow key={item.sms.id} item={item} wizard={wizard} />
            ))}
          </ul>
        ) : (
          <p className={calmEmptyClass}>همهٔ پیامک‌ها در اپ ثبت شده‌اند</p>
        )}
      </CalmBlock>
      <CalmBlock title="تراکنش‌های اپ بدون پیامک">
        {unmatched.length ? (
          <ul className={calmListClass}>
            {unmatched.map((record, index) => (
              <RecordRow key={record.id ?? index} record={record} wizard={wizard} />
            ))}
          </ul>
        ) : (
          <p className={calmEmptyClass}>همهٔ تراکنش‌های این حساب پیامک دارند</p>
        )}
      </CalmBlock>
    </div>
  )
}
