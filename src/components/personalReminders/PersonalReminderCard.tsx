import {
  getPersonalReminderCategoryLabel,
  getPersonalReminderRecurrenceLabel
} from '../../services/personalReminders'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { PersonalReminderWithRow } from './types'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { emptyTextClass } from '../ui/displayStyles'

type PersonalReminderCardProps = {
  item: PersonalReminderWithRow
  completing: boolean
  onComplete: (item: PersonalReminderWithRow) => void
  onEdit: (item: PersonalReminderWithRow) => void
  onDelete: (item: PersonalReminderWithRow) => void
}

export default function PersonalReminderCard({
  item,
  completing,
  onComplete,
  onEdit,
  onDelete
}: PersonalReminderCardProps) {
  const categoryLabel = getPersonalReminderCategoryLabel(item.category)
  const recurrenceLabel = getPersonalReminderRecurrenceLabel(item.recurrence)

  return (
    <Card className={item.enabled ? undefined : 'opacity-70'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{categoryLabel}</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{item.note || '—'}</div>
          <div className={emptyTextClass} style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            موعد: {formatIsoDatePersian(item.dueDate)} · {recurrenceLabel}
            {item.amount > 0 ? ` · ${formatMoney(item.amount)}` : ''}
            {item.daysBefore > 0 ? ` · ${item.daysBefore.toLocaleString('fa-IR')} روز قبل` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <CardEditButton onClick={() => onEdit(item)} />
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>

      {item.enabled && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          style={{ marginTop: '0.75rem' }}
          disabled={completing}
          onClick={() => onComplete(item)}
        >
          {completing && <span className="spinner" />}
          انجام شد
        </Button>
      )}
    </Card>
  )
}
