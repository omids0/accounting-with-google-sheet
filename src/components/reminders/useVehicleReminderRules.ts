import { useState } from 'react'

import type { ReminderRule } from '../../types'

export function useVehicleReminderRules(initial?: {
  mileage?: ReminderRule
  deadline?: ReminderRule
}) {
  const [vehicleMileageRule, setVehicleMileageRule] = useState<ReminderRule>(
    initial?.mileage ?? {
      kind: 'vehicle-mileage',
      enabled: false,
      daysBefore: 0,
      hour: 9,
      minute: 0
    }
  )
  const [vehicleDeadlineRule, setVehicleDeadlineRule] = useState<ReminderRule>(
    initial?.deadline ?? {
      kind: 'vehicle-deadline',
      enabled: false,
      daysBefore: 14,
      hour: 9,
      minute: 0
    }
  )

  const applyFetchedRules = (rules: ReminderRule[]) => {
    const mileage = rules.find(item => item.kind === 'vehicle-mileage')
    const deadline = rules.find(item => item.kind === 'vehicle-deadline')

    if (mileage) setVehicleMileageRule(mileage)
    if (deadline) setVehicleDeadlineRule(deadline)
  }

  const updateVehicleMileageRule = (patch: Partial<ReminderRule>) => {
    setVehicleMileageRule(current => ({ ...current, ...patch }))
  }

  const updateVehicleDeadlineRule = (patch: Partial<ReminderRule>) => {
    setVehicleDeadlineRule(current => ({ ...current, ...patch }))
  }

  return {
    vehicleMileageRule,
    vehicleDeadlineRule,
    applyFetchedRules,
    updateVehicleMileageRule,
    updateVehicleDeadlineRule
  }
}

export type VehicleReminderSaveKind = 'vehicle-mileage' | 'vehicle-deadline'

export function resolveVehicleReminderRule(
  kind: VehicleReminderSaveKind,
  mileageRule: ReminderRule,
  deadlineRule: ReminderRule
): ReminderRule {
  return kind === 'vehicle-mileage' ? mileageRule : deadlineRule
}
