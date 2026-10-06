import { getCounterpartyFullName } from '../../services/counterparties'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { openMapDirections } from '../../utils/mapNavigation'
import AppIcon from '../AppIcon'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import PhoneNumberLinks from './PhoneNumberLinks'
import type { CounterpartyWithRow } from './types'
import Button from '../ui/Button'
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
  const location = item.location

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
            {location ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1.5"
                onClick={() => openMapDirections(location)}
              >
                <AppIcon name="map-pin" size={14} strokeWidth={2} />
                نمایش روی نقشه
              </Button>
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
