import { useEffect, useSyncExternalStore, type ReactNode } from 'react'

import ChildViewBanner, { activeChildName } from './ChildViewBanner'
import {
  childNoAccessMessage,
  isChildAccessLost,
  probeChildAccess,
  subscribeChildAccessLost
} from '../../services/childAccessLost'
import { getSettings } from '../../services/settings'
import { useReturnToPersonal } from '../buildings/useReturnToPersonal'
import EmptyState from '../EmptyState'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { sharedPageClass } from '../ui/sharedStyles'

/**
 * The frame of every child page: the read-only banner and, when Google no longer lets this device
 * open the file (the child removed the share), the explanation with the way back instead of the
 * stale numbers. One cheap metadata read per page opening finds that out.
 */
export default function ChildPageFrame({ children }: { children: ReactNode }) {
  const id = getSettings()?.spreadsheetId ?? ''
  const lost = useSyncExternalStore(subscribeChildAccessLost, () => isChildAccessLost(id))
  const { returnToPersonal, modalProps } = useReturnToPersonal()

  useEffect(() => {
    if (id) void probeChildAccess(id)
  }, [id])

  return (
    <div className={sharedPageClass}>
      <ChildViewBanner />
      {lost ? (
        <EmptyState
          icon="lock"
          message={childNoAccessMessage(activeChildName())}
          description="برای دیدن دوباره، از فرزندتان بخواهید حساب را دوباره با شما به اشتراک بگذارد."
          action={{ label: 'بازگشت به حساب خودم', onClick: returnToPersonal }}
        />
      ) : (
        children
      )}
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
