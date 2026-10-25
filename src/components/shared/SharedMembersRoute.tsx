import SharedMembersPage from './SharedMembersPage'
import SharedSafetyCard from './SharedSafetyCard'
import { sharedBalanceWarning } from './sharedViewModel'
import { useSharedRecords } from './useSharedRecords'
import { useSharing } from '../../hooks/useSharing'
import { getPathForTab } from '../../routes/paths'
import { members } from '../../services/buildingRoles'
import { shareErrorMessage } from '../../services/driveShare'
import type { WorkspaceMember } from '../../services/memberRegistry'
import { getSettings } from '../../services/settings'
import { sharedCan } from '../../services/sharedCan'
import { LEAVE_FALLBACK_MESSAGE, leaveSharedAccount } from '../../services/sharedLeave'
import { showError, showInfo, showSuccess } from '../../utils/toast'
import { useReturnToPersonal } from '../buildings/useReturnToPersonal'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'

/**
 * The «اعضا» route of the shared account: the members page with the open balance said first in
 * the leave and removal sheets, the data-safety card, and «ترک این فضا» → «فضاهای من».
 */
export default function SharedMembersRoute() {
  const shared = useSharedRecords()
  const { info } = useSharing()
  const { returnToPersonal, modalProps } = useReturnToPersonal(
    undefined,
    getPathForTab('buildings-home')
  )

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const owner = members<WorkspaceMember>(spreadsheetId).find(item => item.role === 'owner')?.email

  const warning = shared.balance
    ? sharedBalanceWarning(shared.balance.net, shared.me, shared.names)
    : null

  const leave = async () => {
    try {
      const result = await leaveSharedAccount(spreadsheetId)

      if (result === 'fallback') showInfo(LEAVE_FALLBACK_MESSAGE, 10_000)
      else showSuccess('از حساب مشترک بیرون آمدید')
      returnToPersonal()
    } catch (err) {
      showError(shareErrorMessage(err, 'ترک حساب مشترک ناموفق بود', 'حساب مشترک'))
    }
  }

  return (
    <>
      <SharedMembersPage
        leaveWarning={warning}
        removeWarning={email => (shared.pair?.includes(email) ? warning : null)}
        onLeave={leave}
        safety={
          <SharedSafetyCard
            spreadsheetId={spreadsheetId}
            owner={owner ? shared.nameOf(owner) : 'مالک'}
            canExport={sharedCan('export')}
            editors={
              shared.role === 'owner'
                ? info?.editors.filter(e => e.email !== shared.me).map(e => e.name || e.email)
                : undefined
            }
          />
        }
      />
      <SheetSwitchConfirmModal {...modalProps} />
    </>
  )
}
