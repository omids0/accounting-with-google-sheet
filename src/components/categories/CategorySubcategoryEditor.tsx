import { useState } from 'react'

import { categoryNameError } from '../../services/categoryManagePlan'
import { showError } from '../../utils/toast'
import AppIcon from '../AppIcon'
import {
  categoryAddRowClass,
  categoryIconBtnClass,
  categorySubListClass,
  categorySubNameClass,
  categorySubRowClass
} from '../ui/categoryPageStyles'
import { categorySelectAddBtnClass, categorySelectAddInputClass } from '../ui/formControlStyles'
import { formHintClass } from '../ui/formStyles'

interface CategorySubcategoryEditorProps {
  category: string
  subcategories: string[]
  busy: boolean
  onSave: (next: string[]) => Promise<boolean>
  /** Rewrites the rows that carry the subcategory, then the list. */
  onRename: (from: string, to: string) => Promise<boolean>
}

/** «زیردسته‌ها» inside the category sheet: inline add, rename and delete. */
export default function CategorySubcategoryEditor({
  category,
  subcategories,
  busy,
  onSave,
  onRename
}: CategorySubcategoryEditorProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [newName, setNewName] = useState('')

  const check = (current: string, next: string) => {
    const error = categoryNameError(subcategories, current, next)

    if (error) showError(error.replace('دسته', 'زیردسته'))

    return !error
  }

  const add = async () => {
    const name = newName.trim()

    if (!name || !check('', name)) return
    if (await onSave([...subcategories, name])) setNewName('')
  }

  const saveEdit = async () => {
    if (!editing) return
    if (editText.trim() === editing) {
      setEditing(null)

      return
    }
    if (check(editing, editText) && (await onRename(editing, editText))) setEditing(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {subcategories.length ? (
        <ul className={categorySubListClass} aria-label={`زیردسته‌های ${category}`}>
          {subcategories.map(sub => (
            <li key={sub} className={categorySubRowClass}>
              {editing === sub ? (
                <>
                  <input
                    type="text"
                    className={categorySelectAddInputClass}
                    value={editText}
                    onChange={event => setEditText(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void saveEdit()
                      }
                      if (event.key === 'Escape') setEditing(null)
                    }}
                    aria-label={`نام تازه ${sub}`}
                    disabled={busy}
                    ref={element => element?.focus()}
                  />
                  <button
                    type="button"
                    className={categoryIconBtnClass}
                    onClick={() => void saveEdit()}
                    disabled={busy}
                    aria-label="ذخیره نام زیردسته"
                  >
                    <AppIcon name="check" size={16} />
                  </button>
                  <button
                    type="button"
                    className={categoryIconBtnClass}
                    onClick={() => setEditing(null)}
                    disabled={busy}
                    aria-label="انصراف"
                  >
                    <AppIcon name="close" size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className={categorySubNameClass}>{sub}</span>
                  <button
                    type="button"
                    className={categoryIconBtnClass}
                    onClick={() => {
                      setEditing(sub)
                      setEditText(sub)
                    }}
                    disabled={busy}
                    aria-label={`تغییر نام ${sub}`}
                  >
                    <AppIcon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    className={categoryIconBtnClass}
                    onClick={() => void onSave(subcategories.filter(item => item !== sub))}
                    disabled={busy}
                    aria-label={`حذف ${sub}`}
                  >
                    <AppIcon name="trash" size={16} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={formHintClass}>هنوز زیردسته‌ای ندارد؛ «سایر» همیشه هست.</p>
      )}

      <div className={categoryAddRowClass}>
        <input
          type="text"
          className={categorySelectAddInputClass}
          value={newName}
          onChange={event => setNewName(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void add()
            }
          }}
          placeholder="زیردسته جدید..."
          aria-label="زیردسته جدید"
          disabled={busy}
        />
        <button
          type="button"
          className={categorySelectAddBtnClass}
          onClick={() => void add()}
          disabled={busy || !newName.trim()}
          aria-label="افزودن زیردسته"
        >
          <AppIcon name="add" size={18} />
        </button>
      </div>
    </div>
  )
}
