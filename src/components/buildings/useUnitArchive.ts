import { useState } from 'react'

import type { BuildingSetupData } from './useBuildingSetupData'
import { archiveUnit, restoreUnit } from '../../services/buildingUnitActions'
import type { UnitWithRow } from '../../services/buildingUnits'
import { getSettings } from '../../services/settings'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

/**
 * Archive / restore of a unit (the «بایگانی» and «بازگردانی» row actions): `archiving` is the unit
 * waiting for the manager's confirmation. A unit with an open balance is refused with the reason.
 */
export function useUnitArchive(data: Pick<BuildingSetupData, 'allUnits' | 'reload'>) {
  const [archiving, setArchiving] = useState<UnitWithRow | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (work: (spreadsheetId: string) => Promise<string | null>, done: string) => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return
    setBusy(true)
    try {
      const refusal = await work(spreadsheetId)

      if (refusal) showError(refusal)
      else {
        await data.reload()
        showSuccess(done)
      }
    } catch (err) {
      showError(toUserMessage(err, 'ذخیره نشد'))
    } finally {
      setBusy(false)
      setArchiving(null)
    }
  }

  return {
    archiving,
    busy,
    askArchive: setArchiving,
    cancel: () => setArchiving(null),
    confirmArchive: () =>
      archiving
        ? run(
            id => archiveUnit(id, archiving),
            `واحد ${toPersianDigits(archiving.number)} بایگانی شد`
          )
        : Promise.resolve(),
    restore: (unit: UnitWithRow) =>
      run(id => restoreUnit(id, unit, data.allUnits), `واحد ${toPersianDigits(unit.number)} برگشت`)
  }
}
