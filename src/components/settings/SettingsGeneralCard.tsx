import type { CurrencyUnit } from '../../types'
import { CURRENCY_OPTIONS } from '../../utils/formatMoney'
import { FormSelect } from '../form'
import Card, { CardTitle } from '../ui/Card'

type SettingsGeneralCardProps = {
  currency: CurrencyUnit
  onCurrencyChange: (value: CurrencyUnit) => void
}

export default function SettingsGeneralCard({
  currency,
  onCurrencyChange
}: SettingsGeneralCardProps) {
  return (
    <Card>
      <CardTitle>تنظیمات عمومی</CardTitle>
      <FormSelect
        label="واحد پول"
        value={currency}
        onChange={next => onCurrencyChange(next as CurrencyUnit)}
        controlWidth="compact"
        compact
        options={CURRENCY_OPTIONS.map(option => ({
          value: option.value,
          label: option.label
        }))}
        hint={
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.5rem'
            }}
          >
            واحد پول در تمام نمایش مبالغ (داشبورد، رکوردها و ...) اعمال می‌شود
          </p>
        }
      />
    </Card>
  )
}
