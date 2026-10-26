/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Click actions of «اعضا»: the inline member card, the invite sheet, removal, backup, leaving. */
Object.assign(A, {
  expand: function (el) {
    S.expanded = S.expanded === el.dataset.v ? '' : el.dataset.v
  },
  perm: function (el) {
    var parts = el.dataset.v.split('|'),
      m = member(parts[0]),
      p = parts[1]
    var next = !can(p, m)
    // A value equal to the role default is not stored.
    if (next === !!DEF[m.role][p]) delete m.ov[p]
    else m.ov[p] = next ? 1 : 0
  },
  resetPerms: function (el) {
    member(el.dataset.v).ov = {}
  },
  markActive: function (el) {
    member(el.dataset.v).st = 'active'
  },
  resend: function (el) {
    toast(`دعوت‌نامه برای ${el.dataset.v} فرستاده شد`)
  },
  removeAsk: function (el) {
    S.sheet = { kind: 'remove', id: el.dataset.v }
  },
  removeDo: function () {
    var m = member(S.sheet.id)
    S.members.splice(S.members.indexOf(m), 1)
    S.space[m.role === 'partner' ? 'partner' : 'viewer'] = 'none'
    S.sheet = null
  },
  invite: function () {
    S.inv = { email: '', role: '', err: '' }
    S.sheet = { kind: 'invite' }
  },
  invAdd: function () {
    var inv = S.inv,
      email = inv.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) inv.err = 'ایمیل گوگل را درست وارد کنید'
    else if (email === me()) inv.err = 'این ایمیل خود شماست و از قبل عضو حساب مشترک هستید'
    else if (member(email)) inv.err = 'این ایمیل از قبل عضو است؛ نقشش را از فهرست اعضا عوض کنید'
    else inv.err = ''
    if (inv.err) return
    S.members.push({ email: email, role: inv.role, ov: {}, st: 'invited' })
    inv.email = ''
    toast(`دعوت‌نامه برای ${email} فرستاده شد`)
  },
  copyInvite: function () {
    toast('متن دعوت کپی شد')
  },
  backup: function () {
    S.backup[me()] = !S.backup[me()]
  },
  leaveAsk: function () {
    S.sheet = { kind: 'leave' }
  },
  leaveDo: function () {
    var m = member(me())
    if (m) S.members.splice(S.members.indexOf(m), 1)
    S.space[S.as] = 'none'
    S.sheet = null
    S.screen = 'hub'
    toast(
      S.leaveFallback
        ? 'گوگل اجازهٔ ترک مستقیم را نداد؛ دسترسی خودتان را در گوگل‌درایو بردارید'
        : 'از حساب مشترک بیرون آمدید'
    )
  }
})

/* <select> changes: a member's role (clears overrides; one partner only) and the invite role. */
var ON_CHANGE = {
  role: function (el) {
    var m = member(el.dataset.v)
    var taken = S.members.some(function (x) {
      return x.role === 'partner' && x !== m
    })
    if (el.value === 'partner' && taken) {
      toast('حساب مشترک فقط یک شریک دارد؛ نفر دیگر را «ناظر» کنید')
      return
    }
    m.role = el.value
    m.ov = {}
  },
  invRole: function (el) {
    S.inv.role = el.value
  }
}
