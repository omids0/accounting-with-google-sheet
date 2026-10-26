import { useState, type ReactNode } from 'react'

import InviteMembersSheet from './InviteMembersSheet'
import MemberCard from './MemberCard'
import { useBuildingMembers } from './useBuildingMembers'
import { useMemberKind } from '../../hooks/useMemberKind'
import { getBuildingProfile } from '../../services/buildingProfile'
import { registryOf, type MemberKind } from '../../services/memberRegistry'
import { getSettings } from '../../services/settings'
import { SHARED_NAME_PREFIX } from '../../services/sharedWorkspace'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import ConfirmActionModal from '../ConfirmActionModal'
import EmptyState from '../EmptyState'
import {
  inviteButtonLabel,
  membersIntro,
  removeMemberMessage,
  withBalanceWarning
} from '../shared/memberCopy'
import { journeyNoteClass, journeyPageClass } from '../ui/buildingStyles'
import Button from '../ui/Button'

interface BuildingMembersPageProps {
  /** The building (default) or the shared account whose members are listed. */
  kind?: MemberKind
  /** Above the intro: the shared account's own-role card. */
  header?: ReactNode
  /** Below the list: the shared account's data-safety card and «ترک این فضا». */
  footer?: ReactNode
  /** The shared account's open balance, said first when that member is removed. */
  removeWarning?: (email: string) => string | null
}

/**
 * «اعضا و دسترسی‌ها» (screen 29): the manager sets each member's role and, when one person needs
 * more or less than the role gives, their permissions one by one. The app enforces this in its
 * interface; the real access is the Drive share. The building page itself needs the `settings`
 * permission; a shared account lets a partner or viewer look at the list, read-only.
 */
export default function BuildingMembersPage({
  kind: kindProp,
  header,
  footer,
  removeWarning
}: BuildingMembersPageProps) {
  const kind = useMemberKind(kindProp)

  const page = useBuildingMembers(kind)

  const registry = registryOf(kind)

  const shared = kind === 'shared'

  const readOnly = shared && !page.canManage

  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const label = getSpreadsheetLabel(
    getSettings()?.spreadsheets?.find(entry => entry.id === page.spreadsheetId)?.name ?? ''
  )

  // A shared account's file is titled «مشترک <name>»; the invitation carries the name alone.
  const name =
    (shared
      ? label.startsWith(SHARED_NAME_PREFIX)
        ? label.slice(SHARED_NAME_PREFIX.length)
        : label
      : getBuildingProfile(page.spreadsheetId)?.name) ?? label

  const owners = page.list.filter(member => member.role === registry.ownerRole).length

  return (
    <div className={journeyPageClass}>
      {header}
      <p className={journeyNoteClass}>{membersIntro(kind, readOnly)}</p>
      {readOnly ? null : (
        <Button type="button" onClick={() => setInviting(true)}>
          {inviteButtonLabel(kind)}
        </Button>
      )}

      {page.list.length ? (
        page.list.map(member => (
          <MemberCard
            key={member.email}
            member={member}
            kind={kind}
            isMe={member.email === page.me}
            status={page.statusOf(member.email)}
            lastManager={member.role === registry.ownerRole && owners <= 1}
            busy={page.busy}
            readOnly={readOnly}
            onRole={role => void page.setRole(member.email, role)}
            onToggle={(permission, value) => void page.togglePermission(member, permission, value)}
            onReset={() => void page.resetPermissions(member.email)}
            onMarkActive={() => void page.markActive(member.email)}
            onResend={shared ? () => void page.resend(member.email, name) : undefined}
            onRemove={() => setRemoving(member.email)}
          />
        ))
      ) : (
        <EmptyState icon="counterparties" message="هنوز عضوی ثبت نشده" />
      )}
      {footer}

      <InviteMembersSheet
        open={inviting}
        kind={kind}
        buildingName={name}
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
        message={withBalanceWarning(
          removing ? removeWarning?.(removing) ?? null : null,
          removeMemberMessage(kind, removing ?? '')
        )}
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
