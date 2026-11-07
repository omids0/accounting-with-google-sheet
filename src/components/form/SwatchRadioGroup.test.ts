import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SwatchRadioGroup from './SwatchRadioGroup'

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

const PER_ROW = 5

let container: HTMLDivElement
let root: Root
let onChange: ReturnType<typeof vi.fn>

function render(value = 'a') {
  act(() => {
    root.render(
      createElement(SwatchRadioGroup, {
        label: 'رنگ',
        value,
        onChange,
        options: IDS.map(id => ({ value: id, label: id, background: '#000' }))
      })
    )
  })
}

const radios = () => Array.from(container.querySelectorAll<HTMLElement>('[role="radio"]'))

function press(key: string) {
  act(() => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('SwatchRadioGroup keyboard (RTL, two rows of five)', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    // jsdom has no layout: two rows of five, and the page direction is right-to-left.
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      const index = IDS.indexOf(this.dataset.value ?? '')

      return index < 0 ? 0 : Math.floor(index / PER_ROW) * 60
    })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      direction: 'rtl'
    } as CSSStyleDeclaration)
    onChange = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('has one tab stop: the checked swatch', () => {
    render('c')

    expect(
      radios()
        .filter(item => item.tabIndex === 0)
        .map(item => item.dataset.value)
    ).toEqual(['c'])
  })

  it('moves to the visual neighbour: left is the next in DOM order, right the previous', () => {
    render('a')
    radios()[0].focus()
    press('ArrowLeft')
    expect(document.activeElement).toBe(radios()[1])
    expect(onChange).toHaveBeenLastCalledWith('b')
    press('ArrowRight')
    expect(document.activeElement).toBe(radios()[0])
  })

  it('wraps sideways like a native radio group', () => {
    render('a')
    radios()[0].focus()
    press('ArrowRight')
    expect(document.activeElement).toBe(radios()[9])
    press('ArrowLeft')
    expect(document.activeElement).toBe(radios()[0])
  })

  it('jumps one row up and down instead of hopping between rows sideways', () => {
    render('a')
    radios()[2].focus()
    press('ArrowDown')
    expect(document.activeElement).toBe(radios()[7])
    press('ArrowUp')
    expect(document.activeElement).toBe(radios()[2])
  })

  it('stops at the first and last row for up and down', () => {
    render('a')
    radios()[2].focus()
    press('ArrowUp')
    expect(document.activeElement).toBe(radios()[2])
    radios()[7].focus()
    press('ArrowDown')
    expect(document.activeElement).toBe(radios()[7])
  })

  it('Home and End go to the first and last swatch', () => {
    render('a')
    radios()[3].focus()
    press('End')
    expect(document.activeElement).toBe(radios()[9])
    press('Home')
    expect(document.activeElement).toBe(radios()[0])
  })
})
