import { THEME_OPTIONS } from './types'
import type { CurrencyUnit, ThemeMode } from '../../types'
import { CURRENCY_OPTIONS } from '../../utils/formatMoney'
import { FormSelect } from '../form'

type SettingsGeneralCardProps = {
  theme: ThemeMode
  currency: CurrencyUnit
  onThemeChange: (value: ThemeMode) => void
  onCurrencyChange: (value: CurrencyUnit) => void
}

export default function SettingsGeneralCard({
  theme,
  currency,
  onThemeChange,
  onCurrencyChange
}: SettingsGeneralCardProps) {
  return (
    <div className="card">
      <h2 className="card-title">تنظیمات عمومی</h2>
      <FormSelect
        label="حالت نمایش"
        value={theme}
        onChange={next => onThemeChange(next as ThemeMode)}
        options={THEME_OPTIONS.map(option => ({
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
            انتخاب بین لایت مود و نایت مود برای تمام صفحات اپ
          </p>
        }
      />
      <div style={{ marginTop: '1rem' }}>
        <FormSelect
          label="واحد پول"
          value={currency}
          onChange={next => onCurrencyChange(next as CurrencyUnit)}
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
      </div>
    </div>
  )
}
