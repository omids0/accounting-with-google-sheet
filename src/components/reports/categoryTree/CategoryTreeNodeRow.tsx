import type { CategoryTreeNode } from '../../../services/categoryTreeReport'
import AppIcon from '../../AppIcon'
import MoneyDisplay from '../../MoneyDisplay'
import {
  categoryTreeChevronClass,
  categoryTreeChildLabelClass,
  categoryTreeChildListClass,
  categoryTreeChildRowClass,
  categoryTreeCountClass,
  categoryTreeNodeButtonClass,
  categoryTreeNodeClass,
  categoryTreeNodeLabelClass,
  categoryTreeTypeBadgeClass
} from '../../ui/categoryTreeStyles'

interface CategoryTreeNodeRowProps {
  node: CategoryTreeNode
  open: boolean
  showTypeBadge: boolean
  onToggle: (id: string) => void
}

export default function CategoryTreeNodeRow({
  node,
  open,
  showTypeBadge,
  onToggle
}: CategoryTreeNodeRowProps) {
  const tone = node.type === 'income' ? 'income' : 'expense'

  return (
    <div className={categoryTreeNodeClass}>
      <button
        type="button"
        className={categoryTreeNodeButtonClass}
        onClick={() => onToggle(node.id)}
        aria-expanded={open}
        aria-label={`${node.category}، ${open ? 'بستن' : 'باز کردن'} زیردسته‌ها`}
      >
        <span className={categoryTreeChevronClass(open)} aria-hidden="true">
          <AppIcon name="chevron-down" size={16} strokeWidth={2} />
        </span>
        {showTypeBadge && (
          <span className={categoryTreeTypeBadgeClass(node.type)}>
            {node.type === 'income' ? 'درآمد' : 'هزینه'}
          </span>
        )}
        <span className={categoryTreeNodeLabelClass}>{node.category}</span>
        <span className={categoryTreeCountClass}>{node.count.toLocaleString('fa-IR')}</span>
        <MoneyDisplay amount={node.total} size="record" tone={tone} />
      </button>

      {open && (
        <div className={categoryTreeChildListClass}>
          {node.children.map(child => (
            <div key={child.name} className={categoryTreeChildRowClass}>
              <span className={categoryTreeChildLabelClass}>{child.name}</span>
              <span className={categoryTreeCountClass}>{child.count.toLocaleString('fa-IR')}</span>
              <MoneyDisplay amount={child.total} size="record" tone={tone} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
