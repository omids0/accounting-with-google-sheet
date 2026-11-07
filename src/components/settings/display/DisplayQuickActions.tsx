import DisplaySlotPicker from './DisplaySlotPicker'
import { useQuickActionsStore } from '../../../stores/quickActionsStore'
import { QUICK_ACTIONS } from '../../dashboard/quickActionCatalog'

/** Settings › «نمایش»: which four shortcuts the phone dashboard shows, in order. */
export default function DisplayQuickActions() {
  return (
    <DisplaySlotPicker
      title="میان‌برهای داشبورد"
      hint="فقط در گوشی: چهار دکمهٔ زیر کارت اصلی داشبورد؛ اگر میان‌بری را دوباره انتخاب کنی، جایش با دیگری عوض می‌شود"
      slotLabel="میان‌بر"
      resetLabel="بازگشت میان‌برها به پیش‌فرض"
      options={QUICK_ACTIONS}
      store={useQuickActionsStore()}
    />
  )
}
