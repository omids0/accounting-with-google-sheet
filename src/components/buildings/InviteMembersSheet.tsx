import { useState, type ReactNode } from 'react'

import { BUILDING_ROLES, optionLabel, type BuildingRole } from './buildingOptions'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { getUserEmail } from '../../services/auth'
import { addInvite, inviteText, invitedEmails, isValidEmail } from '../../services/buildingInvites'
import { MEMBER_STATUS_LABELS, memberStatusReader } from '../../services/buildingMembers'
import { members } from '../../services/buildingRoles'
import { getSettings } from '../../services/settings'
import { PERIOD_SETTINGS_SHEET } from '../../services/sheetNames'
import { getSpreadsheetUrl } from '../../services/sheets'
import { getSheetDataRows } from '../../services/spreadsheetStore'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
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
 * Journey step 7 (optional) and Step 9's «+ دعوت عضو»: e-mail and role. Adds the member row
 * (status «دعوت‌شده») and offers a ready-made text; the Drive share itself is the manager's.
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

  const invited = new Set(
    invitedEmails(getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? [])
  )

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
      await addInvite(spreadsheetId, email, role)
      setEmail('')
      setVersion(value => value + 1)
    } catch (err) {
      showError(toUserMessage(err, 'افزودن عضو ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const copyInvite = () => {
    const latest = members(spreadsheetId)
      .filter(member => invited.has(member.email))
      .at(-1)

    void copy(
      inviteText(buildingName, latest?.role ?? role, getSpreadsheetUrl(spreadsheetId)),
      'متن دعوت کپی شد'
    )
  }

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
        بعد از افزودن، فایل ساختمان را در گوگل‌درایو با همین ایمیل به اشتراک بگذار تا او بتواند وارد
        شود. «کپی متن دعوت» پیام آمادهٔ فرستادن برای اوست.
      </p>
    </FormModal>
  )
}
