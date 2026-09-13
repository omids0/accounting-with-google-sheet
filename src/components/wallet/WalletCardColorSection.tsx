import BankCardColorPicker from './BankCardColorPicker'
import {
  getBankCardColorOptions,
  getDefaultBankCardColor,
  hasBankColorPalette
} from './bankCardColorVariants'
import { getBankById, CASH_CARD_THEME, GENERIC_CARD_THEME } from './banks'
import {
  CUSTOM_CARD_COLOR_ID,
  getCustomCardColorOption,
  getCustomColorDefaults,
  isCustomCardColor,
  normalizeHexColor
} from './customCardTheme'
import { bluColorPickerLabelClass } from './walletCardStyles'
import WalletCustomColorInputs from './WalletCustomColorInputs'
import type { WalletAccountKind } from '../../types'

const DEFAULT_CARD_COLOR_ID = ''

type WalletCardColorSectionProps = {
  accountKind: WalletAccountKind
  bankId: string
  cardColor: string
  cardColorPrimary: string
  cardColorSecondary: string
  onCardColorChange: (value: string) => void
  onPrimaryChange: (value: string) => void
  onSecondaryChange: (value: string) => void
  disabled?: boolean
}

function resolveBaseThemeForPicker(accountKind: WalletAccountKind, bankId: string) {
  if (accountKind === 'bank') {
    const bank = getBankById(bankId)

    if (bank) return bank
  }

  if (accountKind === 'cash') return CASH_CARD_THEME

  return GENERIC_CARD_THEME
}

function buildPickerOptions(accountKind: WalletAccountKind, bankId: string) {
  const customOption = getCustomCardColorOption()
  const presetOptions =
    accountKind === 'bank' && hasBankColorPalette(bankId) ? getBankCardColorOptions(bankId) : []

  if (presetOptions.length > 0) {
    return [...presetOptions, customOption]
  }

  const base = resolveBaseThemeForPicker(accountKind, bankId)

  return [
    {
      id: DEFAULT_CARD_COLOR_ID,
      label: 'پیش‌فرض',
      hex: base.swatch
    },
    customOption
  ]
}

export default function WalletCardColorSection({
  accountKind,
  bankId,
  cardColor,
  cardColorPrimary,
  cardColorSecondary,
  onCardColorChange,
  onPrimaryChange,
  onSecondaryChange,
  disabled
}: WalletCardColorSectionProps) {
  const options = buildPickerOptions(accountKind, bankId)
  const pickerValue =
    accountKind === 'bank' && hasBankColorPalette(bankId)
      ? cardColor || getDefaultBankCardColor(bankId)
      : isCustomCardColor(cardColor)
      ? CUSTOM_CARD_COLOR_ID
      : DEFAULT_CARD_COLOR_ID

  const handleCardColorChange = (value: string) => {
    onCardColorChange(value)

    if (value === CUSTOM_CARD_COLOR_ID) {
      const base = resolveBaseThemeForPicker(accountKind, bankId)
      const defaults = getCustomColorDefaults(base)

      if (!normalizeHexColor(cardColorPrimary)) {
        onPrimaryChange(defaults.primary)
      }

      if (!normalizeHexColor(cardColorSecondary)) {
        onSecondaryChange(defaults.secondary)
      }
    }
  }

  const handlePrimaryChange = (value: string) => {
    onCardColorChange(CUSTOM_CARD_COLOR_ID)
    onPrimaryChange(value)
  }

  const handleSecondaryChange = (value: string) => {
    onCardColorChange(CUSTOM_CARD_COLOR_ID)
    onSecondaryChange(value)
  }

  const showCustomInputs = isCustomCardColor(cardColor)

  return (
    <div>
      <p className={bluColorPickerLabelClass}>رنگ کارت</p>
      <BankCardColorPicker
        options={options}
        value={pickerValue}
        onChange={handleCardColorChange}
        disabled={disabled}
        ariaLabel="انتخاب رنگ کارت"
      />

      {showCustomInputs && (
        <div className="mt-[0.75rem]">
          <WalletCustomColorInputs
            primary={cardColorPrimary}
            secondary={cardColorSecondary}
            onPrimaryChange={handlePrimaryChange}
            onSecondaryChange={handleSecondaryChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
