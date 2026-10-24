import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { fetchStays, type StayWithRow } from '../../services/buildingResidents'
import { fetchUnits, type UnitWithRow } from '../../services/buildingUnits'
import { getSettings } from '../../services/settings'

/** The stays and units of the active building, read again after every sync. */
export function useStayUnits(): { stays: StayWithRow[]; units: UnitWithRow[] } {
  const revision = useDataRefresh()
  const [data, setData] = useState<{ stays: StayWithRow[]; units: UnitWithRow[] }>({
    stays: [],
    units: []
  })

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    let live = true

    void Promise.all([fetchStays(spreadsheetId), fetchUnits(spreadsheetId)])
      .then(([stays, units]) => live && setData({ stays, units }))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [revision])

  return data
}
