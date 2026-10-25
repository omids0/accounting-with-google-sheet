import { useState } from 'react'

import {
  clearPendingInviteRef,
  getPendingInviteRef,
  setPendingInviteRef
} from '../../utils/inviteRef'
import {
  formControlClassName,
  formErrorClass,
  formHintClass,
  formLabelClass
} from '../ui/formStyles'
import { loginFooterNoteClass } from '../ui/loginStyles'

/**
 * The Android app is installed from a download, so the invite link cannot hand its code over.
 * A newcomer types the code their friend gave them; it is counted at the first sign-in.
 */
export default function InviteCodeField() {
  const [value, setValue] = useState(() => getPendingInviteRef() ?? '')

  const [open, setOpen] = useState(() => !!getPendingInviteRef())

  const [error, setError] = useState('')

  const change = (next: string) => {
    setValue(next)
    setError('')

    // Only a complete, well-formed code is kept; anything else leaves no half-typed code behind.
    if (!setPendingInviteRef(next)) clearPendingInviteRef()
  }

  const checkOnLeave = () => {
    if (value.trim() && !getPendingInviteRef()) {
      setError('کد دعوت درست نیست؛ ۱۰ حرف انگلیسی یا عدد است.')
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={`${loginFooterNoteClass} w-full underline`}
        onClick={() => setOpen(true)}
      >
        کد دعوت دارم
      </button>
    )
  }

  return (
    <div className="mt-4">
      <label className={formLabelClass} htmlFor="invite-code">
        کد دعوت (اختیاری)
      </label>
      <input
        id="invite-code"
        className={formControlClassName('font-mono [direction:ltr]')}
        value={value}
        maxLength={10}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={event => change(event.target.value)}
        onBlur={checkOnLeave}
        aria-invalid={error ? true : undefined}
        aria-describedby="invite-code-note"
      />
      {error ? (
        <p id="invite-code-note" className={formErrorClass} role="alert">
          {error}
        </p>
      ) : (
        <p id="invite-code-note" className={formHintClass}>
          اگر دوستی شما را دعوت کرده، کد او را اینجا بنویسید.
        </p>
      )}
    </div>
  )
}
