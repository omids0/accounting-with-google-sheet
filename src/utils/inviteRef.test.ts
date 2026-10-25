import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  captureInviteRefFromUrl,
  clearPendingInviteRef,
  getPendingInviteRef,
  isInviteCode,
  setPendingInviteRef
} from './inviteRef'
import { createSession, saveSession } from '../services/auth'

const CODE = 'AbC123_-xY'

const openAt = (path: string) => window.history.replaceState({}, '', path)

beforeEach(() => {
  localStorage.clear()
  openAt('/')
})

afterEach(() => vi.useRealTimers())

describe('invite code', () => {
  it('accepts only the ten characters the worker hands out', () => {
    expect(isInviteCode(CODE)).toBe(true)
    expect(isInviteCode('short')).toBe(false)
    expect(isInviteCode('../../s:abc')).toBe(false)
    expect(isInviteCode(undefined)).toBe(false)
  })

  it('keeps a typed code and refuses a bad one', () => {
    expect(setPendingInviteRef(` ${CODE} `)).toBe(true)
    expect(getPendingInviteRef()).toBe(CODE)
    expect(setPendingInviteRef('nope')).toBe(false)
    clearPendingInviteRef()
    expect(getPendingInviteRef()).toBeNull()
  })

  it('forgets a code nobody signed in with for two weeks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01'))
    setPendingInviteRef(CODE)
    vi.setSystemTime(new Date('2026-10-16'))
    expect(getPendingInviteRef()).toBeNull()
  })
})

describe('captureInviteRefFromUrl', () => {
  it('remembers the code and removes only that parameter', () => {
    openAt(`/?share=1&text=hi&ref=${CODE}#top`)
    captureInviteRefFromUrl()

    expect(getPendingInviteRef()).toBe(CODE)
    expect(window.location.search).toBe('?share=1&text=hi')
    expect(window.location.hash).toBe('#top')
  })

  it('ignores a malformed code but still cleans the address', () => {
    openAt('/?ref=bad')
    captureInviteRefFromUrl()

    expect(getPendingInviteRef()).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('does nothing without a ref parameter', () => {
    openAt('/?action=sms')
    captureInviteRefFromUrl()

    expect(window.location.search).toBe('?action=sms')
  })

  it('does not treat someone already signed in as a newcomer', () => {
    saveSession(createSession('tok', { email: 'a@example.com', name: 'A' }))
    openAt(`/?ref=${CODE}`)
    captureInviteRefFromUrl()

    expect(getPendingInviteRef()).toBeNull()
    expect(window.location.search).toBe('')
  })
})
