import { checkTypeLabel, CHECK_DIRECTION_LABELS } from '../../services/checkDirection'
import { CHECKS_SHEET } from '../../services/checks'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import AttachmentBadge from '../attachments/AttachmentBadge'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import { checkCounterpartyLabel } from './checkDirectionOptions'
import type { CheckWithRow } from './types'
import TapCheckbox from '../form/TapCheckbox'
import MoneyText from '../MoneyText'
import { statusBadgeClass } from '../ui/displayStyles'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardAmountClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardDateClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardTitleClass,
  dangPaidAtClass
} from '../ui/featureCardStyles'
import { useReadOnly } from '../ui/readOnly'
import WriterAvatar from '../WriterAvatar'

export type CheckCardProps = {
  item: CheckWithRow
  togglingId: string
  onTogglePaid: (item: CheckWithRow, paid: boolean) => void
  onEdit: (item: CheckWithRow) => void
  onDelete: (item: CheckWithRow) => void
}

export default function CheckCard({
  item,
  togglingId,
  onTogglePaid,
  onEdit,
  onDelete
}: CheckCardProps) {
  const readOnly = useReadOnly()

  return (
    <div className={dangCardClass({ paid: item.paid })} data-highlight-id={item.id}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <TapCheckbox
            checked={item.paid}
            disabled={togglingId === item.id || readOnly}
            aria-label={`پاس شد: ${checkTypeLabel(item)} ${item.checkNumber}`}
            onChange={e => onTogglePaid(item, e.target.checked)}
          />
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>
                چک {item.checkNumber}{' '}
                <AttachmentBadge
                  sheetName={CHECKS_SHEET}
                  entityId={item.id}
                  fileIds={item.attachments}
                  title={`چک ${item.checkNumber}`}
                />{' '}
                {/* Text as well as colour: green for a check I get, red for one I give. */}
                <span className={statusBadgeClass(item.direction === 'received')}>
                  {CHECK_DIRECTION_LABELS[item.direction]}
                </span>
              </span>
              <span className={dangCardAmountClass}>
                <MoneyText amount={item.amount} />
              </span>
            </div>
            <div className={dangCardMetaClass}>
              <WriterAvatar email={item.writer} withName />
              {checkCounterpartyLabel(item.direction)}: {item.counterparty}
            </div>
            <div className={dangCardMetaClass}>
              {item.creationDate ? (
                <span>صدور: {formatIsoDatePersian(item.creationDate)}</span>
              ) : null}
              {item.dueDate ? (
                <span className={dangCardDateClass}>
                  · سررسید: {formatIsoDatePersian(item.dueDate)}
                </span>
              ) : null}
            </div>
            {item.paid && item.paidAt ? (
              <p className={dangPaidAtClass}>
                در{' '}
                {/^\d{4}-\d{2}-\d{2}/.test(item.paidAt)
                  ? formatIsoDatePersian(item.paidAt.slice(0, 10))
                  : item.paidAt}{' '}
                پاس شده
              </p>
            ) : null}
          </div>
        </div>
        <div className={cardActionButtonsClass}>
          <CardEditButton itemLabel={`چک ${item.checkNumber}`} onClick={() => onEdit(item)} />
          <CardDeleteButton itemLabel={`چک ${item.checkNumber}`} onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
