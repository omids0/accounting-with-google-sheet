import { useEffect, useMemo, useState } from 'react'

import { buildUnitRows, debtorsFirst } from './unitRows'
import type { BuildingSetupData } from './useBuildingSetupData'
import { formatSignedMoney } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { FormSelect } from '../form'
import FormModal from '../FormModal'

interface PickUnitSheetProps {
  open: boolean
  data: BuildingSetupData
  onClose: () => void
  onPick: (unitId: string) => void
}

/**
 * «ثبت واریزی شارژ» from the dashboard: which unit paid. Debtors come first and the one owing
 * the most is preselected; the payment sheet (Step 4) opens for the pick.
 */
export default function PickUnitSheet({ open, data, onClose, onPick }: PickUnitSheetProps) {
  const rows = useMemo(() => debtorsFirst(buildUnitRows(data)), [data])
  const [unitId, setUnitId] = useState('')

  useEffect(() => {
    if (open) setUnitId(rows[0]?.unit.id ?? '')
    // Preselect when the sheet opens; the list may refresh while the manager is choosing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const options = rows.map(row => ({
    value: row.unit.id,
    label: [
      `واحد ${toPersianDigits(row.unit.number)}`,
      row.resident?.name || 'خالی',
      row.balance.open > 0 ? formatSignedMoney(-row.balance.open) : ''
    ]
      .filter(Boolean)
      .join(' · ')
  }))

  return (
    <FormModal
      open={open}
      title="کدام واحد پرداخت کرد؟"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        if (unitId) onPick(unitId)
      }}
      saveLabel="ادامه"
      saveDisabled={!unitId}
    >
      <FormSelect label="واحد" value={unitId} onChange={setUnitId} options={options} />
    </FormModal>
  )
}
