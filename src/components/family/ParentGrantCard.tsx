import {
  CHILD_OWNS_FILE_NOTE,
  PARENT_DOES_NOT_SEE,
  PARENT_DRIVE_WARNING,
  PARENT_RAW_SHEET_NOTE,
  PARENT_SEES
} from './familyCopy'
import { CheckboxField, FormField } from '../form'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { sharedCardTitleClass } from '../ui/sharedStyles'

interface ParentGrantCardProps {
  email: string
  onEmailChange: (value: string) => void
  consent: boolean
  onConsentChange: (value: boolean) => void
  error: string | null
  granting: boolean
  canGrant: boolean
  onGrant: () => void
}

const listClass = 'm-0 list-disc ps-5 text-sm leading-[1.9] text-text'

/**
 * «اجازه دادن به والد»: says in plain words exactly what the parent will see and what not (and
 * that the file stays the child's), then the parent's e-mail, the consent box and «اجازه دسترسی».
 */
export default function ParentGrantCard({
  email,
  onEmailChange,
  consent,
  onConsentChange,
  error,
  granting,
  canGrant,
  onGrant
}: ParentGrantCardProps) {
  return (
    <Card>
      <form
        className="flex flex-col gap-3"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          if (canGrant) onGrant()
        }}
      >
        <h2 className={sharedCardTitleClass}>اجازه دادن به والد</h2>

        <p className="m-0 text-sm font-bold text-text">والد می‌بیند:</p>
        <ul className={listClass}>
          {PARENT_SEES.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="m-0 text-sm font-bold text-text">والد نمی‌بیند و نمی‌تواند:</p>
        <ul className={listClass}>
          {PARENT_DOES_NOT_SEE.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="m-0 text-sm leading-[1.8] text-muted">{PARENT_RAW_SHEET_NOTE}</p>
        <p className="m-0 text-sm leading-[1.8] text-muted">{CHILD_OWNS_FILE_NOTE}</p>

        <FormField label="ایمیل گوگل والد" error={error ?? undefined}>
          <input
            type="email"
            dir="ltr"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={event => onEmailChange(event.target.value)}
            placeholder="parent@gmail.com"
          />
        </FormField>

        <Alert variant="warning" className="mb-0" role="note">
          {PARENT_DRIVE_WARNING}
        </Alert>

        <CheckboxField
          checked={consent}
          onChange={onConsentChange}
          label={`موافقم ${email.trim() || 'این ایمیل'} همهٔ موارد بالا را ببیند`}
        />

        <Button type="submit" disabled={!canGrant} loading={granting}>
          اجازه دسترسی
        </Button>
      </form>
    </Card>
  )
}
