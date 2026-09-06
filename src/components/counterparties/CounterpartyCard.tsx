import { formatLocationLabel, getCounterpartyFullName } from '../../services/counterparties'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import PhoneNumberLinks from './PhoneNumberLinks'
import type { CounterpartyWithRow } from './types'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  dangCardBodyClass,
  dangCardClass,
  dangCardContentRowClass,
  dangCardDateClass,
  dangCardHeaderClass,
  dangCardMetaClass,
  dangCardTapAreaClass,
  dangCardTitleClass
} from '../ui/featureCardStyles'

type CounterpartyCardProps = {
  item: CounterpartyWithRow
  onView: (item: CounterpartyWithRow) => void
  onEdit: (item: CounterpartyWithRow) => void
  onDelete: (item: CounterpartyWithRow) => void
}

export default function CounterpartyCard({
  item,
  onView,
  onEdit,
  onDelete
}: CounterpartyCardProps) {
  const fullName = getCounterpartyFullName(item)
  const accountCount = item.accounts.length
  const locationLabel = formatLocationLabel(item.location)

  return (
    <div className={dangCardClass({})}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div
              className={dangCardTapAreaClass()}
              role="button"
              tabIndex={0}
              onClick={() => onView(item)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onView(item)
                }
              }}
              aria-label={`مشاهده جزئیات ${fullName || 'طرف حساب'}`}
            >
              <div className={dangCardHeaderClass}>
                <span className={dangCardTitleClass}>{fullName || '—'}</span>
              </div>
              {item.phones.length > 0 ? (
                <div className={dangCardMetaClass}>
                  <PhoneNumberLinks phones={item.phones} inline />
                </div>
              ) : null}
              {item.address ? <div className={dangCardMetaClass}>{item.address}</div> : null}
              {item.note ? <div className={dangCardMetaClass}>{item.note}</div> : null}
              {locationLabel ? (
                <div className={dangCardMetaClass} dir="ltr">
                  موقعیت: {locationLabel}
                </div>
              ) : null}
              <div className={dangCardMetaClass}>
                {item.birthDate ? (
                  <span className={dangCardDateClass}>
                    تولد: {formatIsoDatePersian(item.birthDate)}
                  </span>
                ) : null}
                {accountCount > 0 ? (
                  <span>
                    {item.birthDate ? ' · ' : ''}
                    {accountCount.toLocaleString('fa-IR')} حساب
                  </span>
                ) : null}
              </div>
            </div>
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
