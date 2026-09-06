import { createPortal } from 'react-dom'

import {
  counterpartyDetailAccountBankClass,
  counterpartyDetailAccountClass,
  counterpartyDetailAccountNumberClass,
  counterpartyDetailCoordsClass,
  counterpartyDetailFieldClass,
  counterpartyDetailLabelClass,
  counterpartyDetailListClass,
  counterpartyDetailLocationRowClass,
  counterpartyDetailValueClass
} from './counterpartyDetailStyles'
import PhoneNumberLinks from './PhoneNumberLinks'
import type { CounterpartyWithRow } from './types'
import { useModalLock } from '../../hooks/useModalLock'
import { formatLocationLabel, getCounterpartyFullName } from '../../services/counterparties'
import { cn } from '../../utils/cn'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { openMapDirections } from '../../utils/mapNavigation'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import { formActionsClassName } from '../ui/formStyles'
import {
  formModalActionsClass,
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from '../ui/modalStyles'

type CounterpartyDetailModalProps = {
  open: boolean
  item: CounterpartyWithRow | null
  onClose: () => void
  onEdit: (item: CounterpartyWithRow) => void
}

type DetailFieldProps = {
  label: string
  children: React.ReactNode
}

function DetailField({ label, children }: DetailFieldProps) {
  if (children === null || children === undefined || children === false) return null

  return (
    <div className={counterpartyDetailFieldClass}>
      <div className={counterpartyDetailLabelClass}>{label}</div>
      <div className={counterpartyDetailValueClass}>{children}</div>
    </div>
  )
}

export default function CounterpartyDetailModal({
  open,
  item,
  onClose,
  onEdit
}: CounterpartyDetailModalProps) {
  const { panelRef } = useModalLock({ open, onClose })

  if (!open || !item) return null

  const fullName = getCounterpartyFullName(item)
  const locationLabel = formatLocationLabel(item.location)

  return createPortal(
    <div
      className={cn(formModalRootClass, 'counterparty-detail-modal')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="counterparty-detail-title"
    >
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={onClose}
        aria-label="بستن"
      />

      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 id="counterparty-detail-title" className={formModalTitleClass}>
            {fullName || 'جزئیات طرف حساب'}
          </h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className={formModalBodyClass}>
          <DetailField label="نام">{item.firstName || '—'}</DetailField>
          <DetailField label="نام خانوادگی">{item.lastName || '—'}</DetailField>
          <DetailField label="تاریخ تولد">
            {item.birthDate ? formatIsoDatePersian(item.birthDate) : null}
          </DetailField>
          <DetailField label="شماره تماس">
            {item.phones.length > 0 ? <PhoneNumberLinks phones={item.phones} /> : null}
          </DetailField>
          <DetailField label="آدرس">{item.address || null}</DetailField>
          <DetailField label="موقعیت">
            {locationLabel ? (
              <div className={counterpartyDetailLocationRowClass}>
                <span className={counterpartyDetailCoordsClass} dir="ltr">
                  {locationLabel}
                </span>
                {item.location ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openMapDirections(item.location!)}
                  >
                    مسیر‌یابی
                  </Button>
                ) : null}
              </div>
            ) : null}
          </DetailField>
          <DetailField label="حساب‌های بانکی">
            {item.accounts.length > 0 ? (
              <div className={counterpartyDetailListClass}>
                {item.accounts.map((account, index) => (
                  <div
                    key={`${account.bankName}-${account.accountNumber}-${index}`}
                    className={counterpartyDetailAccountClass}
                  >
                    <div className={counterpartyDetailAccountBankClass}>
                      {account.bankName || '—'}
                    </div>
                    {account.accountNumber ? (
                      <div className={counterpartyDetailAccountNumberClass} dir="ltr">
                        {account.accountNumber}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </DetailField>
          <DetailField label="توضیحات">{item.note || null}</DetailField>
          <DetailField label="تاریخ ثبت">
            {item.createdAt ? formatIsoDatePersian(item.createdAt) : null}
          </DetailField>
        </div>

        <div className={cn(formModalActionsClass, formActionsClassName())}>
          <Button type="button" variant="primary" onClick={() => onEdit(item)}>
            ویرایش
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
