import ToggleChipGroup from '../ToggleChipGroup'
import { smsHintClass } from '../ui/bankSmsStyles'

/** An SMS whose card digits fit several accounts: the chips to pick one, with what to do next. */
export default function BankSmsAccountPick({
  options,
  accountId,
  onPick
}: {
  options: { id: string; label: string }[]
  /** '' = not picked yet. */
  accountId: string
  onPick: (accountId: string) => void
}) {
  return (
    <>
      <ToggleChipGroup
        ariaLabel="حساب این پیامک"
        options={options}
        selected={{ [accountId]: true }}
        onToggle={onPick}
      />
      <p className={smsHintClass}>
        {accountId
          ? 'حساب این پیامک را خودتان انتخاب کردید؛ اگر درست نیست عوضش کنید.'
          : 'رقم کارت این پیامک به چند حساب می‌خورد؛ اول حساب را انتخاب کنید.'}
      </p>
    </>
  )
}
