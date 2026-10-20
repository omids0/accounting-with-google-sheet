import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import BuildingListFilters from './BuildingListFilters'
import BuildingSetupCard from './BuildingSetupCard'
import ChangeResidentSheet from './ChangeResidentSheet'
import FilterChipBar from './FilterChipBar'
import QuickUnitsBuilderSheet from './QuickUnitsBuilderSheet'
import RowActionsSheet from './RowActionsSheet'
import UnitFormModal from './UnitFormModal'
import { buildUnitRows, type UnitRowData } from './unitRows'
import UnitsList from './UnitsList'
import { useBuildingSetupData } from './useBuildingSetupData'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useListFilters } from '../../hooks/useListFilters'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { buildingUnitPath } from '../../routes/buildingPaths'
import type { UnitWithRow } from '../../services/buildingUnits'
import { isConfigured } from '../../services/settings'
import { toPersianDigits } from '../../utils/normalizeDigits'
import EmptyState from '../EmptyState'
import { Select } from '../form'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import { listModulePageClass } from '../ui/featureCardStyles'

type UnitView = 'all' | 'debt' | 'vacant'

const searchParts = (row: UnitRowData) => [
  row.unit.number,
  row.resident?.name,
  row.owner,
  row.unit.note
]

const fa = (value: number) => toPersianDigits(String(value))

/**
 * «واحدها»: every active unit with who lives there, what it pays and what it owes. Filters:
 * debtors, vacant, one floor; search through the page's filter sheet. Opening a unit goes to its
 * page (Step 4); «+ واحد» and the edit form need the `people` permission.
 */
export default function BuildingUnitsPage({ active = true }: { active?: boolean }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const data = useBuildingSetupData()
  const { can } = useBuildingAccess()
  const [view, setView] = useState<UnitView>(params.get('f') === 'debt' ? 'debt' : 'all')
  const [floor, setFloor] = useState('all')
  /** `undefined` = closed, `null` = a new unit. */
  const [editing, setEditing] = useState<UnitWithRow | null | undefined>(undefined)
  const [menu, setMenu] = useState<UnitRowData | null>(null)
  const [changing, setChanging] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)

  const canEdit = can('people')

  const rows = useMemo(() => buildUnitRows(data), [data])

  const filters = useListFilters({ items: rows, getSearchParts: searchParts })

  const floors = useMemo(
    () => [...new Set(rows.map(row => row.unit.floor))].sort((a, b) => a - b),
    [rows]
  )

  const shown = filters.filteredItems
    .filter(row => view !== 'debt' || row.balance.open > 0)
    .filter(row => view !== 'vacant' || !row.resident)
    .filter(row => floor === 'all' || String(row.unit.floor) === floor)

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات واحدها',
      actions: createPageSpeedDialActions({
        onAdd: () => setEditing(null),
        addLabel: 'واحد',
        onFilter: filters.openFilterModal,
        onRefresh: () => void data.reload()
      }).filter(action => !action.disabled && (canEdit || action.id !== 'add'))
    }),
    [canEdit, data, filters.openFilterModal]
  )

  useRegisterPageSpeedDial(isConfigured() ? speedDial : null, active)

  if (!data.loaded) return <DangCardListSkeleton filterBar table />

  return (
    <div className={listModulePageClass}>
      <BuildingSetupCard />
      <BuildingListFilters filters={filters} placeholder="جستجوی شماره یا نام..." />

      {!rows.length ? (
        <EmptyState
          icon="building"
          message="هنوز واحدی ثبت نشده"
          description="واحدها را یک‌جا بساز تا شارژ، صورت‌حساب و ساکنان کار کنند."
          action={
            canEdit ? { label: 'ساخت سریع واحدها', onClick: () => setBuilding(true) } : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChipBar
              ariaLabel="نمایش واحدها"
              value={view}
              onChange={setView}
              options={[
                { value: 'all', label: 'همه', count: rows.length },
                {
                  value: 'debt',
                  label: 'بدهکار',
                  count: rows.filter(r => r.balance.open > 0).length
                },
                { value: 'vacant', label: 'خالی', count: rows.filter(r => !r.resident).length }
              ]}
            />
            {floors.length > 1 ? (
              <Select
                compact
                className="w-auto min-w-[8.5rem]"
                aria-label="طبقه"
                value={floor}
                onChange={setFloor}
                options={[
                  { value: 'all', label: 'همهٔ طبقه‌ها' },
                  ...floors.map(item => ({ value: String(item), label: `طبقه ${fa(item)}` }))
                ]}
              />
            ) : null}
          </div>
          {shown.length ? (
            <UnitsList
              rows={shown}
              onOpen={row => navigate(buildingUnitPath(row.unit.id))}
              onEdit={canEdit ? row => setEditing(row.unit) : undefined}
              onMore={canEdit ? setMenu : undefined}
            />
          ) : (
            <SearchEmptyState />
          )}
        </>
      )}

      <RowActionsSheet
        open={menu !== null}
        title={menu ? `واحد ${toPersianDigits(menu.unit.number)}` : ''}
        onClose={() => setMenu(null)}
        actions={[
          { id: 'edit', label: 'ویرایش', onClick: () => menu && setEditing(menu.unit) },
          { id: 'change', label: 'تغییر ساکن', onClick: () => menu && setChanging(menu.unit.id) }
        ]}
      />
      <UnitFormModal
        open={editing !== undefined}
        unit={editing ?? null}
        data={data}
        onClose={() => setEditing(undefined)}
        onAddPerson={unit => setChanging(unit.id)}
        onSaved={() => setEditing(undefined)}
      />
      <ChangeResidentSheet
        open={changing !== null}
        data={data}
        unitId={changing}
        onClose={() => setChanging(null)}
        onDone={() => setChanging(null)}
      />
      <QuickUnitsBuilderSheet
        open={building}
        defaultFloors={data.profile?.floors}
        onClose={() => setBuilding(false)}
        onCreated={() => {
          setBuilding(false)
          void data.reload()
        }}
      />
    </div>
  )
}
