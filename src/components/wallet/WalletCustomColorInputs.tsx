import { FormField, FormRow } from '../form'
import { walletColorInputClass } from './walletCardStyles'

type WalletCustomColorInputsProps = {
  primary: string
  secondary: string
  onPrimaryChange: (value: string) => void
  onSecondaryChange: (value: string) => void
  disabled?: boolean
}

export default function WalletCustomColorInputs({
  primary,
  secondary,
  onPrimaryChange,
  onSecondaryChange,
  disabled
}: WalletCustomColorInputsProps) {
  return (
    <FormRow>
      <FormField label="رنگ اصلی" hint="گرادیان کارت از این رنگ شروع می‌شود">
        <input
          type="color"
          className={walletColorInputClass}
          value={primary}
          disabled={disabled}
          aria-label="رنگ اصلی کارت"
          onChange={event => onPrimaryChange(event.target.value)}
        />
      </FormField>

      <FormField label="رنگ ثانویه" hint="گرادیان کارت به این رنگ ختم می‌شود">
        <input
          type="color"
          className={walletColorInputClass}
          value={secondary}
          disabled={disabled}
          aria-label="رنگ ثانویه کارت"
          onChange={event => onSecondaryChange(event.target.value)}
        />
      </FormField>
    </FormRow>
  )
}
