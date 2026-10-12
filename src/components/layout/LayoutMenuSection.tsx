import { useId, type ReactNode } from 'react'

import { appMenuSectionClass, appMenuSectionLabelClass } from '../ui/layoutStyles'

/** One labelled menu group («پول», «تعهدات», …). */
export default function LayoutMenuSection({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  const labelId = useId()

  return (
    <div className={appMenuSectionClass} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={appMenuSectionLabelClass}>
        {label}
      </p>
      {children}
    </div>
  )
}
