import { getCounterpartyFullName } from '../../../services/counterparties'
import AppIcon from '../../AppIcon'
import type { CounterpartyWithRow } from '../../counterparties/types'
import DragReorderHandle from '../../ui/DragReorderHandle'
import {
  categorySelectActionsClass,
  categorySelectConfirmActionsClass,
  categorySelectConfirmClass,
  categorySelectConfirmDangerBtnClass,
  categorySelectConfirmBtnClass,
  categorySelectIconBtnClass,
  categorySelectItemClass,
  categorySelectOptionBtnClass,
  categorySelectOptionCheckClass,
  categorySelectOptionLabelClass
} from '../../ui/formControlStyles'

interface CounterpartySelectItemProps {
  item: CounterpartyWithRow
  value: string
  manageMode: boolean
  saving: boolean
  confirmDelete: CounterpartyWithRow | null
  canReorder?: boolean
  dragging?: boolean
  dragProps?: {
    'data-drag-over'?: boolean
    onDragOver: (event: React.DragEvent<HTMLElement>) => void
    onDrop: (event: React.DragEvent<HTMLElement>) => void
  }
  handleProps?: {
    draggable: boolean
    onDragStart: (event: React.DragEvent<HTMLElement>) => void
    onDragEnd: () => void
  }
  onSelect: (name: string) => void
  onStartEdit: (item: CounterpartyWithRow) => void
  onConfirmDelete: (item: CounterpartyWithRow) => void
  onCancelDelete: () => void
  onDelete: (item: CounterpartyWithRow) => void
}

export default function CounterpartySelectItem({
  item,
  value,
  manageMode,
  saving,
  confirmDelete,
  canReorder = false,
  dragging = false,
  dragProps,
  handleProps,
  onSelect,
  onStartEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete
}: CounterpartySelectItemProps) {
  const fullName = getCounterpartyFullName(item)
  const isSelected = value === fullName
  const isConfirmingDelete = confirmDelete?.id === item.id

  return (
    <div
      className={categorySelectItemClass({
        selected: isSelected,
        editing: false,
        confirming: isConfirmingDelete,
        dragging,
        dragOver: dragProps?.['data-drag-over']
      })}
      {...dragProps}
    >
      {isConfirmingDelete ? (
        <div className={categorySelectConfirmClass}>
          <span>حذف «{fullName}»؟</span>
          <div className={categorySelectConfirmActionsClass}>
            <button
              type="button"
              className={categorySelectConfirmDangerBtnClass}
              onClick={() => onDelete(item)}
              disabled={saving}
            >
              حذف
            </button>
            <button
              type="button"
              className={categorySelectConfirmBtnClass}
              onClick={onCancelDelete}
              disabled={saving}
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <>
          {canReorder && handleProps && (
            <DragReorderHandle
              label={`تغییر ترتیب ${fullName}`}
              disabled={saving}
              draggable={handleProps.draggable}
              onDragStart={handleProps.onDragStart}
              onDragEnd={handleProps.onDragEnd}
            />
          )}
          <button
            type="button"
            role="option"
            aria-selected={isSelected}
            className={categorySelectOptionBtnClass}
            onClick={() => onSelect(fullName)}
            disabled={saving || manageMode}
          >
            <span className={categorySelectOptionCheckClass} aria-hidden="true">
              {isSelected && <AppIcon name="check" size={14} strokeWidth={2.5} />}
            </span>
            <span className={categorySelectOptionLabelClass(isSelected)}>{fullName}</span>
          </button>
          {manageMode && (
            <div className={categorySelectActionsClass}>
              <button
                type="button"
                className={categorySelectIconBtnClass()}
                onClick={e => {
                  e.stopPropagation()
                  onStartEdit(item)
                }}
                disabled={saving}
                aria-label={`ویرایش ${fullName}`}
              >
                <AppIcon name="edit" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={categorySelectIconBtnClass('danger')}
                onClick={e => {
                  e.stopPropagation()
                  onConfirmDelete(item)
                }}
                disabled={saving}
                aria-label={`حذف ${fullName}`}
              >
                <AppIcon name="trash" size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
