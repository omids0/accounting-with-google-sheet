import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import BuildingListFilters from './BuildingListFilters'
import ChangeResidentSheet from './ChangeResidentSheet'
import FilterChipBar from './FilterChipBar'
import ResidentRow from './ResidentRow'
import {
  buildResidentRows,
  residentCounts,
  RESIDENT_FILTERS,
  type ResidentFilter,
  type ResidentRowData
} from './residentRows'
import RowActionsSheet, { type RowAction } from './RowActionsSheet'
import { useBuildingSetupData } from './useBuildingSetupData'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useListFilters } from '../../hooks/useListFilters'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { getPathForTab, HIGHLIGHT_PARAM } from '../../routes/paths'
import { exitResident } from '../../services/buildingResidentActions'
import { getSettings, isConfigured } from '../../services/settings'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import ConfirmActionModal from '../ConfirmActionModal'
import EmptyState from '../EmptyState'
import SearchEmptyState from '../SearchEmptyState'
import { DangCardListSkeleton } from '../skeleton'
import { calmListClass } from '../ui/calmListStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

const searchParts = (row: ResidentRowData) => [row.name, row.phone, row.unit.number, row.roleText]

/** Who can leave: a tenant, or an owner who lives in the unit (the owner keeps owning it). */
const canExit = (row: ResidentRowData) =>
  row.current &&
  (row.stay.role === 'tenant' ||
    (row.stay.role === 'owner' && row.unit.occupancy === 'owner-resident'))

/**
 * «ساکنان»: one row per stay (a person in a unit with a role and the dates), chips for owners,
 * tenants and past stays. The «⋯» sheet calls, texts, opens the counterparty, changes the
 * resident or marks the exit; the last two need the `people` permission.
 */
export default function BuildingResidentsPage({ active = true }: { active?: boolean }) {
  const navigate = useNavigate()
  const data = useBuildingSetupData()
  const { can } = useBuildingAccess()
  const [filter, setFilter] = useState<ResidentFilter>('all')
  const [menu, setMenu] = useState<ResidentRowData | null>(null)
  /** The unit being changed; '' asks which unit («+ ساکن»). */
  const [changing, setChanging] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<ResidentRowData | null>(null)

  const canEdit = can('people')

  const { stays, units, persons } = data

  const rows = useMemo(
    () => buildResidentRows(stays, units, persons, filter),
    [stays, units, persons, filter]
  )

  const counts = useMemo(() => residentCounts(stays, units, persons), [stays, units, persons])

  const filters = useListFilters({ items: rows, getSearchParts: searchParts })

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات ساکنان',
      actions: createPageSpeedDialActions({
        onAdd: () => setChanging(''),
        addLabel: 'ساکن',
        onFilter: filters.openFilterModal,
        onRefresh: () => void data.reload()
      }).filter(action => !action.disabled && (canEdit || action.id !== 'add'))
    }),
    [canEdit, data, filters.openFilterModal]
  )

  useRegisterPageSpeedDial(isConfigured() ? speedDial : null, active)

  const confirmExit = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!leaving || !spreadsheetId) return
    try {
      await exitResident(spreadsheetId, leaving.unit, leaving.stay)
      await data.reload()
      showSuccess('خروج ثبت شد؛ واحد خالی است')
    } catch (err) {
      showError(toUserMessage(err, 'ثبت خروج ناموفق بود'))
    } finally {
      setLeaving(null)
    }
  }

  const actionsOf = (row: ResidentRowData): RowAction[] => {
    const phone = normalizeDigits(row.phone)

    return [
      ...(phone
        ? [
            { id: 'call', label: `تماس · ${row.phone}`, href: `tel:${phone}` },
            { id: 'sms', label: 'پیامک', href: `sms:${phone}` }
          ]
        : []),
      {
        id: 'person',
        label: 'صفحهٔ طرف حساب',
        onClick: () =>
          navigate(
            `${getPathForTab('building-counterparties')}?${HIGHLIGHT_PARAM}=${row.stay.personId}`
          )
      },
      ...(canEdit
        ? [
            {
              id: 'change',
              label: 'تغییر ساکن',
              onClick: () => setChanging(row.unit.id)
            }
          ]
        : []),
      ...(canEdit && canExit(row)
        ? [
            {
              id: 'exit',
              label: 'خروج (واحد خالی شود)',
              danger: true,
              onClick: () => setLeaving(row)
            }
          ]
        : [])
    ]
  }

  if (!data.loaded) return <DangCardListSkeleton filterBar />

  const shown = filters.filteredItems

  return (
    <div className={listModulePageClass}>
      <BuildingListFilters filters={filters} placeholder="جستجوی نام، تلفن یا واحد..." />
      <FilterChipBar
        ariaLabel="نوع ساکنان"
        value={filter}
        onChange={setFilter}
        options={RESIDENT_FILTERS.map(item => ({ ...item, count: counts[item.value] }))}
      />

      {!rows.length ? (
        filter === 'all' && !filters.hasActiveFilters ? (
          <EmptyState
            icon="counterparties"
            message="هنوز ساکنی ثبت نشده"
            description="مالک و مستأجر هر واحد از صفحهٔ واحدها یا قدم «مالک و ساکنان» راه‌اندازی ثبت می‌شود."
          />
        ) : (
          <SearchEmptyState />
        )
      ) : shown.length ? (
        <ul className={calmListClass}>
          {shown.map(row => (
            <ResidentRow key={row.stay.id} row={row} onMore={setMenu} />
          ))}
        </ul>
      ) : (
        <SearchEmptyState />
      )}

      <RowActionsSheet
        open={menu !== null}
        title={menu ? `${menu.name} · واحد ${menu.unit.number}` : ''}
        actions={menu ? actionsOf(menu) : []}
        onClose={() => setMenu(null)}
      />
      <ChangeResidentSheet
        open={changing !== null}
        data={data}
        unitId={changing || null}
        onClose={() => setChanging(null)}
        onDone={() => setChanging(null)}
      />
      <ConfirmActionModal
        open={leaving !== null}
        title="ثبت خروج"
        message={`خروج ${leaving?.name ?? ''} از واحد ${
          leaving?.unit.number ?? ''
        } ثبت شود؟ واحد خالی می‌شود.`}
        confirmLabel="ثبت خروج"
        cancelLabel="انصراف"
        onClose={() => setLeaving(null)}
        onConfirm={() => void confirmExit()}
      />
    </div>
  )
}
