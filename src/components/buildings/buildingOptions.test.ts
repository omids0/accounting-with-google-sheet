import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_TYPES,
  BUILDING_ROLES,
  CHARGE_METHODS,
  DAYS_1_28,
  OCCUPANCY,
  optionLabel,
  RESIDENT_ROLES,
  SPLIT_MODES,
  VACANCY_RULES
} from './buildingOptions'

describe('building option registry', () => {
  it('fixes the logic keys of every list', () => {
    expect(RESIDENT_ROLES.map(o => o.value)).toEqual(['owner', 'tenant'])
    expect(OCCUPANCY.map(o => o.value)).toEqual(['owner-resident', 'tenant', 'vacant'])
    expect(CHARGE_METHODS.map(o => o.value)).toEqual(['fixed', 'area', 'people'])
    expect(VACANCY_RULES.map(o => o.value)).toEqual(['full', 'half', 'zero'])
    expect(SPLIT_MODES.map(o => o.value)).toEqual(['equal', 'area', 'people', 'manual'])
    expect(ACCOUNT_TYPES.map(o => o.value)).toEqual(['bank', 'cash'])
    expect(BUILDING_ROLES.map(o => o.value)).toEqual(['manager', 'accountant', 'board'])
  })

  it('keeps the part of the charge a vacant unit pays in the rule', () => {
    expect(VACANCY_RULES.map(option => option.rule)).toEqual([1, 0.5, 0])
  })

  it('offers days 1 to 28 for the issue and due days', () => {
    expect(DAYS_1_28).toHaveLength(28)
    expect(DAYS_1_28[0].value).toBe('1')
    expect(DAYS_1_28.at(-1)?.value).toBe('28')
  })

  it('labels each value in Persian and has no repeated key or label', () => {
    for (const list of [
      RESIDENT_ROLES,
      OCCUPANCY,
      CHARGE_METHODS,
      VACANCY_RULES,
      SPLIT_MODES,
      ACCOUNT_TYPES,
      BUILDING_ROLES
    ]) {
      expect(new Set(list.map(o => o.value)).size).toBe(list.length)
      expect(new Set(list.map(o => o.label)).size).toBe(list.length)
      expect(list.every(o => /[؀-ۿ]/.test(o.label))).toBe(true)
    }
  })

  it('resolves a label and falls back to the raw value for an older sheet', () => {
    expect(optionLabel(BUILDING_ROLES, 'board')).toBe('عضو هیئت مدیره')
    expect(optionLabel(BUILDING_ROLES, 'legacy')).toBe('legacy')
  })
})
