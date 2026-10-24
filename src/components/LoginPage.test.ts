import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LoginPage from './LoginPage'

vi.mock('../services/googleAuthNative', () => ({
  isNativePlatform: () => false,
  signInNative: vi.fn(),
  signOutNative: vi.fn()
}))

const render = (reason?: 'expired') =>
  renderToStaticMarkup(createElement(LoginPage, { onSuccess: () => undefined, reason }))

describe('LoginPage sign-in states', () => {
  beforeEach(() => {
    delete window.google
    localStorage.clear()
  })

  it('shows a labelled, disabled button with a spinner while Google loads', () => {
    const html = render()

    expect(html).toContain('ورود با Google')
    expect(html).toContain('disabled=""')
    expect(html).toContain('animate-spin')
  })

  it('shows the enabled Google button once the script is there', () => {
    window.google = { accounts: { oauth2: {} } } as unknown as Window['google']

    const html = render()

    expect(html).toContain('ورود با Google')
    expect(html).not.toContain('disabled=""')
    expect(html).toContain('<svg width="20"')
  })

  it('shows the expired notice together with the sign-in button, never an empty box', () => {
    const html = render('expired')

    expect(html).toContain('نشست شما منقضی شده.')
    expect(html).toContain('ورود با Google')
    expect(html).not.toContain('ویژگی‌های اصلی')
  })
})
