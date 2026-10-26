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

  it('links a «چک» by its direction and a «قسط» to installment books', () => {
    expect(linkTargetKindFor('expense', 'چک')?.id).toBe('checkPaid')
    expect(linkTargetKindFor('income', 'چک')?.id).toBe('checkReceived')
    expect(linkTargetKindFor('expense', 'قسط')?.id).toBe('installment')
    expect(linkTargetKindFor('income', 'قسط')).toBeNull()
  })

  it('tells how each kind meets the amount: debts cap, checks match, installments warn', () => {
    expect(linkTargetKindFor('expense', 'بدهی')?.fit).toBe('cap')
    expect(linkTargetKindFor('expense', 'چک')?.fit).toBe('exact')
    expect(linkTargetKindFor('expense', 'قسط')?.fit).toBe('warn')
    expect(linkTargetKindFor('expense', 'قسط')?.childLabel).toBe('کدام قسط؟')
    expect(linkTargetKindFor('expense', 'چک')?.childLabel).toBeUndefined()
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
    expect(isLinkTargetCategory('expense', 'چک')).toBe(false)
    expect(isLinkTargetCategory('income', 'چک')).toBe(false)
    expect(isLinkTargetCategory('expense', 'قسط')).toBe(false)
  })

  it('tells bulk saves which categories need the question', () => {
    expect(isLinkTargetCategory('expense', 'بدهی')).toBe(true)
    expect(isLinkTargetCategory('expense', 'چک')).toBe(true)
    expect(isLinkTargetCategory('income', 'چک')).toBe(true)
    expect(isLinkTargetCategory('expense', 'قسط')).toBe(true)
    expect(isLinkTargetCategory('expense', 'خوراک')).toBe(false)
  })
})
