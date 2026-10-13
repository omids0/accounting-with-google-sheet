import { describe, expect, it } from 'vitest'

import { anchoredPosition } from './useAnchoredPosition'

const viewport = { width: 390, height: 844 }

describe('anchoredPosition', () => {
  it('opens below the trigger with a 4px gap and a 320px cap', () => {
    const position = anchoredPosition({ top: 100, bottom: 144, left: 20, width: 350 }, viewport)

    expect(position).toEqual({ top: 148, left: 20, width: 350, maxHeight: 320 })
  })

  it('shrinks to the room left below the trigger', () => {
    const position = anchoredPosition({ top: 500, bottom: 544, left: 20, width: 350 }, viewport)

    expect(position.top).toBe(548)
    expect(position.maxHeight).toBe(844 - 548 - 8)
  })

  it('flips above when the room below is too small and the room above is larger', () => {
    const position = anchoredPosition({ top: 700, bottom: 744, left: 20, width: 350 }, viewport)

    expect(position.top).toBeUndefined()
    expect(position.bottom).toBe(844 - 700 + 4)
    expect(position.maxHeight).toBe(320)
  })

  it('stays below when both sides are tight but below is larger', () => {
    const position = anchoredPosition(
      { top: 100, bottom: 144, left: 20, width: 350 },
      { width: 390, height: 300 }
    )

    expect(position.top).toBe(148)
    expect(position.maxHeight).toBe(300 - 148 - 8)
  })

  it('clamps to the right and left edges of the viewport', () => {
    expect(anchoredPosition({ top: 0, bottom: 40, left: 300, width: 200 }, viewport)).toMatchObject(
      {
        left: 182,
        width: 200
      }
    )
    expect(anchoredPosition({ top: 0, bottom: 40, left: -30, width: 200 }, viewport).left).toBe(8)
    expect(anchoredPosition({ top: 0, bottom: 40, left: 0, width: 900 }, viewport).width).toBe(374)
  })
})
