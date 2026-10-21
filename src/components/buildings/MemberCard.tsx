import { useState } from 'react'

import { BUILDING_ROLES, optionLabel, type BuildingRole } from './buildingOptions'
import {
  DRIVE_ACCESS,
  effectivePermission,
  isCustom,
  MEMBER_STATUS_LABELS,
  PERMISSION_LABELS,
  viewerCanWrite,
  type MemberStatus
} from '../../services/buildingMembers'
import {
  BUILDING_PERMISSIONS,
  type BuildingMember,
  type BuildingPermission
} from '../../services/buildingRoles'
import { FormSelect, ToggleSwitch } from '../form'
import { journeyNoteClass, journeyRowMetaClass, journeyRowTitleClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import { calmDayBadgeClass } from '../ui/calmListStyles'
import Card from '../ui/Card'
import {
  displaySettingsRowClass,
  displaySettingsRowHintClass,
  displaySettingsRowTextClass,
  displaySettingsRowTitleClass
} from '../ui/displaySettingsStyles'

interface MemberCardProps {
  member: BuildingMember
  isMe: boolean
  status: MemberStatus
  /** The only manager: neither demoted nor removed. */
  lastManager: boolean
  busy: boolean
  onRole: (role: BuildingRole) => void
  onToggle: (permission: BuildingPermission, value: boolean) => void
  onReset: () => void
  /** «علامت‌گذاری به‌عنوان فعال»: the manager clears a member who is still «دعوت‌شده». */
  onMarkActive: () => void
  onRemove: () => void
}

/**
 * One member of the building (screen 29): e-mail, status and Drive access, the role `Select`,
 * «دسترسی‌های دقیق» with a switch per permission (a changed one marks «سفارشی») and
 * «قطع دسترسی». The row of the signed-in manager is read-only: they cannot lock themselves out.
 */
export default function MemberCard({
  member,
  isMe,
  status,
  lastManager,
  busy,
  onRole,
  onToggle,
  onReset,
  onMarkActive,
  onRemove
}: MemberCardProps) {
  const [open, setOpen] = useState(false)

  const custom = isCustom(member)

  const locked = isMe || busy

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className={calmDayBadgeClass} aria-hidden="true">
          {member.email[0]?.toUpperCase() ?? '؟'}
        </span>
        <span className="min-w-0 flex-1">
          <span className={journeyRowTitleClass} dir="ltr">
            {member.email}
          </span>
          {isMe ? <span className={journeyRowMetaClass}> (شما)</span> : null}
          <br />
          <span className={journeyRowMetaClass}>
            {`${optionLabel(BUILDING_ROLES, member.role)}${custom ? ' · سفارشی' : ''} · ${
              MEMBER_STATUS_LABELS[status]
            } · درایو: ${DRIVE_ACCESS[member.role]}`}
          </span>
        </span>
      </div>

      <FormSelect
        label="نقش"
        value={member.role}
        onChange={value => onRole(value as BuildingRole)}
        options={BUILDING_ROLES}
        disabled={locked}
        hint={
          isMe
            ? 'نقش خودت را نمی‌توانی تغییر بدهی.'
            : lastManager
            ? 'آخرین مدیر است؛ نقش را فقط با تعیین مدیر دیگر می‌شود عوض کرد.'
            : BUILDING_ROLES.find(item => item.value === member.role)?.hint
        }
      />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? 'بستن دسترسی‌های دقیق' : 'دسترسی‌های دقیق ▾'}
      </Button>

      {open ? (
        <div>
          {BUILDING_PERMISSIONS.map(permission => (
            <div key={permission} className={displaySettingsRowClass}>
              <span className={displaySettingsRowTextClass}>
                <span className={displaySettingsRowTitleClass}>
                  {PERMISSION_LABELS[permission]}
                </span>
                {permission in member.overrides ? (
                  <span className={displaySettingsRowHintClass}>سفارشی</span>
                ) : null}
              </span>
              <ToggleSwitch
                checked={effectivePermission(member, permission)}
                onChange={value => onToggle(permission, value)}
                label={PERMISSION_LABELS[permission]}
                disabled={locked}
              />
            </div>
          ))}
          {custom && !isMe ? (
            <Button type="button" variant="secondary" size="sm" onClick={onReset} disabled={busy}>
              بازگشت به پیش‌فرض نقش
            </Button>
          ) : null}
          {viewerCanWrite(member) ? (
            <p className={journeyNoteClass}>
              این عضو در درایو فقط «مشاهده» دارد؛ برای ثبت باید دسترسی «ویرایش» هم به او داده شود.
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'invited' && !isMe ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={onMarkActive}
          disabled={busy}
        >
          علامت‌گذاری به‌عنوان فعال
        </Button>
      ) : null}

      {!isMe && !lastManager ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="self-start"
          onClick={onRemove}
          disabled={busy}
        >
          قطع دسترسی
        </Button>
      ) : null}
    </Card>
  )
}
