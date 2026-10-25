import { lazy, Suspense, useEffect, useState } from 'react'

import SharedOffSheet, { type SharedOffChoice } from './SharedOffSheet'
import SharedSpaceCard from './SharedSpaceCard'
import { useEnterWorkspace } from '../../hooks/useEnterWorkspace'
import { useDataRevision } from '../../services/dataRevision'
import { shareErrorMessage } from '../../services/driveShare'
import type { WorkspaceMember } from '../../services/memberRegistry'
import {
  hideSharedAccount,
  knownSharedMembers,
  loadSharedMembers,
  revokeAllSharedAccess,
  registeredSharedAccount,
  showSharedAccount,
  visibleSharedAccount
} from '../../services/sharedAccountSwitch'
import { showError, showSuccess } from '../../utils/toast'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'

const SharedConnectSheet = lazy(() => import('./SharedConnectSheet'))

/**
 * «حساب مشترک» below the building cards of «فضاهای من»: the card, its «باز کردن», the off sheet
 * and «اتصال به حساب مشترک» (lazy). `onStart` opens the setup wizard.
 */
export default function SharedSpaceSection({ onStart }: { onStart: () => void }) {
  const revision = useDataRevision()

  const { enter, entering, modalProps } = useEnterWorkspace()
  const [, setTick] = useState(0)
  const [offOpen, setOffOpen] = useState(false)
  const [turningOff, setTurningOff] = useState(false)
  const [connect, setConnect] = useState<'open' | 'closed' | null>(null)

  const refresh = () => setTick(value => value + 1)

  const account = visibleSharedAccount()

  const registered = registeredSharedAccount()

  const accountId = account?.id ?? ''

  const [members, setMembers] = useState<WorkspaceMember[] | null>(() =>
    accountId ? knownSharedMembers(accountId) : null
  )

  useEffect(() => {
    if (!accountId) return

    let cancelled = false

    setMembers(knownSharedMembers(accountId))
    // Offline: the card stays without avatars and role, «باز کردن» still works.
    void loadSharedMembers(accountId)
      .then(list => !cancelled && setMembers(list))
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [accountId, revision])

  const turnOff = async (choice: SharedOffChoice) => {
    if (!account) return
    setTurningOff(true)
    try {
      if (choice === 'revoke') {
        await revokeAllSharedAccess(account.id)
        showSuccess('دسترسی همه قطع شد و حساب مشترک خاموش شد')
      } else {
        hideSharedAccount(account.id)
        showSuccess('حساب مشترک از منوی شما پنهان شد')
      }
      setOffOpen(false)
      refresh()
    } catch (err) {
      showError(shareErrorMessage(err, 'خاموش کردن حساب مشترک ناموفق بود', 'حساب مشترک'))
    } finally {
      setTurningOff(false)
    }
  }

  return (
    <>
      <SharedSpaceCard
        account={account}
        members={members}
        hidden={!account && registered !== null}
        opening={account !== null && entering === account.id}
        onStart={onStart}
        onConnect={() => setConnect('open')}
        onOpen={() => account && void enter(account.id, 'shared-home')}
        onOff={() => setOffOpen(true)}
        onShowAgain={() => {
          if (registered) showSharedAccount(registered.id)
          refresh()
        }}
      />
      <SharedOffSheet
        open={offOpen}
        saving={turningOff}
        onClose={() => setOffOpen(false)}
        onConfirm={turnOff}
      />
      {/* Loaded on the first tap, then kept mounted so the sheet closes with its animation. */}
      {connect ? (
        <Suspense fallback={null}>
          <SharedConnectSheet
            open={connect === 'open'}
            onClose={() => setConnect('closed')}
            onConnected={id => {
              refresh()
              void enter(id, 'shared-home')
            }}
          />
        </Suspense>
      ) : null}
      <SheetSwitchConfirmModal {...modalProps} />
    </>
  )
}
