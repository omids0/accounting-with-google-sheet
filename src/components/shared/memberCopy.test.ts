import { describe, expect, it } from 'vitest'

import {
  assignableRoles,
  driveAccessLabel,
  driveAccessLine,
  inviteSheetTitle,
  inviteSheetNote,
  memberRoleLabel,
  membersIntro,
  removeMemberMessage
} from './memberCopy'

describe('member copy per workspace kind', () => {
  it('names the roles of each kind', () => {
    expect(memberRoleLabel('shared', 'partner')).toBe('شریک')
    expect(memberRoleLabel('shared', 'viewer')).toBe('ناظر')
    expect(memberRoleLabel('shared', 'owner')).toBe('مالک')
    expect(memberRoleLabel('building', 'accountant')).toBe('حسابدار')
    // A role the kind does not know reads as it is written (an older sheet).
    expect(memberRoleLabel('shared', 'manager')).toBe('manager')
  })

  it('titles the invite sheet: the building copy is unchanged', () => {
    expect(inviteSheetTitle('shared')).toBe('دعوت عضو')
    expect(inviteSheetTitle('building')).toBe('دعوت اعضا')
  })

  it('says what Drive access a role gets', () => {
    expect(driveAccessLabel('shared', 'viewer')).toBe('فقط مشاهده')
    expect(driveAccessLabel('shared', 'partner')).toBe('ویرایش')
    expect(driveAccessLabel('shared', 'owner')).toBe('ویرایش')
  })

  it('raises a shared viewer to «ویرایش» once a writing switch is on', () => {
    expect(driveAccessLabel('shared', 'viewer', { settle: true })).toBe('ویرایش')
    expect(driveAccessLabel('shared', 'viewer', { export: true })).toBe('فقط مشاهده')
    expect(driveAccessLabel('shared', 'viewer', { settle: false })).toBe('فقط مشاهده')
    // A partner whose writing switch was turned off still writes in Drive.
    expect(driveAccessLabel('shared', 'partner', { record: false })).toBe('ویرایش')
  })

  it('keeps the building line as it was: a switch never changes the Drive role there', () => {
    expect(driveAccessLabel('building', 'board', { record: true })).toBe('فقط مشاهده')
    expect(driveAccessLine('building', 'manager')).toBe('دسترسی ویرایش در گوگل‌درایو')
    expect(driveAccessLine('building', 'board', { record: true })).toBe('فقط مشاهده در گوگل‌درایو')
    expect(driveAccessLine('shared', 'viewer', { settle: true })).toBe(
      'دسترسی ویرایش در گوگل‌درایو'
    )
  })

  it('never offers «مالک» to a shared account, while a building keeps all its roles', () => {
    expect(assignableRoles('shared').map(role => role.value)).toEqual(['partner', 'viewer'])
    expect(assignableRoles('shared').map(role => role.label)).toEqual(['شریک', 'ناظر'])
    expect(assignableRoles('building').map(role => role.value)).toEqual([
      'manager',
      'accountant',
      'board'
    ])
  })

  it('keeps the building texts word for word', () => {
    expect(membersIntro('building')).toContain('همیشه حداقل یک مدیر لازم است.')
    expect(removeMemberMessage('building', 'a@b.c')).toBe(
      'دسترسی a@b.c قطع شود؟ او دیگر نقشی در این ساختمان ندارد و اشتراک فایل او در گوگل‌درایو هم برداشته می‌شود.'
    )
    expect(inviteSheetNote('building')).toContain('فایل ساختمان با نقش انتخابی‌اش')
  })

  it('speaks of the shared account, never of a building or a spouse', () => {
    for (const text of [
      membersIntro('shared'),
      removeMemberMessage('shared', 'a@b.c'),
      inviteSheetNote('shared')
    ]) {
      expect(text).not.toMatch(/ساختمان|مدیر |همسر/)
    }
    expect(inviteSheetNote('shared')).toContain('حساب مشترک')
    expect(removeMemberMessage('shared', 'a@b.c')).toContain('a@b.c')
  })
})
