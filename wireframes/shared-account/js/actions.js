/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Click actions of the hub, the wizard, the shared pages and the members tab. */
var A = {}
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
var n = 0
function toast(text, action) {
  S.toast = { text: text, action: action || '', id: ++n }
  var id = S.toast.id
  setTimeout(function () {
    if (S.toast && S.toast.id === id) {
      S.toast = null
      render()
    }
  }, 4500)
}
function wait(ms) {
  return new Promise(function (ok) {
    setTimeout(ok, ms)
  })
}

Object.assign(A, {
  noop: function () {},
  close: function () {
    if (S.sheet2) S.sheet2 = null
    else S.sheet = null
  },
  go: function (el) {
    S.screen = el.dataset.v
    S.sheet = null
  },
  hub: function () {
    S.screen = 'hub'
  },
  open: function () {
    S.screen = 'home'
  },
  filter: function (el) {
    S.filter = el.dataset.v
  },
  showAgain: function () {
    S.space[S.as] = 'on'
  },
  connectSheet: function () {
    S.sheet = { kind: 'connect' }
  },
  connectDo: function () {
    S.space[S.as] = 'on'
    S.grant = true
    S.sheet = null
    S.screen = 'home'
  },
  offSheet: function () {
    S.offChoice = 'hide'
    S.sheet = { kind: 'off' }
  },
  offPick: function (el) {
    S.offChoice = el.dataset.v
  },
  offDo: function () {
    S.sheet = null
    if (S.offChoice === 'hide') {
      S.space.owner = 'hidden'
      return toast('حساب مشترک از منوی شما پنهان شد')
    }
    S.space = { owner: 'none', partner: 'none', viewer: 'none' }
    toast('دسترسی همه قطع شد و حساب مشترک خاموش شد')
  },

  /* setup wizard */
  wizStart: function () {
    S.wiz = freshWizard()
    S.screen = 'wizard'
  },
  wizRole: function (el) {
    S.wiz.role = el.dataset.v
  },
  wizBack: function () {
    S.wiz.step--
    S.wiz.err = ''
  },
  wizNext: function () {
    var w = S.wiz
    if (w.step === 2) {
      if (!w.name.trim()) w.err = 'نام حساب مشترک را بنویسید'
      else if (!EMAIL_RE.test(w.email.trim())) w.err = 'ایمیل گوگل شریک را درست وارد کنید'
      else if (w.email.trim().toLowerCase() === me())
        w.err = 'این ایمیل خود شماست؛ ایمیل گوگل شریک‌تان را وارد کنید'
      else w.err = ''
      if (w.err) return
    }
    w.step++
  },
  wizCreate: function () {
    var w = S.wiz
    S.busy = { text: 'در حال ساخت فایل حساب مشترک در Google Drive…', pct: 18 }
    render()
    wait(1100)
      .then(function () {
        S.busy = { text: 'در حال فرستادن دعوت…', pct: 52 }
        render()
        return wait(1000)
      })
      .then(function () {
        S.busy = null
        var email = w.email.trim().toLowerCase()
        S.records = []
        S.notices = []
        S.month = []
        S.space.owner = 'on'
        S.members = [{ email: OWNER, role: 'owner', ov: {}, st: 'active' }]
        if (w.fail) {
          w.kept = true
          w.err =
            'گوگل اجازهٔ اشتراک این فایل را نداد. فقط مالک فایل یا ویرایشگری که اجازهٔ اشتراک دارد می‌تواند دسترسی بدهد. فایل حساب مشترک ساخته شد ولی دعوت نرفت؛ از «اعضا» دوباره دعوت کنید.'
        } else {
          S.members.push({ email: email, role: w.role, ov: {}, st: 'invited' })
          S.screen = 'home'
          toast('حساب مشترک ساخته شد و دعوت فرستاده شد')
        }
        render()
      })
  },
  wizMembers: function () {
    S.screen = 'members'
  },

  /* records, add, settle */
  rec: function (el) {
    S.sheet = { kind: 'rec', id: el.dataset.v }
  },
  add: function () {
    S.add = { type: 'expense', amount: 0, title: '', cat: '', payer: me(), split: 'equal', err: '' }
    S.sheet = { kind: 'add' }
  },
  aType: function (el) {
    S.add.type = el.dataset.v
    S.add.cat = ''
    S.add.err = ''
  },
  aSplit: function (el) {
    S.add.split = el.dataset.v
  },
  addSave: function () {
    var a = S.add
    a.err = !a.amount ? 'مبلغ را وارد کنید' : !a.cat ? 'دسته را انتخاب کنید' : ''
    if (a.err) return
    var inc = a.type === 'income'
    S.records.unshift({
      id: 'x' + ++n,
      title: a.title || a.cat,
      amount: a.amount,
      cat: a.cat,
      type: a.type,
      payer: inc ? '' : a.payer || me(),
      split: inc ? '' : a.split,
      creator: me(),
      date: '۴ آبان ۱۴۰۵',
      wd: 'دوشنبه'
    })
    if (!inc) S.month.push(S.records[0].id)
    S.sheet = null
    toast('ثبت شد')
  },
  recSave: function (el) {
    var r = rec(el.dataset.v),
      v = digits($('r-amount').value)
    if (!v || v === r.amount) return
    if (r.ref && r.creator !== me())
      S.notices.push({
        id: 'n' + ++n,
        to: r.creator,
        by: me(),
        ref: r.ref,
        title: r.title,
        field: 'amount',
        kind: 'edit',
        old: r.amount,
        new: v
      })
    r.amount = v
    S.sheet = null
    toast('مبلغ به‌روز شد')
  },
  recDel: function (el) {
    var r = rec(el.dataset.v),
      i = S.records.indexOf(r)
    S.records.splice(i, 1)
    var note = null
    if (r.ref && r.creator !== me()) {
      note = {
        id: 'n' + ++n,
        to: r.creator,
        by: me(),
        ref: r.ref,
        title: r.title,
        field: 'delete',
        kind: 'delete'
      }
      S.notices.push(note)
    }
    S.undo = { r: r, i: i, note: note }
    S.sheet = null
    toast(`ثبت «${r.title}» حذف شد`, 'undoDel')
  },
  undoDel: function () {
    if (!S.undo) return
    S.records.splice(S.undo.i, 0, S.undo.r)
    if (S.undo.note) S.notices.splice(S.notices.indexOf(S.undo.note), 1)
    S.undo = null
    S.toast = null
  },
  settleSheet: function () {
    var o = suggest()
    S.settleDraft = { from: o ? o.from : pair()[0], amount: o ? o.amount : 0 }
    S.sheet = { kind: 'settle' }
  },
  settleSave: function () {
    var st = S.settleDraft
    if (!st.amount) return
    S.records.unshift({
      id: 's' + ++n,
      title: 'تسویه',
      amount: st.amount,
      cat: 'تسویه',
      type: 'settle',
      payer: st.from,
      split: 'only:' + otherOf(st.from),
      creator: me(),
      date: '۴ آبان ۱۴۰۵',
      wd: 'دوشنبه'
    })
    S.sheet = null
    toast('تسویه ثبت شد')
  }
})
