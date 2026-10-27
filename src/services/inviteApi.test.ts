import { beforeEach, describe, expect, it, vi } from 'vitest'

import { claimPendingInvite } from './inviteApi'
import { getPendingInviteRef, setPendingInviteRef } from '../utils/inviteRef'

const worker = vi.hoisted(() => ({ url: 'https://worker.example', postJson: vi.fn() }))

vi.mock('./authWorker', () => ({
  authWorkerUrl: () => worker.url,
  postJson: worker.postJson
}))

const CODE = 'AbC123_-xY'

const reply = (status: number) => new Response('{}', { status })

beforeEach(() => {
  localStorage.clear()
  worker.url = 'https://worker.example'
  worker.postJson.mockReset()
  setPendingInviteRef(CODE)
})

describe('claimPendingInvite', () => {
  it('sends the code and the token once and then forgets the code', async () => {
    worker.postJson.mockResolvedValue(reply(200))

    await claimPendingInvite('tok')

    expect(worker.postJson).toHaveBeenCalledWith(
      '/invite/claim',
      expect.objectContaining({ accessToken: 'tok', ref: CODE }),
      true
    )
    expect(getPendingInviteRef()).toBeNull()
  })

  it('drops a code the worker refuses as invalid', async () => {
    worker.postJson.mockResolvedValue(reply(400))
    await claimPendingInvite('tok')

    expect(getPendingInviteRef()).toBeNull()
  })

  it.each([404, 401, 500])('keeps the code for the next sign-in after a %i', async status => {
    worker.postJson.mockResolvedValue(reply(status))
    await claimPendingInvite('tok')

    expect(getPendingInviteRef()).toBe(CODE)
  })

  it('keeps the code and does not throw when the network fails', async () => {
    worker.postJson.mockRejectedValue(new Error('offline'))

    await expect(claimPendingInvite('tok')).resolves.toBeUndefined()
    expect(getPendingInviteRef()).toBe(CODE)
  })

  it('does nothing without a code or without a worker', async () => {
    worker.url = ''
    await claimPendingInvite('tok')
    localStorage.clear()
    worker.url = 'https://worker.example'
    await claimPendingInvite('tok')

    expect(worker.postJson).not.toHaveBeenCalled()
  })
})
