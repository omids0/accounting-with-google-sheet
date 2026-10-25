import { useState } from 'react'

import {
  effectivePermission,
  isCustom,
  MEMBER_STATUS_LABELS,
  viewerCanWrite,
  type MemberStatus
} from '../../services/buildingMembers'
import {
  registryOf,
  type MemberKind,
  type MemberRole,
  type WorkspaceMember
} from '../../services/memberRegistry'
import { FormSelect, ToggleSwitch } from '../form'
import {
  accessHonestyNote,
  assignableRoles,
  driveAccessLine,
  memberRoleLabel,
  OWNER_LOCKED_NOTE,
  readOnlyWriterNote
} from '../shared/memberCopy'
import {
  journeyNoteClass,
  journeyRowMetaClass,
  journeyRowTitleClass,
  buildingDayBadgeClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  displaySettingsRowClass,
  displaySettingsRowHintClass,
  displaySettingsRowTextClass,
  displaySettingsRowTitleClass
} from '../ui/displaySettingsStyles'

interface MemberCardProps {
  member: WorkspaceMember
  /** The member list of the building (default) or of a shared account: roles, switches, copy. */
  kind?: MemberKind
  isMe: boolean
  status: MemberStatus
  /** The only manager (owner): neither demoted nor removed. */
  lastManager: boolean
  busy: boolean
  /** The signed-in user may look but not change (a shared account's partner or viewer). */
  readOnly?: boolean
  onRole: (role: MemberRole) => void
  onToggle: (permission: string, value: boolean) => void
  onReset: () => void
  /** «علامت‌گذاری به‌عنوان فعال»: the manager clears a member who is still «دعوت‌شده». */
  onMarkActive: () => void
  /** «ارسال دوبارهٔ دعوت» for a member who is still «دعوت‌شده»; the button shows only with it. */
  onResend?: () => void
  onRemove: () => void
}

/**
 * One member of the building or shared account (screen 29): e-mail, status and Drive access, the
 * role `Select`, «تنظیم دقیق دسترسی‌ها» with a switch per permission (a changed one marks
 * «سفارشی») and «قطع دسترسی». The row of the signed-in manager is read-only: they cannot lock
 * themselves out. The owner of a shared account is fixed: no role select, no switches.
 */
export default function MemberCard({
  member,
  kind = 'building',
  isMe,
  status,
  lastManager,
  busy,
  readOnly = false,
  onRole,
  onToggle,
  onReset,
  onMarkActive,
  onResend,
  onRemove
}: MemberCardProps) {
  const [open, setOpen] = useState(false)

  const registry = registryOf(kind)

  const custom = isCustom(member)

  const fixedOwner = kind === 'shared' && member.role === registry.ownerRole

  const locked = isMe || busy || fixedOwner || readOnly

  const changeable = !isMe && !readOnly && !fixedOwner

  const roleHint = registry.roles.find(item => item.value === member.role)?.hint

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className={buildingDayBadgeClass} aria-hidden="true">
          {member.email[0]?.toUpperCase() ?? '؟'}
        </span>
        <span className="min-w-0 flex-1">
          <span className={journeyRowTitleClass} dir="ltr">
            {member.email}
          </span>
          {isMe ? <span className={journeyRowMetaClass}> (شما)</span> : null}
          <br />
          <span className={journeyRowMetaClass}>
            {`${memberRoleLabel(kind, member.role)}${custom ? ' · دسترسی تغییر داده‌شده' : ''} · ${
              MEMBER_STATUS_LABELS[status]
            } · ${driveAccessLine(kind, member.role, member.overrides)}`}
          </span>
        </span>
      </div>

      {fixedOwner || readOnly ? (
        <p className={journeyNoteClass}>{fixedOwner ? OWNER_LOCKED_NOTE : roleHint}</p>
      ) : (
        <FormSelect
          label="نقش"
          value={member.role}
          onChange={value => onRole(value as MemberRole)}
          options={assignableRoles(kind)}
          disabled={locked}
          hint={
            isMe
              ? 'نقش خودت را نمی‌توانی تغییر بدهی.'
              : lastManager
              ? 'آخرین مدیر است؛ نقش را فقط با تعیین مدیر دیگر می‌شود عوض کرد.'
              : roleHint
          }
        />
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start min-h-11 text-sm"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? 'بستن تنظیم دقیق دسترسی‌ها' : 'تنظیم دقیق دسترسی‌ها ▾'}
      </Button>

      {open ? (
        <div>
          {registry.permissions.map(permission => (
            <div key={permission} className={displaySettingsRowClass}>
              <span className={displaySettingsRowTextClass}>
                <span className={displaySettingsRowTitleClass}>
                  {registry.permissionLabels[permission]}
                </span>
                {permission in member.overrides ? (
                  <span className={displaySettingsRowHintClass}>تغییر داده‌شده</span>
                ) : null}
              </span>
              <ToggleSwitch
                checked={effectivePermission(member, permission, kind)}
                onChange={value => onToggle(permission, value)}
                label={registry.permissionLabels[permission]}
                disabled={locked}
              />
            </div>
          ))}
          {custom && changeable ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 text-sm"
              onClick={onReset}
              disabled={busy}
            >
              برگرداندن به حالت معمول این نقش
            </Button>
          ) : null}
          {viewerCanWrite(member, kind) ? (
            <p className={journeyNoteClass}>{readOnlyWriterNote(kind)}</p>
          ) : null}
          {accessHonestyNote(kind) ? (
            <p className={journeyNoteClass}>{accessHonestyNote(kind)}</p>
          ) : null}
        </div>
      ) : null}

      {status === 'invited' && changeable ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start min-h-11 text-sm"
          onClick={onMarkActive}
          disabled={busy}
        >
          این عضو وارد شده است
        </Button>
      ) : null}

      {status === 'invited' && changeable && onResend ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start min-h-11 text-sm"
          onClick={onResend}
          disabled={busy}
        >
          ارسال دوبارهٔ دعوت
        </Button>
      ) : null}

      {changeable && !lastManager ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="self-start min-h-11 text-sm"
          onClick={onRemove}
          disabled={busy}
        >
          قطع دسترسی
        </Button>
      ) : null}
    </Card>
  )
}
