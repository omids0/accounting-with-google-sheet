import AppIcon from '../../AppIcon'
import {
  categorySelectActionsClass,
  categorySelectConfirmActionsClass,
  categorySelectConfirmClass,
  categorySelectConfirmDangerBtnClass,
  categorySelectConfirmBtnClass,
  categorySelectEditClass,
  categorySelectEditInputClass,
  categorySelectIconBtnClass,
  categorySelectItemClass,
  categorySelectOptionBtnClass,
  categorySelectOptionCheckClass,
  categorySelectOptionLabelClass
} from '../../ui/formControlStyles'

interface CategorySelectItemProps {
  category: string
  value: string
  manageMode: boolean
  saving: boolean
  editingCategory: string | null
  confirmDelete: string | null
  editText: string
  categoriesCount: number
  onSelect: (category: string) => void
  onStartEdit: (category: string) => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
  onSaveEdit: (oldName: string) => void
  onConfirmDelete: (category: string) => void
  onCancelDelete: () => void
  onDelete: (category: string) => void
}

export default function CategorySelectItem({
  category,
  value,
  manageMode,
  saving,
  editingCategory,
  confirmDelete,
  editText,
  categoriesCount,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onEditTextChange,
  onSaveEdit,
  onConfirmDelete,
  onCancelDelete,
  onDelete
}: CategorySelectItemProps) {
  const isSelected = value === category

  const isEditing = editingCategory === category

  const isConfirmingDelete = confirmDelete === category

  return (
    <div
      className={categorySelectItemClass({
        selected: isSelected,
        editing: isEditing,
        confirming: isConfirmingDelete
      })}
    >
      {isConfirmingDelete ? (
        <div className={categorySelectConfirmClass}>
          <span>حذف «{category}»؟</span>
          <div className={categorySelectConfirmActionsClass}>
            <button
              type="button"
              className={categorySelectConfirmDangerBtnClass}
              onClick={() => onDelete(category)}
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
      ) : isEditing ? (
        <div className={categorySelectEditClass}>
          <input
            type="text"
            className={categorySelectEditInputClass}
            value={editText}
            onChange={e => onEditTextChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSaveEdit(category)
              }
              if (e.key === 'Escape') onCancelEdit()
            }}
            disabled={saving}
            aria-label="ویرایش دسته‌بندی"
            autoFocus
          />
          <button
            type="button"
            className={categorySelectIconBtnClass('save')}
            onClick={() => onSaveEdit(category)}
            disabled={saving}
            aria-label="تایید"
          >
            <AppIcon name="check" size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className={categorySelectIconBtnClass()}
            onClick={onCancelEdit}
            disabled={saving}
            aria-label="انصراف"
          >
            <AppIcon name="close" size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            role="option"
            aria-selected={isSelected}
            className={categorySelectOptionBtnClass}
            onClick={() => onSelect(category)}
            disabled={saving || manageMode}
          >
            <span className={categorySelectOptionCheckClass} aria-hidden="true">
              {isSelected && <AppIcon name="check" size={14} strokeWidth={2.5} />}
            </span>
            <span className={categorySelectOptionLabelClass(isSelected)}>{category}</span>
          </button>
          {manageMode && (
            <div className={categorySelectActionsClass}>
              <button
                type="button"
                className={categorySelectIconBtnClass()}
                onClick={e => {
                  e.stopPropagation()
                  onStartEdit(category)
                }}
                disabled={saving}
                aria-label={`ویرایش ${category}`}
              >
                <AppIcon name="edit" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={categorySelectIconBtnClass('danger')}
                onClick={e => {
                  e.stopPropagation()
                  onConfirmDelete(category)
                }}
                disabled={saving || categoriesCount <= 1}
                aria-label={`حذف ${category}`}
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
