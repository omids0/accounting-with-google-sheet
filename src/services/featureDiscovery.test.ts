import { beforeEach, describe, expect, it, vi } from 'vitest'

const sheets: Record<string, string[][] | null> = {}

vi.mock('./spreadsheetStore', () => ({
  getSheetDataRows: (_id: string, name: string) => sheets[name] ?? null
}))
vi.mock('./settings', () => ({
  getSettings: () => ({ forms: [{ id: 'e', sheetName: 'هزینه', type: 'expense' }] })
}))
vi.mock('./wallet', () => ({ WALLET_SHEET: 'کیف پول' }))
vi.mock('./checks', () => ({ CHECKS_SHEET: 'چک‌ها' }))
vi.mock('./dangSplit', () => ({ DANG_SPLIT_GROUPS_SHEET: 'گروه_دنگ' }))
vi.mock('./personalReminders', () => ({ PERSONAL_REMINDERS_SHEET: 'مواعد_شخصی' }))
vi.mock('./timesheetRow', () => ({ TIMESHEETS_SHEET: 'تایم‌شیت‌ها' }))
vi.mock('./vehicleProfiles', () => ({ VEHICLES_SHEET: 'خودرو' }))

const discovery = await import('./featureDiscovery')
const onboarding = await import('./onboarding')

const ID = 'sheet-1'
const STEPS = onboarding.getOnboardingSteps(false)
const rows = (count: number) => Array.from({ length: count }, (_, i) => [`r${i}`, '1'])

function setSheets(next: Record<string, string[][] | null>) {
  for (const key of Object.keys(sheets)) delete sheets[key]
  Object.assign(sheets, next)
}

describe('feature discovery', () => {
  beforeEach(() => {
    localStorage.clear()
    setSheets({ 'کیف پول': [], هزینه: rows(5) })
  })

  it('is eligible for an established user who never saw onboarding', () => {
    expect(discovery.isDiscoveryEligible(ID, STEPS)).toBe(true)
  })

  it('waits for enough records or the grace period', () => {
    setSheets({ 'کیف پول': [], هزینه: rows(2) })
    onboarding.startOnboarding(ID)
    onboarding.finishOnboarding(ID)

    const closedAt = onboarding.getOnboardingState(ID)!.closedAt!

    expect(discovery.isDiscoveryEligible(ID, STEPS, closedAt + 1000)).toBe(false)
    expect(discovery.isDiscoveryEligible(ID, STEPS, closedAt + discovery.DISCOVERY_GRACE_MS)).toBe(
      true
    )
  })

  it('never competes with an unfinished onboarding', () => {
    onboarding.startOnboarding(ID)
    expect(discovery.isDiscoveryEligible(ID, STEPS)).toBe(false)
    onboarding.pauseOnboarding(ID)
    expect(discovery.isDiscoveryEligible(ID, STEPS)).toBe(false)
  })

  it('drops features that already have data', () => {
    setSheets({ 'کیف پول': [], هزینه: rows(5), خودرو: [['پراید']], 'چک‌ها': [['', '']] })

    const ids = discovery.getDiscoveryQueue(ID).map(feature => feature.id)

    expect(ids).not.toContain('vehicle')
    expect(ids).toContain('checks')
  })

  it('disappears when every feature is in use', () => {
    setSheets({
      'کیف پول': [],
      هزینه: rows(5),
      خودرو: rows(1),
      مواعد_شخصی: rows(1),
      'چک‌ها': rows(1),
      گروه_دنگ: rows(1),
      'تایم‌شیت‌ها': rows(1)
    })
    expect(discovery.isDiscoveryEligible(ID, STEPS)).toBe(false)
  })

  it('stays hidden once dismissed and remembers the index', () => {
    discovery.setDiscoveryIndex(ID, 3)
    expect(discovery.getDiscoveryIndex(ID)).toBe(3)
    discovery.dismissDiscovery(ID)
    expect(discovery.isDiscoveryEligible(ID, STEPS)).toBe(false)
    expect(discovery.getDiscoveryIndex(ID)).toBe(3)
  })
})
