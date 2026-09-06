import { formatLocationLabel, getCounterpartyFullName } from '../../services/counterparties'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
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
  dangCardTitleClass
} from '../ui/featureCardStyles'

type CounterpartyCardProps = {
  item: CounterpartyWithRow
  onEdit: (item: CounterpartyWithRow) => void
  onDelete: (item: CounterpartyWithRow) => void
}

export default function CounterpartyCard({ item, onEdit, onDelete }: CounterpartyCardProps) {
  const fullName = getCounterpartyFullName(item)
  const accountCount = item.accounts.length
  const phoneLabel = item.phones.map(phone => phone.number).join(' · ')
  const locationLabel = formatLocationLabel(item.location)

  return (
    <div className={dangCardClass({})}>
      <div className={cardHeaderWithEditClass}>
        <div className={dangCardContentRowClass}>
          <div className={dangCardBodyClass}>
            <div className={dangCardHeaderClass}>
              <span className={dangCardTitleClass}>{fullName || '—'}</span>
            </div>
            {phoneLabel ? (
              <div className={dangCardMetaClass} dir="ltr">
                {phoneLabel}
              </div>
            ) : null}
            {item.address ? <div className={dangCardMetaClass}>{item.address}</div> : null}
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
        <div className={cardActionButtonsClass}>
          <CardEditButton onClick={() => onEdit(item)} />
          <CardDeleteButton onClick={() => onDelete(item)} />
        </div>
      </div>
    </div>
  )
}
