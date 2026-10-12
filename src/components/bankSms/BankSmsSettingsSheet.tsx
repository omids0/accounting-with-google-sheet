import BankSmsRangeBar from './BankSmsRangeBar'
import BankSmsSettingsCard from './BankSmsSettingsCard'
import SmsTemplatesSection from './SmsTemplatesSection'
import PickerSheet from '../form/PickerSheet'
import type { WalletAccountWithRow } from '../wallet/types'

type BankSmsSettingsSheetProps = {
  open: boolean
  enabled: boolean
  days: number
  accounts: WalletAccountWithRow[]
  onDaysChange: (days: number) => void
  onEnabledChange: () => void
  onClose: () => void
}

const NO_DRAFTS: never[] = []

/** ⚙ of the bank SMS page: on/off and help, the range, and every saved template. */
export default function BankSmsSettingsSheet({
  open,
  enabled,
  days,
  accounts,
  onDaysChange,
  onEnabledChange,
  onClose
}: BankSmsSettingsSheetProps) {
  return (
    <PickerSheet open={open} title="تنظیمات پیامک بانکی" onClose={onClose}>
      <BankSmsSettingsCard onChanged={onEnabledChange} />
      {enabled && <BankSmsRangeBar days={days} onChange={onDaysChange} />}
      {enabled && (
        <SmsTemplatesSection
          accountId={null}
          drafts={NO_DRAFTS}
          onDraftsChange={() => undefined}
          overview={Object.fromEntries(accounts.map(account => [account.id, account.title]))}
        />
      )}
    </PickerSheet>
  )
}
