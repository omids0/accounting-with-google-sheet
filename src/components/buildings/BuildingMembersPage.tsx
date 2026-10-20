import { useState } from 'react'

import InviteMembersSheet from './InviteMembersSheet'
import MemberCard from './MemberCard'
import { useBuildingMembers } from './useBuildingMembers'
import { getBuildingProfile } from '../../services/buildingProfile'
import { getSettings } from '../../services/settings'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import ConfirmActionModal from '../ConfirmActionModal'
import EmptyState from '../EmptyState'
import { journeyNoteClass, journeyPageClass } from '../ui/buildingStyles'
import Button from '../ui/Button'

/**
 * «اعضا و دسترسی‌ها» (screen 29): the manager sets each member's role and, when one person needs
 * more or less than the role gives, their permissions one by one. The app enforces this in its
 * interface; the real access is the Drive share. The page itself needs the `settings` permission.
 */
export default function BuildingMembersPage() {
  const page = useBuildingMembers()
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const buildingName =
    getBuildingProfile(page.spreadsheetId)?.name ??
    getSpreadsheetLabel(
      getSettings()?.spreadsheets?.find(entry => entry.id === page.spreadsheetId)?.name ?? ''
    )

  const managers = page.list.filter(member => member.role === 'manager').length

  return (
    <div className={journeyPageClass}>
      <p className={journeyNoteClass}>
        مدیر نقش هر عضو را تعیین می‌کند و در صورت نیاز دسترسی‌های دقیق را برای یک نفر کم یا زیاد
        می‌کند. تغییر نقش، دسترسی‌های سفارشی را به پیش‌فرض برمی‌گرداند. همیشه حداقل یک مدیر لازم
        است.
      </p>
      <Button type="button" onClick={() => setInviting(true)}>
        + دعوت عضو
      </Button>

      {page.list.length ? (
        page.list.map(member => (
          <MemberCard
            key={member.email}
            member={member}
            isMe={member.email === page.me}
            invited={page.isInvited(member.email)}
            lastManager={member.role === 'manager' && managers <= 1}
            busy={page.busy}
            onRole={role => void page.setRole(member.email, role)}
            onToggle={(permission, value) => void page.togglePermission(member, permission, value)}
            onReset={() => void page.resetPermissions(member.email)}
            onRemove={() => setRemoving(member.email)}
          />
        ))
      ) : (
        <EmptyState icon="counterparties" message="هنوز عضوی ثبت نشده" />
      )}

      <InviteMembersSheet
        open={inviting}
        buildingName={buildingName}
        saveLabel="تمام"
        onClose={() => {
          setInviting(false)
          page.reload()
        }}
        onSaved={() => {
          setInviting(false)
          page.reload()
        }}
      />
      <ConfirmActionModal
        open={removing !== null}
        title="قطع دسترسی"
        message={`دسترسی ${
          removing ?? ''
        } قطع شود؟ او دیگر نقشی در این ساختمان ندارد. اشتراک درایو را هم خودت باید برداری.`}
        confirmLabel="قطع دسترسی"
        cancelLabel="انصراف"
        confirming={page.busy}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const email = removing

          setRemoving(null)
          if (email) void page.remove(email)
        }}
      />
    </div>
  )
}
