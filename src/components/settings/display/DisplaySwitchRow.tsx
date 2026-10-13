import type { ReactNode } from 'react'

import { ToggleSwitch } from '../../form'
import {
  displaySettingsRowClass,
  displaySettingsRowHintClass,
  displaySettingsRowTextClass,
  displaySettingsRowTitleClass
} from '../../ui/displaySettingsStyles'

interface DisplaySwitchRowProps {
  title: string
  hint: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** A «نمایش» setting that applies at once: title and hint, switch at the end. */
export default function DisplaySwitchRow({
  title,
  hint,
  checked,
  onChange,
  disabled
}: DisplaySwitchRowProps) {
  return (
    <div className={displaySettingsRowClass}>
      <span className={displaySettingsRowTextClass}>
        <span className={displaySettingsRowTitleClass}>{title}</span>
        <span className={displaySettingsRowHintClass}>{hint}</span>
      </span>
      <ToggleSwitch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}
