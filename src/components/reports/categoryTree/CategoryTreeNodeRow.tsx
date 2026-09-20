import type { CSSProperties } from 'react'

import type { CategoryTreeNode } from '../../../services/categoryTreeReport'
import { formatPersianNumber } from '../../../utils/formatMoney'
import AppIcon from '../../AppIcon'
import MoneyDisplay from '../../MoneyDisplay'
import {
  categoryTreeAmountClass,
  categoryTreeChevronClass,
  categoryTreeChildAmountClass,
  categoryTreeChildListClass,
  categoryTreeChildNameClass,
  categoryTreeChildRowClass,
  categoryTreeCountClass,
  categoryTreeHeadingRowClass,
  categoryTreeLeafDotClass,
  categoryTreeNameClass,
  categoryTreeNodeClass,
  categoryTreeRowClass,
  categoryTreeShareLabelClass,
  categoryTreeValueGroupClass
} from '../../ui/categoryTreeStyles'

interface CategoryTreeNodeRowProps {
  node: CategoryTreeNode
  open: boolean
  expandable: boolean
  /** Total of the node's own type, so every share is read against the same base. */
  typeTotal: number
  onToggle: (id: string) => void
}

function sharePercent(part: number, whole: number): number {
  if (whole <= 0) return 0

  return Math.min(100, Math.round((part / whole) * 100))
}

function formatShare(percent: number): string {
  return `${formatPersianNumber(percent, { useGrouping: false })}٪`
}

export default function CategoryTreeNodeRow({
  node,
  open,
  expandable,
  typeTotal,
  onToggle
}: CategoryTreeNodeRowProps) {
  const share = sharePercent(node.total, typeTotal)

  const body = (
    <>
      {expandable ? (
        <span className={categoryTreeChevronClass(open)} aria-hidden="true">
          <AppIcon name="chevron-down" size={15} strokeWidth={2.5} />
        </span>
      ) : (
        <span className={categoryTreeLeafDotClass} aria-hidden="true" />
      )}

      <span className={categoryTreeHeadingRowClass}>
        <span className={categoryTreeNameClass}>{node.category}</span>
        <span className={categoryTreeCountClass}>
          {formatPersianNumber(node.count, { useGrouping: false })}
        </span>
      </span>

      <span className={categoryTreeValueGroupClass}>
        <span className={categoryTreeShareLabelClass()}>{formatShare(share)}</span>
        <span className={categoryTreeAmountClass}>
          <MoneyDisplay amount={node.total} size="record" tone={node.type} />
        </span>
      </span>
    </>
  )

  return (
    <div className={categoryTreeNodeClass(open)}>
      {expandable ? (
        <button
          type="button"
          className={categoryTreeRowClass}
          data-open={open || undefined}
          onClick={() => onToggle(node.id)}
          aria-expanded={open}
          aria-controls={`${node.id}-children`}
        >
          {body}
        </button>
      ) : (
        <div className={categoryTreeRowClass}>{body}</div>
      )}

      {expandable && open && (
        <div
          id={`${node.id}-children`}
          className={categoryTreeChildListClass}
          role="group"
          aria-label={`زیردسته‌های ${node.category}`}
        >
          {node.children.map((child, index) => {
            const childShare = sharePercent(child.total, node.total)

            const delay = { animationDelay: `${Math.min(index, 8) * 0.035}s` } as CSSProperties

            return (
              <div key={child.name} className={categoryTreeChildRowClass} style={delay}>
                <span className={categoryTreeChildNameClass}>
                  <span className="truncate">{child.name}</span>
                  <span className={categoryTreeCountClass}>
                    {formatPersianNumber(child.count, { useGrouping: false })}
                  </span>
                </span>
                <span className={categoryTreeValueGroupClass}>
                  <span className={categoryTreeShareLabelClass(true)}>
                    {formatShare(childShare)}
                  </span>
                  <span className={categoryTreeChildAmountClass}>
                    <MoneyDisplay amount={child.total} size="record" tone={node.type} />
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
