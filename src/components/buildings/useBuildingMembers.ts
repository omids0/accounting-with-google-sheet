import { useCallback, useState } from 'react'

import type { BuildingRole } from './buildingOptions'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { getUserEmail } from '../../services/auth'
import { invitedEmails } from '../../services/buildingInvites'
import {
  changeMemberRole,
  MEMBER_BLOCK_MESSAGES,
  removeMember,
  setMemberOverrides,
  withOverride,
  type MemberBlock
} from '../../services/buildingMembers'
import { members, type BuildingMember, type BuildingPermission } from '../../services/buildingRoles'
import { getSettings } from '../../services/settings'
import { PERIOD_SETTINGS_SHEET } from '../../services/sheetNames'
import { getSheetDataRows } from '../../services/spreadsheetStore'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

/**
 * Members of the open building for «اعضا و دسترسی‌ها»: the list (with who is still only
 * invited and who you are) and the writers, each reporting a refused change as a toast. The
 * period tab does not announce its own writes, so `version` re-reads it after every change.
 */
export function useBuildingMembers() {
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  useDataRefresh()
  const [, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => setVersion(value => value + 1), [])

  const me = (getUserEmail() ?? '').toLowerCase()

  // Read on every render: `revision` (a sync) and `version` (our own write) re-render the page.
  const list: BuildingMember[] = members(spreadsheetId)

  const invited = new Set(
    invitedEmails(getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? [])
  )

  const run = async (task: () => Promise<MemberBlock | null>, done: string) => {
    setBusy(true)
    try {
      const block = await task()

      if (block) showError(MEMBER_BLOCK_MESSAGES[block])
      else showSuccess(done)
    } catch (err) {
      showError(toUserMessage(err, 'ذخیره نشد'))
    } finally {
      setBusy(false)
      reload()
    }
  }

  return {
    spreadsheetId,
    list,
    me,
    busy,
    reload,
    isInvited: (email: string) => invited.has(email) && email !== me,
    setRole: (email: string, role: BuildingRole) =>
      run(() => changeMemberRole(spreadsheetId, email, role), 'نقش عوض شد'),
    togglePermission: (member: BuildingMember, permission: BuildingPermission, value: boolean) =>
      run(
        () =>
          setMemberOverrides(spreadsheetId, member.email, withOverride(member, permission, value)),
        'دسترسی ذخیره شد'
      ),
    resetPermissions: (email: string) =>
      run(() => setMemberOverrides(spreadsheetId, email, {}), 'به پیش‌فرض نقش برگشت'),
    remove: (email: string) => run(() => removeMember(spreadsheetId, email), 'دسترسی قطع شد')
  }
}
