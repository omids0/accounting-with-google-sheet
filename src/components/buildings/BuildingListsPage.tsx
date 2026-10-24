import { useState } from 'react'

import FilterChipBar from './FilterChipBar'
import ManagedItemSheet from './ManagedItemSheet'
import ManagedListRows from './ManagedListRows'
import RowActionsSheet, { type RowAction } from './RowActionsSheet'
import { useManagedListsPage } from './useManagedListsPage'
import type { ManagedItem, ManagedListId } from '../../services/buildingLists'
import { canHideItem } from '../../services/buildingListUsage'
import { journeyNoteClass, journeyPageClass } from '../ui/buildingStyles'
import Button from '../ui/Button'

const LIST_CHIPS: { value: ManagedListId; label: string }[] = [
  { value: 'EXPENSE_KINDS', label: 'نوع هزینه' },
  { value: 'EXPENSE_PAYERS', label: 'پرداخت‌کننده' }
]

const NOUN: Record<ManagedListId, { one: string; add: string; note: string }> = {
  EXPENSE_KINDS: {
    one: 'نوع هزینه',
    add: '+ نوع هزینهٔ جدید',
    note: 'هر نوع مشخص می‌کند سهم هر واحد به نام مالک بیاید یا ساکن.'
  },
  EXPENSE_PAYERS: {
    one: 'پرداخت‌کننده',
    add: '+ پرداخت‌کنندهٔ جدید',
    note: 'صندوق و مدیر همیشه هستند؛ هر عضو دیگر را هم می‌توانی اضافه کنی. هزینه‌ای که کسی جز صندوق پرداخت کند، بدهی به او می‌سازد.'
  }
}

/**
 * «فهرست‌ها» (screen 30): the expense kinds and payers of the building, with the same add /
 * rename / hide / reorder pattern as the categories page. A value in use is hidden, never
 * deleted, so old records keep their label.
 */
export default function BuildingListsPage() {
  const page = useManagedListsPage()
  const [menu, setMenu] = useState<ManagedItem | null>(null)
  /** `null` = closed, `'new'` = adding, else the value being renamed. */
  const [editing, setEditing] = useState<ManagedItem | 'new' | null>(null)

  const noun = NOUN[page.listId]

  const index = menu ? page.items.findIndex(item => item.value === menu.value) : -1

  const actions: RowAction[] = menu
    ? [
        { id: 'rename', label: 'تغییر نام', onClick: () => setEditing(menu) },
        ...(menu.hidden || canHideItem(page.listId, menu)
          ? [
              {
                id: 'hide',
                label: menu.hidden ? 'نمایش دوباره' : 'پنهان کردن',
                onClick: () => void page.setHidden(menu.value, !menu.hidden)
              }
            ]
          : []),
        ...(index > 0
          ? [{ id: 'up', label: 'بالاتر بردن', onClick: () => void page.move(index, index - 1) }]
          : []),
        ...(index >= 0 && index < page.items.length - 1
          ? [
              {
                id: 'down',
                label: 'پایین‌تر بردن',
                onClick: () => void page.move(index, index + 1)
              }
            ]
          : [])
      ]
    : []

  return (
    <div className={journeyPageClass}>
      <FilterChipBar
        options={LIST_CHIPS}
        value={page.listId}
        onChange={page.setListId}
        ariaLabel="فهرست"
      />
      <p className={journeyNoteClass}>
        {noun.note} نام را عوض کن، مورد را پنهان کن یا ترتیب را تغییر بده؛ موردی که استفاده شده هرگز
        حذف نمی‌شود.
      </p>

      <ManagedListRows
        listId={page.listId}
        items={page.items}
        usage={page.usage}
        canReorder={!page.busy}
        onReorder={(from, to) => void page.move(from, to)}
        onMore={setMenu}
      />

      <Button type="button" variant="secondary" onClick={() => setEditing('new')}>
        {noun.add}
      </Button>

      <RowActionsSheet
        open={menu !== null}
        title={menu?.label ?? ''}
        actions={actions}
        onClose={() => setMenu(null)}
      />
      <ManagedItemSheet
        open={editing !== null}
        item={editing === 'new' ? null : editing}
        withChargeTo={page.listId === 'EXPENSE_KINDS'}
        noun={noun.one}
        saving={page.busy}
        onSave={(label, chargeTo) =>
          editing && editing !== 'new'
            ? page.update(editing.value, {
                label,
                ...(page.listId === 'EXPENSE_KINDS' ? { chargeTo } : {})
              })
            : page.add(label, chargeTo)
        }
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
