import { useState } from 'react'

import CategoryDefaultsOffer from './CategoryDefaultsOffer'
import CategoryDetailSheet from './CategoryDetailSheet'
import CategoryList from './CategoryList'
import CategoryMergeModal, { type MergeRequest } from './CategoryMergeModal'
import CategoryTable from './CategoryTable'
import { OTHER_LISTS, useCategoriesPage, type CategorySegment } from './useCategoriesPage'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { closeDefaultsOffer } from '../../services/categoryDefaults'
import { categoryNameError } from '../../services/categoryManagePlan'
import { getSettings } from '../../services/settings'
import { isOtherCategory, reorderWithOtherLast } from '../../utils/categoryOrdering'
import { showError } from '../../utils/toast'
import AppIcon from '../AppIcon'
import BudgetSheet from '../budgets/BudgetSheet'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import PageSearchInput from '../PageSearchInput'
import SearchEmptyState from '../SearchEmptyState'
import TransactionTypeSegment from '../TransactionTypeSegment'
import {
  categoryAddRowClass,
  categoryPageClass,
  categorySearchAddClass,
  categorySubSegmentClass,
  categoryToolbarClass
} from '../ui/categoryPageStyles'
import { categorySelectAddBtnClass, categorySelectAddInputClass } from '../ui/formControlStyles'

const SEGMENTS = [
  { id: 'expense', label: 'هزینه', tone: 'expense' as const },
  { id: 'income', label: 'درآمد', tone: 'income' as const },
  { id: 'other', label: 'سایر فهرست‌ها' }
]

/** «دسته‌ها» (round 6, D1): every category list in one place, under Settings. */
export default function CategoriesPage() {
  const page = useCategoriesPage()
  const isDesktop = useIsDesktop()
  const [merge, setMerge] = useState<MergeRequest | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const { actions, items, type, budgetState } = page
  const names = items.map(item => item.name)
  const canReorder = !page.query.trim() && !actions.busy

  const reorder = (from: number, to: number) => {
    const next = reorderWithOtherLast(names, from, to)

    if (next !== names) void actions.reorder(next)
  }

  const add = async () => {
    const error = categoryNameError(names, '', newName)

    if (error) showError(error)
    else if (await actions.add(newName.trim())) setNewName('')
  }

  const rename = async (from: string, to: string) => {
    const error = categoryNameError(names, from, to)

    if (error) {
      showError(error)

      return false
    }

    return actions.rename(from, to)
  }

  const requestMerge = (name: string, fromDelete: boolean) => {
    const rowCount = items.find(item => item.name === name)?.usage.total ?? 0

    if (fromDelete && !rowCount) setDeleting(name)
    else setMerge({ source: name, rowCount, fromDelete })
  }

  return (
    <div className={categoryPageClass}>
      <CategoryDefaultsOffer
        missing={page.missingDefaults}
        busy={actions.busy}
        onAdd={() => void actions.addDefaults().then(done => done && page.closeOffer())}
        onDismiss={() => {
          closeDefaultsOffer(getSettings()?.spreadsheetId)
          page.closeOffer()
        }}
      />

      <div className={categoryToolbarClass}>
        <TransactionTypeSegment
          options={SEGMENTS}
          value={page.segment}
          onChange={id => page.setSegment(id as CategorySegment)}
          ariaLabel="فهرست دسته‌ها"
          className="mb-0"
        />
        {page.segment === 'other' ? (
          <TransactionTypeSegment
            options={OTHER_LISTS}
            value={page.otherType}
            onChange={id => page.setOtherType(id as typeof page.otherType)}
            ariaLabel="سایر فهرست‌ها"
            className={categorySubSegmentClass}
          />
        ) : null}
        <div className={categorySearchAddClass}>
          <PageSearchInput value={page.query} onChange={page.setQuery} placeholder="جستجوی دسته" />
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
              placeholder="نام دسته جدید..."
              aria-label="دسته جدید"
              disabled={actions.busy}
            />
            <button
              type="button"
              className={categorySelectAddBtnClass}
              onClick={() => void add()}
              disabled={actions.busy}
              aria-label="افزودن دسته"
            >
              <AppIcon name="add" size={18} />
            </button>
          </div>
        </div>
      </div>

      {!page.visibleItems.length ? (
        <SearchEmptyState />
      ) : isDesktop ? (
        <CategoryTable
          items={page.visibleItems}
          type={type}
          canReorder={canReorder}
          lastMovable={names.length - (isOtherCategory(names.at(-1) ?? '') ? 2 : 1)}
          onReorder={reorder}
          onOpen={page.openCategory}
        />
      ) : (
        <CategoryList
          items={page.visibleItems}
          type={type}
          canReorder={canReorder}
          onReorder={reorder}
          onOpen={page.openCategory}
        />
      )}

      <CategoryDetailSheet
        item={merge || deleting || budgetState.editing ? null : page.selectedItem}
        showBudget={type === 'expense'}
        busy={actions.busy}
        progress={actions.progress}
        onClose={page.closeCategory}
        onRename={rename}
        onOpenBudget={budgetState.openBudget}
        onSaveSubcategories={actions.saveSubcategories}
        onRenameSubcategory={actions.renameSubcategory}
        onMerge={name => requestMerge(name, false)}
        onDelete={name => requestMerge(name, true)}
      />

      <CategoryMergeModal
        request={merge}
        categories={names}
        busy={actions.busy}
        progress={actions.progress}
        onClose={() => setMerge(null)}
        onConfirm={async (source, target) => {
          const done = await actions.merge(source, target)

          if (done) page.closeCategory()

          return done
        }}
      />

      <ConfirmDeleteModal
        open={deleting != null}
        message={`دسته «${deleting ?? ''}» حذف شود؟ رکوردی ندارد.`}
        deleting={actions.busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          void actions.remove(deleting).then(done => {
            setDeleting(null)
            if (done) page.closeCategory()
          })
        }}
      />

      <BudgetSheet category={budgetState.editing} onClose={budgetState.closeBudget} />
    </div>
  )
}
