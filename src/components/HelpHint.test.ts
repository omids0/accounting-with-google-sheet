import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import HelpHint from './HelpHint'
import { closeTopOverlay, getOverlayCount } from '../hooks/overlayStack'

describe('HelpHint', () => {
  let container: HTMLDivElement

  let root: Root

  const action = vi.fn()

  const trigger = (index = 0) =>
    container.querySelectorAll<HTMLButtonElement>('button.help-hint')[index]

  const popover = () => document.body.querySelector<HTMLElement>('[role="dialog"]')

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() =>
      root.render(
        createElement(
          'div',
          null,
          createElement(HelpHint, {
            title: 'خالص دوره',
            text: 'درآمد منهای هزینه.',
            actions: [{ label: 'بیشتر', onClick: action }]
          }),
          createElement(HelpHint, { title: 'تطبیق', text: 'اصلاح اختلاف.' })
        )
      )
    )
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    action.mockReset()
  })

  it('names the trigger and toggles the popover with aria-expanded', () => {
    expect(trigger().getAttribute('aria-label')).toBe('راهنما: خالص دوره')
    expect(trigger().getAttribute('aria-expanded')).toBe('false')

    act(() => trigger().click())

    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(popover()?.textContent).toContain('درآمد منهای هزینه.')
    expect(document.activeElement).toBe(popover())

    act(() => trigger().click())

    expect(popover()).toBeNull()
  })

  it('closes on Escape and returns focus to the trigger', () => {
    act(() => trigger().click())
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(popover()).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('closes on a tap outside', () => {
    act(() => trigger().click())
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })

    expect(popover()).toBeNull()
  })

  it('closes on the back button through the overlay stack', () => {
    act(() => trigger().click())

    expect(getOverlayCount()).toBe(1)

    act(() => {
      closeTopOverlay()
    })

    expect(popover()).toBeNull()
    expect(getOverlayCount()).toBe(0)
  })

  it('keeps only one hint open', () => {
    act(() => trigger(0).click())
    act(() => trigger(1).click())

    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(popover()?.textContent).toContain('اصلاح اختلاف.')
  })

  it('runs an action and closes', () => {
    act(() => trigger().click())
    act(() => popover()?.querySelector('button')?.click())

    expect(action).toHaveBeenCalledOnce()
    expect(popover()).toBeNull()
  })
})
