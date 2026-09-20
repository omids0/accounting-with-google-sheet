import CategoryTreeNodeRow from './CategoryTreeNodeRow'
import type { CategoryTreeNode, CategoryTreeType } from '../../../services/categoryTreeReport'
import { formatMoney, formatPersianNumber } from '../../../utils/formatMoney'
import {
  categoryTreeListClass,
  categoryTreeSectionClass,
  categoryTreeSectionCountClass,
  categoryTreeSectionHeaderClass,
  categoryTreeSectionRuleClass,
  categoryTreeSectionTitleClass,
  categoryTreeSectionTotalClass,
  categoryTreeToneStyle
} from '../../ui/categoryTreeStyles'

interface CategoryTreeSectionProps {
  type: CategoryTreeType
  title: string
  nodes: CategoryTreeNode[]
  total: number
  showHeader: boolean
  expandedIds: Set<string>
  isExpandable: (node: CategoryTreeNode) => boolean
  onToggle: (id: string) => void
}

/**
 * One branch of the tree. Income and expense never share a list, so their
 * amounts are never read as one ranking.
 */
export default function CategoryTreeSection({
  type,
  title,
  nodes,
  total,
  showHeader,
  expandedIds,
  isExpandable,
  onToggle
}: CategoryTreeSectionProps) {
  if (!nodes.length) return null

  return (
    <section className={categoryTreeSectionClass} style={categoryTreeToneStyle(type)}>
      {showHeader && (
        <header className={categoryTreeSectionHeaderClass}>
          <h3 className={categoryTreeSectionTitleClass}>{title}</h3>
          <span className={categoryTreeSectionCountClass}>
            {formatPersianNumber(nodes.length, { useGrouping: false })} دسته
          </span>
          <span className={categoryTreeSectionRuleClass} aria-hidden="true" />
          <span className={categoryTreeSectionTotalClass}>{formatMoney(total)}</span>
        </header>
      )}

      <div className={categoryTreeListClass}>
        {nodes.map(node => (
          <CategoryTreeNodeRow
            key={node.id}
            node={node}
            open={expandedIds.has(node.id)}
            expandable={isExpandable(node)}
            typeTotal={total}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  )
}
