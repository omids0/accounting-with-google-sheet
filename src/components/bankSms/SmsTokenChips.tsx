import { nextSmsRole, SMS_ROLE_LABELS } from './smsLabels'
import type { SmsToken } from '../../services/bankSmsText'
import type { SmsSlotRole, SmsTemplatePart } from '../../types'
import { smsRoleChipClass, smsRoleChipLabelClass, smsTokensClass } from '../ui/bankSmsStyles'

type SmsTokenChipsProps = {
  tokens: SmsToken[]
  parts: SmsTemplatePart[]
  onRoleChange: (index: number, role: SmsSlotRole) => void
}

/** The sample SMS with every number as a tappable chip showing its role. */
export default function SmsTokenChips({ tokens, parts, onRoleChange }: SmsTokenChipsProps) {
  return (
    <div className={smsTokensClass} aria-label="نقش عددهای پیامک">
      {tokens.map((token, index) => {
        const part = parts[index]

        if (token.kind === 'text' || part?.kind !== 'slot') {
          return <span key={index}>{token.value}</span>
        }

        return (
          <button
            key={index}
            type="button"
            className={smsRoleChipClass(part.role)}
            onClick={() => onRoleChange(index, nextSmsRole(part.role))}
            aria-label={`${token.value}: ${SMS_ROLE_LABELS[part.role]} — برای تغییر بزنید`}
          >
            {token.value}
            <span className={smsRoleChipLabelClass}>{SMS_ROLE_LABELS[part.role]}</span>
          </button>
        )
      })}
    </div>
  )
}
