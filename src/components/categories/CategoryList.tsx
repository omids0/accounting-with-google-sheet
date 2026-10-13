import { categoryRowMeta } from './categoryRowMeta'
import type { CategoryItem } from './useCategoriesPage'
import { useDragReorder } from '../../hooks/useDragReorder'
import type { ManagedCategoryType } from '../../services/categoryManagePlan'
import { isOtherCategory } from '../../utils/categoryOrdering'
import AppIcon from '../AppIcon'
import {
  categoryBadgeClass,
  categoryChevronClass,
  categoryListClass,
  categoryRowButtonClass,
  categoryRowClass,
  categoryRowHintClass,
  categoryRowMainClass,
  categoryRowMetaClass,
  categoryRowTitleClass
} from '../ui/categoryPageStyles'
import DragReorderHandle from '../ui/DragReorderHandle'
import { categorySelectDragHandleSpacerClass } from '../ui/formControlStyles'

interface CategoryListProps {
  items: CategoryItem[]
  type: ManagedCategoryType
  /** Off while searching or saving: the visible order is not the stored one. */
  canReorder: boolean
  onReorder: (fromIndex: number, toIndex: number) => void
  onOpen: (name: string) => void
}

/** Phone rows: drag handle, name with «سیستمی», the usage line, chevron. */
export default function CategoryList({
  items,
  type,
  canReorder,
  onReorder,
  onOpen
}: CategoryListProps) {
  const { draggingIndex, getItemDragProps, getHandleProps } = useDragReorder({
    disabled: !canReorder,
    onReorder
  })

  return (
    <ul className={categoryListClass} aria-label="دسته‌ها">
      {items.map(item => {
        const movable = canReorder && !isOtherCategory(item.name)
        const dragProps = getItemDragProps(item.index)

        return (
          <li
            key={item.name}
            className={categoryRowClass(
              item.dormant || draggingIndex === item.index,
              dragProps['data-drag-over']
            )}
            {...dragProps}
          >
            {movable ? (
              <DragReorderHandle label={`جابه‌جایی ${item.name}`} {...getHandleProps(item.index)} />
            ) : (
              <span className={categorySelectDragHandleSpacerClass} aria-hidden="true" />
            )}
            <button
              type="button"
              className={categoryRowButtonClass}
              onClick={() => onOpen(item.name)}
            >
              <span className={categoryRowMainClass}>
                <span className={categoryRowTitleClass}>
                  <span className="truncate">{item.name}</span>
                  {item.system ? <span className={categoryBadgeClass}>سیستمی</span> : null}
                </span>
                <span className={categoryRowMetaClass}>
                  {categoryRowMeta(item, type)}
                  {item.dormant ? (
                    <span className={categoryRowHintClass}> · ادغام یا حذف؟</span>
                  ) : null}
                </span>
              </span>
              <AppIcon name="chevron-down" size={16} className={categoryChevronClass} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
