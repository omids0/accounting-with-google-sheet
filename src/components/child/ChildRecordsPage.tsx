import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import ChildMonthBar from './ChildMonthBar'
import ChildPageFrame from './ChildPageFrame'
import ChildRecordDetail from './ChildRecordDetail'
import ChildRecordRow from './ChildRecordRow'
import {
  categoryOptions,
  entriesNet,
  filterEntries,
  type ChildEntry,
  type ChildKind
} from './childViewModel'
import { useChildMonth } from './useChildMonth'
import { useChildRecords } from './useChildRecords'
import { CHILD_CATEGORY_PARAM } from '../../routes/childPaths'
import { isConfigured } from '../../services/settings'
import FilterChipBar from '../buildings/FilterChipBar'
import EmptyState from '../EmptyState'
import { Select } from '../form'
import MoneyText from '../MoneyText'
import PageSearchInput from '../PageSearchInput'
import { RecordListSkeleton } from '../skeleton'
import Card from '../ui/Card'
import { sharedListClass, sharedMutedClass } from '../ui/sharedStyles'

type Scope = 'month' | 'all'

type KindChoice = ChildKind | 'all'

const ALL_CATEGORIES = ''

/**
 * «تراکنش‌ها» of a child's account (a parent's read-only view): the records of one month (or all
 * of them) with a search box, a category filter and an income / expense filter. `?category=` opens
 * it on one category (the summary's and the category page's rows link here). A tap opens the
 * record's read-only details.
 */
export default function ChildRecordsPage() {
  const { entries, forms, loading } = useChildRecords()
  const month = useChildMonth()
  const [params] = useSearchParams()
  const [scope, setScope] = useState<Scope>(params.get(CHILD_CATEGORY_PARAM) ? 'all' : 'month')
  const [kind, setKind] = useState<KindChoice>('all')
  const [category, setCategory] = useState(params.get(CHILD_CATEGORY_PARAM) ?? ALL_CATEGORIES)
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<ChildEntry | null>(null)

  const shown = useMemo(
    () =>
      filterEntries(entries, {
        month: scope === 'month' ? month.month : null,
        kind,
        category,
        query
      }),
    [entries, scope, month.month, kind, category, query]
  )

  const categories = useMemo(() => categoryOptions(entries), [entries])

  const total = useMemo(() => entriesNet(shown), [shown])

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  return (
    <ChildPageFrame>
      {loading && !entries.length ? (
        <RecordListSkeleton />
      ) : (
        <>
          <FilterChipBar
            ariaLabel="بازهٔ زمانی"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'month', label: 'ماهانه' },
              { value: 'all', label: 'همهٔ ماه‌ها' }
            ]}
          />
          {scope === 'month' ? <ChildMonthBar month={month} /> : null}

          <FilterChipBar
            ariaLabel="نوع تراکنش"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'همه' },
              { value: 'expense', label: 'هزینه' },
              { value: 'income', label: 'درآمد' }
            ]}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 [&_.page-search]:max-w-none">
              <PageSearchInput value={query} onChange={setQuery} placeholder="جستجوی تراکنش…" />
            </div>
            <div className="sm:w-56">
              <Select
                aria-label="دسته‌بندی"
                value={category}
                onChange={setCategory}
                options={[
                  { value: ALL_CATEGORIES, label: 'همهٔ دسته‌ها' },
                  ...categories.map(name => ({ value: name, label: name }))
                ]}
              />
            </div>
          </div>

          {shown.length ? (
            <Card>
              <div className={sharedListClass}>
                {shown.map((entry, index) => (
                  <ChildRecordRow key={entry.id} entry={entry} index={index} onOpen={setOpened} />
                ))}
              </div>
              <p className={`${sharedMutedClass} mt-2 flex items-center justify-between gap-2`}>
                <span>جمع این فهرست (تراز)</span>
                <b className="numeric text-text">
                  <MoneyText amount={total} signed />
                </b>
              </p>
            </Card>
          ) : (
            <EmptyState
              icon="empty-inbox"
              message={entries.length ? 'تراکنشی پیدا نشد' : 'هنوز تراکنشی ثبت نشده'}
              description={
                entries.length
                  ? 'ماه، نوع یا دسته‌بندی را عوض کنید یا جستجو را پاک کنید.'
                  : undefined
              }
            />
          )}

          <ChildRecordDetail entry={opened} forms={forms} onClose={() => setOpened(null)} />
        </>
      )}
    </ChildPageFrame>
  )
}
