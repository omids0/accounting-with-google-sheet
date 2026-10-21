import { useDragReorder } from '../../hooks/useDragReorder'
import type { ManagedItem, ManagedListId } from '../../services/buildingLists'
import { listRowMeta } from '../../services/buildingListUsage'
import { buildingMoreButtonClass } from '../ui/buildingStyles'
import {
  categoryListClass,
  categoryRowClass,
  categoryRowMainClass,
  categoryRowMetaClass,
  categoryRowTitleClass
} from '../ui/categoryPageStyles'
import DragReorderHandle from '../ui/DragReorderHandle'

interface ManagedListRowsProps {
  listId: ManagedListId
  items: ManagedItem[]
  usage: Record<string, number>
  canReorder: boolean
  onReorder: (from: number, to: number) => void
  onMore: (item: ManagedItem) => void
}

/** Rows of «فهرست‌ها»: drag handle, name, the rule and usage line, «⋯». A hidden value is dimmed. */
export default function ManagedListRows({
  listId,
  items,
  usage,
  canReorder,
  onReorder,
  onMore
}: ManagedListRowsProps) {
  const { draggingIndex, getItemDragProps, getHandleProps } = useDragReorder({
    disabled: !canReorder,
    onReorder
  })

  return (
    <ul className={categoryListClass} aria-label="فهرست">
      {items.map((item, index) => {
        const dragProps = getItemDragProps(index)

        return (
          <li
            key={item.value}
            className={categoryRowClass(
              item.hidden || draggingIndex === index,
              dragProps['data-drag-over']
            )}
            {...dragProps}
          >
            <DragReorderHandle
              label={`جابه‌جایی ${item.label}`}
              disabled={!canReorder}
              {...getHandleProps(index)}
            />
            <span className={categoryRowMainClass}>
              <span className={categoryRowTitleClass}>
                <span className="truncate">{item.label}</span>
              </span>
              <span className={categoryRowMetaClass}>
                {listRowMeta(listId, item, usage[item.value] ?? 0)}
              </span>
            </span>
            <button
              type="button"
              className={buildingMoreButtonClass}
              onClick={() => onMore(item)}
              aria-label={`گزینه‌های ${item.label}`}
            >
              ⋯
            </button>
          </li>
        )
      })}
    </ul>
  )
}
