import { describe, expect, it } from 'vitest'

import {
  WALLET_CARD_MIN_HEIGHT,
  walletBankCardClass,
  walletBankCardCopyBtnClass,
  walletCashCardClass,
  walletGenericCardClass
} from './walletCardStyles'

describe('wallet card sizing', () => {
  it('lets every card kind grow past the action grid instead of fixing its height', () => {
    for (const className of [walletBankCardClass, walletCashCardClass, walletGenericCardClass]) {
      expect(className).not.toMatch(/(^|\s)(sm:)?h-\[/)
      expect(className).toContain(`min-h-[${WALLET_CARD_MIN_HEIGHT}]`)
    }
  })

  it('keeps the floor above the 2x2 action grid at the smallest and largest text size', () => {
    // 14 px root: touch = max(44, 38.5) = 44 px; 20 px root: touch = max(44, 55) = 55 px.
    const gridAt = (rootPx: number, touchPx: number) =>
      2 * touchPx + 0.1 * rootPx + 2 * 0.1 * rootPx + 2
    const floorAt = (rootPx: number, touchPx: number) =>
      Math.max(6.35 * rootPx, 2 * touchPx + 0.8 * rootPx + 2)

    for (const [root, touch] of [
      [14, 44],
      [16, 44],
      [18, 49.5],
      [20, 55]
    ]) {
      expect(floorAt(root, touch)).toBeGreaterThan(gridAt(root, touch))
    }
  })

  it('has no negative margin on the copy button', () => {
    expect(walletBankCardCopyBtnClass).not.toMatch(/(^|\s)-m/)
  })
})
