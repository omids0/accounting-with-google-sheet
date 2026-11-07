import DisplaySlotPicker from './DisplaySlotPicker'
import { useBottomNavStore } from '../../../stores/bottomNavStore'
import { BOTTOM_NAV_ACTIONS } from '../../dashboard/quickActionCatalog'

/** Settings › «نمایش»: the six pages of the phone bottom bar; «داشبورد» stays in the middle. */
export default function DisplayBottomNav() {
  return (
    <DisplaySlotPicker
      title="نوار پایین گوشی"
      hint="فقط در گوشی: شش صفحه کنار دکمهٔ «داشبورد»؛ سه‌تای اول سمت راست و سه‌تای بعدی سمت چپ. دکمهٔ «داشبورد» همیشه وسط می‌ماند"
      slotLabel="جایگاه"
      resetLabel="بازگشت نوار پایین به پیش‌فرض"
      options={BOTTOM_NAV_ACTIONS}
      store={useBottomNavStore()}
    />
  )
}
