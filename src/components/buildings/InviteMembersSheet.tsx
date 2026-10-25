import { useState, type ReactNode } from 'react'

import { BUILDING_ROLES, optionLabel, type BuildingRole } from './buildingOptions'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { getUserEmail, isAuthError } from '../../services/auth'
import { inviteText, isValidEmail } from '../../services/buildingInvites'
import { INVITE_BLOCK_MESSAGES, inviteMember } from '../../services/buildingMemberDrive'
import { MEMBER_STATUS_LABELS, memberStatusReader } from '../../services/buildingMembers'
import { members } from '../../services/buildingRoles'
import { shareErrorMessage } from '../../services/driveShare'
import { getSettings } from '../../services/settings'
import { getSpreadsheetUrl } from '../../services/sheets'
import { requestReauth } from '../../stores/appStore'
import { APP_DOWNLOAD_URL, APP_URL } from '../../utils/appLinks'
import { showSuccess } from '../../utils/toast'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import {
  journeyListClass,
  journeyNoteClass,
  journeyRowClass,
  journeyRowMetaClass,
  journeyRowTitleClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import { formErrorClass } from '../ui/formStyles'

interface InviteMembersSheetProps {
  open: boolean
  buildingName: string
  header?: ReactNode
  /** The primary button: «بعدی» in the journey, «تمام» on the members page. */
  saveLabel?: string
  onClose: () => void
  /** «بعدی» of the journey; the members were added (or none was needed). */
  onSaved: () => void
}

/**
 * Journey step 7 (optional) and Step 9's «+ دعوت عضو»: e-mail and role. Shares the building file
 * with them (Drive sends the invitation e-mail), then adds the member row (status «دعوت‌شده»).
 * «کپی متن دعوت» stays for a manager who has to share by hand when Drive refuses.
 */
export default function InviteMembersSheet({
  open,
  buildingName,
  header,
  saveLabel = 'بعدی',
  onClose,
  onSaved
}: InviteMembersSheetProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<BuildingRole>('accountant')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // The period tab is not reactive (settings writes skip the revision), so a counter re-reads it.
  const [, setVersion] = useState(0)
  const { copy } = useCopyToClipboard()

  const spreadsheetId = getSettings()?.spreadsheetId ?? ''

  const me = (getUserEmail() ?? '').toLowerCase()

  const statusOf = memberStatusReader(spreadsheetId, me)

  const add = async () => {
    if (!isValidEmail(email)) {
      setError('ایمیل گوگل را درست وارد کنید')

      return
    }
    setError(null)
    setSaving(true)
    try {
      const block = await inviteMember(spreadsheetId, email, role, buildingName)

      if (block) {
        setError(INVITE_BLOCK_MESSAGES[block])

        return
      }
      showSuccess(`دعوت‌نامه برای ${email.trim()} فرستاده شد`)
      setEmail('')
      setVersion(value => value + 1)
    } catch (err) {
      if (isAuthError(err)) requestReauth()
      else setError(shareErrorMessage(err, 'افزودن عضو ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const copyInvite = () =>
    void copy(
      inviteText(buildingName, role, getSpreadsheetUrl(spreadsheetId), {
        appUrl: APP_URL,
        downloadUrl: APP_DOWNLOAD_URL
      }),
      'متن دعوت کپی شد'
    )

  return (
    <FormModal
      open={open}
      title="دعوت اعضا"
      header={header}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onSaved()
      }}
      saveLabel={saveLabel}
      cancelLabel="بستن"
      saving={saving}
    >
      <FormField label="ایمیل گوگل">
        <input
          type="email"
          dir="ltr"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="sara@gmail.com"
          autoComplete="off"
        />
      </FormField>
      <FormSelect
        label="نقش"
        value={role}
        onChange={value => setRole(value as BuildingRole)}
        options={BUILDING_ROLES}
        hint={BUILDING_ROLES.find(item => item.value === role)?.hint}
      />
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 text-sm"
        onClick={() => void add()}
        loading={saving}
        spinner
      >
        + افزودن
      </Button>

      <div className={journeyListClass}>
        {members(spreadsheetId).map(member => (
          <div key={member.email} className={journeyRowClass}>
            <span>
              <span className={journeyRowTitleClass} dir="ltr">
                {member.email}
              </span>
              <br />
              <span className={journeyRowMetaClass}>
                {optionLabel(BUILDING_ROLES, member.role)} ·{' '}
                {member.email === me ? 'شما' : MEMBER_STATUS_LABELS[statusOf(member.email)]}
              </span>
            </span>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 text-sm"
        onClick={copyInvite}
      >
        کپی متن دعوت
      </Button>
      <p className={journeyNoteClass}>
        با «+ افزودن» گوگل برای او ایمیل دعوت می‌فرستد و فایل ساختمان با نقش انتخابی‌اش به اشتراک
        گذاشته می‌شود. اگر ارسال نشد، فایل را خودت در گوگل‌درایو به اشتراک بگذار و «کپی متن دعوت» را
        برایش بفرست.
      </p>
    </FormModal>
  )
}
