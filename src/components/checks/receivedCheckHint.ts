import { getItem, setItem } from '../../services/storage'
import { showInfo } from '../../utils/toast'

const HINT_KEY = 'accounting_received_check_hint_v1'

/**
 * The first time «دریافتی» is picked: an older app build on another device reads a received
 * check as a payable, so the other devices should be updated too.
 */
export function showReceivedCheckHintOnce(): void {
  if (getItem<boolean>(HINT_KEY)) return

  setItem(HINT_KEY, true)
  showInfo(
    'روی دستگاه‌های دیگر هم اپ را به‌روز کن؛ نسخه‌های قدیمی چک دریافتی را پرداختی می‌بینند',
    8000
  )
}
