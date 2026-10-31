import type { LedgerEntry } from '../../services/recordDuplicates'
import { recordSourceLabel } from '../../services/recordWriteGuard'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import MoneyText from '../MoneyText'
import {
  duplicateRecordCardClass,
  duplicateRecordMetaClass,
  duplicateRecordTitleClass
} from '../ui/entryAssistStyles'

/** The record that looks like the one being saved: name, amount, day and where it came from. */
export default function DuplicateRecordCard({ record }: { record: LedgerEntry }) {
  return (
    <div className={duplicateRecordCardClass}>
      <span className={duplicateRecordTitleClass}>{record.title || record.category || '—'}</span>
      <span className={duplicateRecordMetaClass}>
        <bdi>
          <MoneyText amount={record.amount} />
        </bdi>
        {' · '}
        <bdi>{formatIsoDatePersian(record.date)}</bdi>
        {` · ${recordSourceLabel(record)}`}
      </span>
    </div>
  )
}
