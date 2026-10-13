import { CHECKS_SHEET } from '../../services/checks'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import AttachmentBadge from '../attachments/AttachmentBadge'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import type { CheckWithRow } from './types'
import MoneyText from '../MoneyText'
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
  dangCheckboxClass,
  dangPaidAtClass
} from '../ui/featureCardStyles'

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
  return (
    <div className={dangCardClass({ paid: item.paid })} data-highlight-id={item.id}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <input
            type="checkbox"
            className={dangCheckboxClass}
            checked={item.paid}
            disabled={togglingId === item.id}
            aria-label={`پرداخت شد: چک ${item.checkNumber}`}
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
                />
              </span>
              <span className={dangCardAmountClass}>
                <MoneyText amount={item.amount} />
              </span>
            </div>
            <div className={dangCardMetaClass}>طرف حساب: {item.counterparty}</div>
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
              <p className={dangPaidAtClass}>در {item.paidAt} پرداخت شده</p>
            ) : null}
          </div>
        </div>
        <div className={cardActionButtonsClass}>
          <CardEditButton onClick={() => onEdit(item)} />
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
