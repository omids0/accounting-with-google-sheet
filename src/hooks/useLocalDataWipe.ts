import { useCallback, useState } from 'react'

import { getUserEmail } from '../services/auth'
import { clearAllLocalData, getPendingSyncCount } from '../services/localDataWipe'
import { requestLogout } from '../stores/appStore'
import { sameEmail } from '../utils/email'
import { formatPersianNumber } from '../utils/formatMoney'

/** Props spread onto ConfirmActionModal. */
export interface WipeConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  confirming: boolean
  onClose: () => void
  onConfirm: () => void
}

export function unsyncedLossWarning(count: number): string {
  const changes = formatPersianNumber(count)

  return `هشدار: ${changes} تغییر هنوز در گوگل شیت ذخیره نشده و با این کار برای همیشه از بین می‌رود. برای حفظ آن‌ها ابتدا اتصال اینترنت را بررسی کنید و صبر کنید همگام‌سازی کامل شود.`
}

/**
 * Sign-out from settings: confirms (with an explicit data-loss warning when
 * writes are still queued), wipes this device's copy of the account, then
 * reloads so no in-memory state from the old account survives.
 */
export function useLogoutFlow() {
  const [open, setOpen] = useState(false)

  const [pendingCount, setPendingCount] = useState(0)

  const [confirming, setConfirming] = useState(false)

  const startLogout = useCallback(() => {
    setPendingCount(getPendingSyncCount())
    setOpen(true)
  }, [])

  const onConfirm = useCallback(async () => {
    setConfirming(true)
    try {
      await clearAllLocalData()
    } finally {
      requestLogout()
      window.location.reload()
    }
  }, [])

  const modalProps: WipeConfirmModalProps = {
    open,
    title: 'خروج از حساب',
    message: pendingCount
      ? unsyncedLossWarning(pendingCount)
      : 'با خروج، اطلاعات این حساب از این دستگاه پاک می‌شود؛ داده‌های گوگل شیت دست نمی‌خورد. ادامه می‌دهید؟',
    confirmLabel: pendingCount ? 'خروج و حذف تغییرات' : 'خروج',
    cancelLabel: 'انصراف',
    confirming,
    onClose: () => {
      if (!confirming) setOpen(false)
    },
    onConfirm: () => void onConfirm()
  }

  return { startLogout, modalProps }
}

type SwitchOutcome = 'same' | 'switched' | 'cancelled'

interface PendingSwitch {
  count: number
  resolve: (confirmed: boolean) => void
}

/**
 * Signing in with a different Google account than the stored (expired)
 * session must not inherit the previous account's local data. Call
 * `guardAccountSwitch` before saving the new session.
 */
export function useAccountSwitchGuard() {
  const [pending, setPending] = useState<PendingSwitch | null>(null)

  const guardAccountSwitch = useCallback(async (nextEmail: string): Promise<SwitchOutcome> => {
    const previousEmail = getUserEmail()

    if (!previousEmail || sameEmail(previousEmail, nextEmail)) return 'same'

    const count = getPendingSyncCount()

    if (count > 0) {
      const confirmed = await new Promise<boolean>(resolve => setPending({ count, resolve }))

      setPending(null)
      if (!confirmed) return 'cancelled'
    }

    await clearAllLocalData({ revokeAccess: false })

    return 'switched'
  }, [])

  const modalProps: WipeConfirmModalProps = {
    open: !!pending,
    title: 'ورود با حساب دیگر',
    message: unsyncedLossWarning(pending?.count ?? 0),
    confirmLabel: 'ادامه با حساب جدید',
    cancelLabel: 'انصراف',
    confirming: false,
    onClose: () => pending?.resolve(false),
    onConfirm: () => pending?.resolve(true)
  }

  return { guardAccountSwitch, modalProps }
}
