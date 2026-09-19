import { useState } from 'react'

import type { ReminderRule } from '../../types'

export function useVehicleReminderRules(initial?: {
  mileage?: ReminderRule
  deadline?: ReminderRule
  periodic?: ReminderRule
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
  const [vehiclePeriodicRule, setVehiclePeriodicRule] = useState<ReminderRule>(
    initial?.periodic ?? {
      kind: 'vehicle-periodic-service',
      enabled: false,
      daysBefore: 0,
      hour: 9,
      minute: 0
    }
  )

  const applyFetchedRules = (rules: ReminderRule[]) => {
    const mileage = rules.find(item => item.kind === 'vehicle-mileage')
    const deadline = rules.find(item => item.kind === 'vehicle-deadline')
    const periodic = rules.find(item => item.kind === 'vehicle-periodic-service')

    if (mileage) setVehicleMileageRule(mileage)
    if (deadline) setVehicleDeadlineRule(deadline)
    if (periodic) setVehiclePeriodicRule(periodic)
  }

  const updateVehicleMileageRule = (patch: Partial<ReminderRule>) => {
    setVehicleMileageRule(current => ({ ...current, ...patch }))
  }

  const updateVehicleDeadlineRule = (patch: Partial<ReminderRule>) => {
    setVehicleDeadlineRule(current => ({ ...current, ...patch }))
  }

  const updateVehiclePeriodicRule = (patch: Partial<ReminderRule>) => {
    setVehiclePeriodicRule(current => ({ ...current, ...patch }))
  }

  return {
    vehicleMileageRule,
    vehicleDeadlineRule,
    vehiclePeriodicRule,
    applyFetchedRules,
    updateVehicleMileageRule,
    updateVehicleDeadlineRule,
    updateVehiclePeriodicRule
  }
}

export type VehicleReminderSaveKind =
  | 'vehicle-mileage'
  | 'vehicle-deadline'
  | 'vehicle-periodic-service'

export function resolveVehicleReminderRule(
  kind: VehicleReminderSaveKind,
  mileageRule: ReminderRule,
  deadlineRule: ReminderRule,
  periodicRule: ReminderRule
): ReminderRule {
  if (kind === 'vehicle-mileage') return mileageRule
  if (kind === 'vehicle-deadline') return deadlineRule

  return periodicRule
}
