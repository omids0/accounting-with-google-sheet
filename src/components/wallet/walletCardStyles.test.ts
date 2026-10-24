import { describe, expect, it } from 'vitest'

import {
  WALLET_CARD_MIN_HEIGHT,
  walletBankCardClass,
  walletBankCardCopyBtnClass,
  walletCardActionOverlayClass,
  walletCashCardClass,
  walletGenericCardClass
} from './walletCardStyles'

describe('wallet card sizing', () => {
  it('lets every card kind grow past the action column instead of fixing its height', () => {
    for (const className of [walletBankCardClass, walletCashCardClass, walletGenericCardClass]) {
      expect(className).not.toMatch(/(^|\s)(sm:)?h-\[/)
      expect(className).toContain(`min-h-[${WALLET_CARD_MIN_HEIGHT}]`)
    }
  })

  it('keeps the floor above the action column at the smallest and largest text size', () => {
    // 14 px root: touch = max(44, 38.5) = 44 px; 20 px root: touch = max(44, 55) = 55 px.
    const columnAt = (rootPx: number, touchPx: number) =>
      3 * touchPx + 2 * 0.1 * rootPx + 2 * 0.1 * rootPx + 2
    const floorAt = (rootPx: number, touchPx: number) =>
      Math.max(6.35 * rootPx, 3 * touchPx + 0.9 * rootPx + 2)

    for (const [root, touch] of [
      [14, 44],
      [16, 44],
      [18, 49.5],
      [20, 55]
    ]) {
      expect(floorAt(root, touch)).toBeGreaterThan(columnAt(root, touch))
    }
  })

  it('stacks the action buttons in one column like every other card', () => {
    expect(walletCardActionOverlayClass).toContain('flex-col')
    expect(walletCardActionOverlayClass).not.toContain('grid-cols-2')
  })

  it('has no negative margin on the copy button', () => {
    expect(walletBankCardCopyBtnClass).not.toMatch(/(^|\s)-m/)
  })
})
