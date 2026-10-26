import { beforeEach, describe, expect, it, vi } from 'vitest'

const workspace = vi.hoisted(() => ({ personal: true }))

vi.mock('../services/workspace', () => ({ isPersonalWorkspace: () => workspace.personal }))

const { isLinkTargetCategory, linkTargetKindFor } = await import('./linkTargetKinds')

describe('linkTargetKindFor', () => {
  beforeEach(() => {
    workspace.personal = true
  })

  it('links an expense «بدهی» to debts and an income «طلب» to receivables', () => {
    expect(linkTargetKindFor('expense', 'بدهی')?.id).toBe('dang')
    expect(linkTargetKindFor('income', 'طلب')?.id).toBe('receivable')
  })

  it('ignores the category in the other record type and every other category', () => {
    expect(linkTargetKindFor('income', 'بدهی')).toBeNull()
    expect(linkTargetKindFor('expense', 'طلب')).toBeNull()
    expect(linkTargetKindFor('expense', 'خوراک')).toBeNull()
    expect(linkTargetKindFor('expense', '')).toBeNull()
  })

  it('trims the category like the locked-category checks do', () => {
    expect(linkTargetKindFor('expense', ' بدهی ')?.id).toBe('dang')
  })

  it('offers nothing in a building or a shared account', () => {
    workspace.personal = false
    expect(linkTargetKindFor('expense', 'بدهی')).toBeNull()
    expect(isLinkTargetCategory('income', 'طلب')).toBe(false)
  })

  it('tells bulk saves which categories need the question', () => {
    expect(isLinkTargetCategory('expense', 'بدهی')).toBe(true)
    expect(isLinkTargetCategory('expense', 'خوراک')).toBe(false)
  })
})
