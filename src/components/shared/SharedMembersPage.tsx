import { useState, type ReactNode } from 'react'

import { memberRoleLabel } from './memberCopy'
import { getUserEmail } from '../../services/auth'
import { roleOf } from '../../services/buildingRoles'
import { useDataRevision } from '../../services/dataRevision'
import { registryOf, type SharedRole } from '../../services/memberRegistry'
import { getSettings } from '../../services/settings'
import BuildingMembersPage from '../buildings/BuildingMembersPage'
import ConfirmActionModal from '../ConfirmActionModal'
import {
  buildingDayBadgeClass,
  journeyRowMetaClass,
  journeyRowTitleClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface SharedMembersPageProps {
  /** The data-safety card (monthly backup in the partner's Drive); filled in by the backup step. */
  safety?: ReactNode
  /** «ترک این فضا» confirmed by a partner or viewer; the leave flow itself lives outside. */
  onLeave?: () => void | Promise<void>
}

/**
 * «اعضا» of the shared account: the signed-in user's own role, the member list (the building's
 * `MemberCard` with the shared registry), «+ دعوت» for whoever holds `members`, the data-safety
 * card slot and «ترک این فضا» for everyone but the owner. A thin wrapper: the list, the invite
 * sheet and the guards are the building's, read through `kind="shared"`.
 */
export default function SharedMembersPage({ safety, onLeave }: SharedMembersPageProps) {
  useDataRevision()

  const [leaving, setLeaving] = useState(false)

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const email = getUserEmail() ?? ''

  const role = roleOf<SharedRole>(email, spreadsheetId)

  const hint = registryOf('shared').roles.find(item => item.value === role)?.hint

  const ownRole = (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className={buildingDayBadgeClass} aria-hidden="true">
          {email[0]?.toUpperCase() ?? '؟'}
        </span>
        <span className="min-w-0 flex-1">
          <span className={journeyRowTitleClass}>{`نقش شما: ${memberRoleLabel(
            'shared',
            role
          )}`}</span>
          <br />
          <span className={journeyRowMetaClass}>{hint}</span>
        </span>
      </div>
    </Card>
  )

  const footer = (
    <>
      {safety}
      {role === registryOf('shared').ownerRole ? null : (
        <Button
          type="button"
          variant="danger"
          className="min-h-11"
          onClick={() => setLeaving(true)}
        >
          ترک این فضا
        </Button>
      )}
      <ConfirmActionModal
        open={leaving}
        title="ترک این فضا"
        message="دسترسی شما به فایل حساب مشترک در درایو برداشته می‌شود. حساب شخصی شما دست‌نخورده می‌ماند و ثبت‌های شما برای بقیه می‌ماند."
        confirmLabel="ترک فضا"
        cancelLabel="انصراف"
        onClose={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false)
          void onLeave?.()
        }}
      />
    </>
  )

  return <BuildingMembersPage kind="shared" header={ownRole} footer={footer} />
}
