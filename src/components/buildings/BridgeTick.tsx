import { useState } from 'react'

import { readBridgePrefs, updateBridgePrefs } from '../../services/bridgePrefs'
import FormField from '../form/FormField'
import ToggleSwitch from '../form/ToggleSwitch'
import { journeyNoteClass } from '../ui/buildingStyles'

interface BridgeTickProps {
  /** `pocket`: «طلب از <building>» on a manager's expense; `ownUnit`: «خانه › شارژ» on their own unit. */
  pref: 'pocket' | 'ownUnit'
  /** What is written to the personal sheet, e.g. «طلب از «ساختمان نرگس»». */
  text: string
  disabled?: boolean
}

/**
 * The bridge tick «در حساب شخصی من: …» (round 11, Step 8). The choice is remembered per device, so
 * it is saved as soon as it changes; what it writes happens after the building record is saved.
 */
export default function BridgeTick({ pref, text, disabled }: BridgeTickProps) {
  const [on, setOn] = useState(() => readBridgePrefs()[pref])

  return (
    <FormField label="در حساب شخصی من" controlWidth="full">
      <div className="flex items-center justify-between gap-3">
        <span className={journeyNoteClass}>{text}</span>
        <ToggleSwitch
          checked={on}
          onChange={next => {
            setOn(next)
            updateBridgePrefs({ [pref]: next })
          }}
          label={`در حساب شخصی من: ${text}`}
          disabled={disabled}
        />
      </div>
    </FormField>
  )
}
