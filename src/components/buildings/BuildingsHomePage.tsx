import { useState } from 'react'
import { useSearchParams } from 'react-router'

import EmptyState from '../EmptyState'
import ArchivedBuildings from './ArchivedBuildings'
import BuildingCreateJourney from './BuildingCreateJourney'
import BuildingsHomeCurrent from './BuildingsHomeCurrent'
import BuildingWorkspaceCard from './BuildingWorkspaceCard'
import ConnectBuildingSheet from './ConnectBuildingSheet'
import { useBuildingsHome } from './useBuildingsHome'
import { useEnterBuilding } from './useEnterBuilding'
import { useIsBuildingWorkspace } from '../../hooks/useWorkspaceType'
import { getSettings } from '../../services/settings'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import SharedSpaceSection from '../shared/SharedSpaceSection'
import Button from '../ui/Button'
import { listModulePageClass } from '../ui/featureCardStyles'

/** `?new=1` opens steps 1 and 2 of the setup journey in place of the list. */
const NEW_PARAM = 'new'

/**
 * «فضاهای من»: one card per building (each its own spreadsheet), «+ ساختمان جدید» for the setup
 * journey and «اتصال به شیت موجود» for a sheet someone shared. It opens from the personal
 * workspace and, through the drawer's «همهٔ ساختمان‌ها…», from inside a building. Below the
 * buildings sits the opt-in «حساب مشترک» card.
 */
export default function BuildingsHomePage() {
  const [params, setParams] = useSearchParams()
  const home = useBuildingsHome()
  const { enter, modalProps } = useEnterBuilding()
  const [connecting, setConnecting] = useState(false)
  const inBuilding = useIsBuildingWorkspace()
  const activeId = getSettings()?.spreadsheetId ?? ''

  if (params.get(NEW_PARAM) === '1') {
    return <BuildingCreateJourney onCancel={() => setParams({}, { replace: true })} />
  }

  // Task 6 connects the setup wizard here.
  const startShared = () => undefined

  const startNew = () => setParams({ [NEW_PARAM]: '1' })

  const empty = home.buildings.length === 0

  return (
    <div className={listModulePageClass}>
      {inBuilding ? <BuildingsHomeCurrent /> : null}
      {empty ? (
        <EmptyState
          icon="building"
          message="هنوز ساختمانی نداری"
          description="هر ساختمان یک دفتر جدا می‌شود: صندوق، واحدها، ساکنان و هزینه‌هایش از حساب شخصی‌ات کاملاً جداست و می‌توانی با هیئت مدیره به اشتراک بگذاری."
          action={{ label: 'ساختمان جدید', onClick: startNew }}
          secondaryAction={{ label: 'اتصال به شیت موجود', onClick: () => setConnecting(true) }}
        />
      ) : (
        <>
          {home.buildings.map(entry => (
            <BuildingWorkspaceCard
              key={entry.id}
              entry={entry}
              summary={home.summaries[entry.id] ?? null}
              onEnter={() => void enter(entry.id)}
              current={inBuilding && entry.id === activeId}
            />
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={startNew}>
              + ساختمان جدید
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConnecting(true)}>
              اتصال به شیت موجود
            </Button>
          </div>
        </>
      )}

      <SharedSpaceSection onStart={startShared} />

      <ArchivedBuildings entries={home.archived} onRestore={home.restore} />

      <ConnectBuildingSheet
        open={connecting}
        candidates={home.connectable}
        onClose={() => setConnecting(false)}
        onConnected={id => {
          home.reloadEntries()
          void enter(id)
        }}
      />
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
