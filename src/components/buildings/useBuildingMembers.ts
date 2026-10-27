import { useCallback, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { getUserEmail } from '../../services/auth'
import { resendInvite } from '../../services/buildingMemberDrive'
import {
  changeMemberRole,
  markMemberActive,
  memberBlockMessages,
  memberStatusReader,
  removeMember,
  setMemberOverrides,
  withOverride,
  type MemberBlock
} from '../../services/buildingMembers'
import { can, members } from '../../services/buildingRoles'
import { shareErrorMessage } from '../../services/driveShare'
import {
  registryOf,
  type MemberKind,
  type MemberRole,
  type WorkspaceMember
} from '../../services/memberRegistry'
import { getSettings } from '../../services/settings'
import { showError, showSuccess } from '../../utils/toast'

/**
 * Members of the open building or shared account for «اعضا و دسترسی‌ها»: the list (with who is
 * still only invited — see `memberStatus` — and who you are) and the writers, each reporting a
 * refused change as a toast in the words of the kind. The period tab does not announce its own
 * writes, so `version` re-reads it after every change. `kind` defaults to the building.
 */
export function useBuildingMembers(memberKind: MemberKind = 'building') {
  const registry = registryOf(memberKind)

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  useDataRefresh()
  const [, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => setVersion(value => value + 1), [])

  const me = (getUserEmail() ?? '').toLowerCase()

  // Read on every render: `revision` (a sync) and `version` (our own write) re-render the page.
  const list = members<WorkspaceMember>(spreadsheetId)

  const statusOf = memberStatusReader(spreadsheetId, me)

  const run = async (task: () => Promise<MemberBlock | null>, done: string) => {
    setBusy(true)
    try {
      const block = await task()

      if (block) showError(memberBlockMessages(memberKind)[block])
      else showSuccess(done)
    } catch (err) {
      showError(shareErrorMessage(err, 'ذخیره نشد', registry.fileNoun))
    } finally {
      setBusy(false)
      reload()
    }
  }

  return {
    kind: memberKind,
    spreadsheetId,
    list,
    me,
    busy,
    reload,
    statusOf,
    /** Whether the signed-in user manages the members (the kind's member permission). */
    canManage: can(registry.settingsPermission, spreadsheetId),
    setRole: (email: string, role: MemberRole) =>
      run(() => changeMemberRole(spreadsheetId, email, role), 'نقش عوض شد'),
    togglePermission: (member: WorkspaceMember, permission: string, value: boolean) =>
      run(
        () =>
          setMemberOverrides(
            spreadsheetId,
            member.email,
            withOverride(member, permission, value, memberKind)
          ),
        'دسترسی ذخیره شد'
      ),
    resetPermissions: (email: string) =>
      run(() => setMemberOverrides(spreadsheetId, email, {}), 'به پیش‌فرض نقش برگشت'),
    markActive: (email: string) => run(() => markMemberActive(spreadsheetId, email), 'عضو فعال شد'),
    resend: (email: string, name: string) =>
      run(() => resendInvite(spreadsheetId, email, name), 'دعوت دوباره فرستاده شد'),
    remove: (email: string) => run(() => removeMember(spreadsheetId, email), 'دسترسی قطع شد')
  }
}
