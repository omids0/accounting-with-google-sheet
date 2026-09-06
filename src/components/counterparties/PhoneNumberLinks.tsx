import type { MouseEvent } from 'react'

import { counterpartyDetailListClass } from './counterpartyDetailStyles'
import { cn } from '../../utils/cn'
import { buildPhoneTelHref } from '../../utils/phoneLink'

export const phoneNumberLinkClass = cn(
  'font-[inherit] text-primary underline-offset-2 transition-[color,text-decoration-color] duration-[var(--duration-fast)]',
  'hover:text-primary-dark hover:underline',
  'focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2'
)

type PhoneNumberLinksProps = {
  phones: { number: string }[]
  className?: string
  inline?: boolean
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export default function PhoneNumberLinks({
  phones,
  className,
  inline = false,
  onLinkClick
}: PhoneNumberLinksProps) {
  const validPhones = phones.map(phone => phone.number.trim()).filter(Boolean)

  if (validPhones.length === 0) return null

  return (
    <div
      className={cn(inline ? 'inline text-inherit' : counterpartyDetailListClass, className)}
      dir="ltr"
    >
      {validPhones.map((number, index) => {
        const href = buildPhoneTelHref(number)

        return (
          <span key={`${number}-${index}`} className={inline ? 'inline' : 'block'}>
            {inline && index > 0 ? <span aria-hidden="true"> · </span> : null}
            {href ? (
              <a
                href={href}
                className={phoneNumberLinkClass}
                onClick={event => {
                  event.stopPropagation()
                  onLinkClick?.(event)
                }}
              >
                {number}
              </a>
            ) : (
              number
            )}
          </span>
        )
      })}
    </div>
  )
}
