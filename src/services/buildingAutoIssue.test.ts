import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runAutoIssue } from './buildingAutoIssue'
import { formatIssueMarker } from './buildingIssueGuard'
import type { BuildingProfile } from './buildingTemplate'
import { newUnit } from './buildingUnits'
import type { Receivable } from '../types'

const state = vi.hoisted(() => ({
  role: true,
  journey: null as { finished: boolean } | null,
  placeholders: 0,
  receivables: [] as unknown[],
  marker: '',
  issued: [] as { month: string; due: string }[],
  markerWrites: [] as string[],
  calls: [] as string[]
}))

vi.mock('./workspace', () => ({ getActiveWorkspaceType: () => 'building' }))
vi.mock('./buildingRoles', () => ({ can: () => state.role }))
vi.mock('./buildingJourney', () => ({
  readJourney: () => state.journey,
  isJourneyUnfinished: (journey: { finished: boolean } | null) =>
    journey !== null && !journey.finished
}))
vi.mock('./buildingProfile', () => ({
  getBuildingProfile: (): BuildingProfile => ({
    name: 'نرگس',
    address: '',
    floors: 1,
    defaultCharge: 1_000_000,
    chargeMethod: 'fixed',
    issueDay: 1,
    dueDay: 10,
    vacancyRule: 'full'
  })
}))
vi.mock('./buildingUnits', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./buildingUnits')),
  fetchUnits: async () => [{ ...newUnit({ number: '1' }, ''), rowNumber: 2, id: 'u1' }]
}))
vi.mock('./buildingResidents', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./buildingResidents')),
  fetchStays: async () => []
}))
vi.mock('./counterparties', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('./counterparties')),
  fetchCounterparties: async () => []
}))
vi.mock('./receivablesCrud', () => ({ fetchReceivables: async () => state.receivables }))
vi.mock('./periodSettings', () => ({
  getPeriodSetting: async () => state.marker,
  setPeriodSetting: async (_id: string, _key: string, value: string) => {
    state.markerWrites.push(value)
    state.marker = value
  }
}))
vi.mock('./sheetSync', () => ({
  flushOutbox: async () => {
    state.calls.push('flush')
  },
  fullSyncFromRemote: async () => {
    state.calls.push('sync')
  }
}))
vi.mock('./buildingChargeActions', () => ({
  removeDuplicateCharges: async () => 0,
  issueCharges: async (_id: string, plan: { monthKey: string }, due: string) => {
    state.issued.push({ month: plan.monthKey, due })

    return 1
  }
}))
vi.mock('../components/buildings/buildingSetup', () => ({
  placeholderOwnerCount: () => state.placeholders
}))
vi.mock('../utils/jalaliDate', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('../utils/jalaliDate')),
  // 1405-07-28 (Mehr 28).
  getTodayIso: () => '2026-10-20'
}))
vi.mock('../utils/toast', () => ({ showSuccess: vi.fn(), showError: vi.fn() }))

const charge = (monthKey: string): Receivable => ({
  id: monthKey,
  createdAt: '',
  title: '',
  debtor: '',
  category: '',
  amount: 1,
  borrowDate: '',
  note: '',
  payments: [],
  reference: `charge:u1:${monthKey}`
})

beforeEach(() => {
  localStorage.clear()
  Object.assign(state, {
    role: true,
    journey: null,
    placeholders: 0,
    receivables: [charge('1405-05')],
    marker: '',
    issued: [],
    markerWrites: [],
    calls: []
  })
})

describe('runAutoIssue', () => {
  it('catches up every missing month with the due day, after writing the marker and syncing', async () => {
    expect(await runAutoIssue('b1')).toBe(2)

    expect(state.issued).toEqual([
      { month: '1405-06', due: expect.any(String) },
      { month: '1405-07', due: expect.any(String) }
    ])
    expect(state.markerWrites).toHaveLength(1)
    expect(state.markerWrites[0]).toMatch(/^1405-07@.+@\d{4}-/)
    expect(state.calls).toEqual(['flush', 'sync'])
  })

  it('runs once per building per day', async () => {
    await runAutoIssue('b1')

    expect(await runAutoIssue('b1')).toBe(0)
    expect(state.issued).toHaveLength(2)
  })

  it('waits while another device issued the month less than two minutes ago', async () => {
    state.marker = formatIssueMarker({
      monthKey: '1405-07',
      deviceId: 'other-device',
      at: new Date(Date.now() - 30_000).toISOString()
    })

    expect(await runAutoIssue('b1')).toBe(0)
    expect(state.issued).toEqual([])
    expect(state.markerWrites).toEqual([])
  })

  it('goes ahead when the other marker is old', async () => {
    state.marker = formatIssueMarker({
      monthKey: '1405-07',
      deviceId: 'other-device',
      at: new Date(Date.now() - 10 * 60_000).toISOString()
    })

    expect(await runAutoIssue('b1')).toBe(2)
  })

  it('does nothing for a role without autoIssue, before the first issue, during the journey or with placeholder owners', async () => {
    state.role = false
    expect(await runAutoIssue('b1')).toBe(0)

    state.role = true
    state.receivables = []
    expect(await runAutoIssue('b1')).toBe(0)

    state.receivables = [charge('1405-05')]
    state.journey = { finished: false }
    expect(await runAutoIssue('b1')).toBe(0)

    state.journey = null
    state.placeholders = 1
    expect(await runAutoIssue('b1')).toBe(0)

    expect(state.issued).toEqual([])
    expect(state.markerWrites).toEqual([])
  })

  it('does nothing when every month is already issued', async () => {
    state.receivables = [charge('1405-07')]

    expect(await runAutoIssue('b1')).toBe(0)
    expect(state.markerWrites).toEqual([])
  })
})
