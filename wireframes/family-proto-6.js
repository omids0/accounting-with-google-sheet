/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* ---------- actions ---------- */
var A = {}
Object.assign(A, {
  close: function () {
    S.sheet = null
  },
  spaces: function () {
    S.screen = 'spaces'
    S.sheet = null
  },
  wiz: function () {
    S.screen = 'wizard'
    S.step = 1
  },
  wizBack: function () {
    if (S.step > 1) S.step--
    else S.screen = 'spaces'
  },
  wizNext: function () {
    S.step++
  },
  wrole: function (e) {
    S.wiz.role = e.v
  },
  wsplit: function (e) {
    S.wiz.split = e.v
  },
  wcards: function () {
    S.wiz.cards = !S.wiz.cards
  },
  wizDone: function () {
    S.familyOn = true
    S.screen = 'family'
    S.tab = 'home'
    S.as = 'A'
    var b = mem('B')
    b.role = S.wiz.role
    b.ov = {}
    b.st = 'invited'
    b.email = S.wiz.email
    toast('دعوت برای ' + S.wiz.email + ' فرستاده شد')
  },
  openFam: function () {
    S.screen = 'family'
    S.tab = 'home'
  },
  tab: function (e) {
    S.tab = e.v
  },
  filter: function (e) {
    S.filter = e.v
  },
  as: function (e) {
    S.as = e.id
    if (S.screen === 'family') {
      S.sheet = null
    }
  },
  jump: function (e) {
    S.sheet = null
    if (e.v === 'spaces') {
      S.screen = 'spaces'
      S.familyOn = false
      S.as = 'A'
    } else if (e.v === 'wizard') {
      S.screen = 'wizard'
      S.step = 1
    } else if (e.v === 'entry') {
      S.familyOn = true
      S.as = 'A'
      S.screen = 'entry'
      S.ent = { type: 'exp', a: 0, t: '', cat: 'خوراک', share: false, sp: 'equal' }
    } else if (e.v === 'personal') {
      S.familyOn = true
      S.as = 'A'
      S.screen = 'personal'
    } else {
      S.familyOn = true
      S.screen = 'family'
      S.tab = e.v
    }
  },
  add: function () {
    S.draft = { a: 0, t: '', cat: 'خوراک', by: S.as === 'B' ? 'B' : 'A', sp: 'equal' }
    S.sheet = { k: 'add' }
  },
  dby: function (e) {
    S.draft.by = e.v
  },
  dsp: function (e) {
    S.draft.sp = e.v
  },
  save: function () {
    var d = S.draft
    if (!d.a) {
      var f = $('d-amount')
      if (f) f.focus()
      toast('مبلغ را وارد کنید')
      return
    }
    S.txs.push({
      id: ++S.n + 100,
      t: d.t || d.cat,
      a: d.a,
      cat: d.cat,
      by: d.by,
      sp: d.sp,
      d: '۳ آبان'
    })
    S.sheet = null
    toast('ثبت شد')
  },
  tx: function (e) {
    var t = S.txs.filter(function (x) {
      return x.id === +e.id
    })[0]
    S.tAmt = t ? t.a : 0
    S.sheet = { k: 'tx', id: +e.id }
  },
  delTx: function (e) {
    var t = S.txs.filter(function (x) {
        return x.id === +e.id
      })[0],
      r = t && t.src && pers(t.src)
    if (r) r.sh = false
    S.txs = S.txs.filter(function (x) {
      return x.id !== +e.id
    })
    S.sheet = null
    toast('حذف شد')
  },
  settle: function () {
    S.sheet = { k: 'settle' }
  },
  doSettle: function () {
    var n = net(),
      amt = Math.abs(n.A)
    if (amt < 1) {
      S.sheet = null
      return
    }
    S.sets.push({
      id: Date.now(),
      from: n.A >= 0 ? 'B' : 'A',
      to: n.A >= 0 ? 'A' : 'B',
      a: amt,
      d: '۳ آبان'
    })
    S.sheet = null
    toast('تسویه ثبت شد')
  },
  member: function (e) {
    S.sheet = { k: 'member', id: e.id }
  },
  mrole: function (e) {
    var m = mem(e.id)
    if (m && m.role !== e.v) {
      m.role = e.v
      m.ov = {}
      toast('نقش عوض شد و دسترسی‌های سفارشی پاک شد')
    }
  },
  mperm: function (e) {
    var m = mem(e.id),
      p = e.p,
      cur = can(p, m),
      next = !cur
    if (!!DEF[m.role][p] === next) delete m.ov[p]
    else m.ov[p] = next
  },
  resend: function () {
    toast('دعوت دوباره فرستاده شد')
  },
  rm: function (e) {
    S.members = S.members.filter(function (m) {
      return m.id !== e.id
    })
    S.sheet = null
    toast('دسترسی قطع شد')
  },
  inv: function () {
    S.inv = { email: '', role: 'partner', err: '' }
    S.sheet = { k: 'inv' }
  },
  irole: function (e) {
    S.inv.role = e.v
  },
  sendInv: function () {
    var v = S.inv,
      em = v.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      v.err = 'یک ایمیل معتبر وارد کنید'
      return
    }
    if (
      S.members.some(function (m) {
        return m.email === em
      })
    ) {
      v.err = 'این ایمیل از قبل عضو است؛ نقشش را از فهرست اعضا عوض کنید'
      return
    }
    S.members.push({
      id: 'N' + ++S.n,
      name: em.split('@')[0],
      email: em,
      role: v.role,
      ov: {},
      st: 'invited'
    })
    S.sheet = null
    toast('دعوت فرستاده شد')
  },
  entry: function () {
    S.screen = 'entry'
    S.ent = { type: 'exp', a: 0, t: '', cat: 'خوراک', share: false, sp: 'equal' }
  },
  etype: function (e) {
    S.ent.type = e.v
    if (e.v === 'inc') S.ent.share = false
  },
  eshare: function () {
    S.ent.share = !S.ent.share
  },
  esplit: function (e) {
    S.ent.sp = e.v
  }
})
