/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Personal side: the «حساب مشترک» switch, save / edit / delete of a linked record, notices. */
function copyOf(id) {
  return S.records.filter(function (r) {
    return r.ref === id
  })[0]
}
/* The whitelist that crosses: title (only a typed one), amount, date, category, payer, split. */
function writeCopy(p, e) {
  var c = copyOf(p.id)
  var fields = {
    title: e.title || sharedCatFor(e),
    amount: e.amount,
    cat: sharedCatFor(e),
    type: e.type,
    payer: e.type === 'income' ? '' : e.payer || me(),
    split: e.type === 'income' ? '' : e.split,
    ref: p.id
  }
  if (c) return Object.assign(c, fields)
  S.records.unshift(
    Object.assign({ id: 'c' + ++n, creator: me(), date: p.date, wd: 'دوشنبه' }, fields)
  )
}
function dropCopy(id, unlinkOnly) {
  var c = copyOf(id)
  if (!c) return
  if (unlinkOnly) c.ref = ''
  else S.records.splice(S.records.indexOf(c), 1)
}
function dropNotices(id) {
  S.notices = S.notices.filter(function (x) {
    return x.ref !== id
  })
}

Object.assign(A, {
  newEntry: function () {
    S.ent = blankEntry()
    S.screen = 'entry'
  },
  eType: function (el) {
    S.ent = Object.assign(blankEntry(el.dataset.v), { amount: S.ent.amount, title: S.ent.title })
  },
  tick: function () {
    S.ent.on = !S.ent.on
  },
  tSplit: function (el) {
    S.ent.split = el.dataset.v
  },
  entrySave: function () {
    var e = S.ent
    var p = {
      id: 'p' + ++n,
      title: e.title || e.cat,
      amount: e.amount,
      cat: e.cat,
      date: '۴ آبان ۱۴۰۵',
      type: e.type,
      link: e.on ? 'linked' : 'none'
    }
    S.pers.unshift(p)
    if (e.on) writeCopy(p, e)
    S.screen = 'plist'
    toast('ذخیره شد')
  },
  pedit: function (el) {
    var p = pers(el.dataset.v),
      c = copyOf(p.id)
    S.ent = Object.assign(blankEntry(p.type), {
      mode: 'edit',
      id: p.id,
      amount: p.amount,
      title: p.title,
      cat: p.cat,
      on: p.link !== 'none',
      linked: p.link !== 'none',
      payer: c ? c.payer : '',
      split: c ? c.split : 'equal',
      failed: S.failed === p.id
    })
    S.sheet = { kind: 'edit' }
  },
  editSave: function () {
    var e = S.ent,
      p = pers(e.id)
    Object.assign(p, { amount: e.amount, title: e.title, cat: e.cat })
    // The tick on save is the single source of truth; a pending notice is overwritten.
    if (e.on) {
      writeCopy(p, e)
      if (p.link === 'none') p.link = 'linked'
    } else {
      dropCopy(p.id)
      p.link = 'none'
    }
    dropNotices(p.id)
    S.sheet = null
    toast('ذخیره شد')
  },
  cancelSend: function () {
    S.ent.failed = false
    S.ent.on = false
    S.ent.linked = false
    S.failed = ''
    pers(S.ent.id).link = 'none'
  },
  pdel: function (el) {
    S.sheet = { kind: 'pdel', id: el.dataset.v }
  },
  pdelBoth: function () {
    var p = pers(S.sheet.id)
    dropCopy(p.id)
    dropNotices(p.id)
    S.pers.splice(S.pers.indexOf(p), 1)
    S.sheet = null
    toast(`«${p.title}» از هر دو حذف شد`)
  },
  pdelOne: function () {
    var p = pers(S.sheet.id)
    dropCopy(p.id, true)
    S.pers.splice(S.pers.indexOf(p), 1)
    S.sheet = null
    toast(`«${p.title}» حذف شد`)
  },
  notice: function (el) {
    var s = { kind: 'notice', id: el.dataset.v, inForm: !!el.dataset.form }
    if (s.inForm) S.sheet2 = s
    else S.sheet = s
  },
  nApply: function () {
    var x = notice(S.sheet.id),
      p = pers(x.ref)
    S.notices.splice(S.notices.indexOf(x), 1)
    S.sheet = null
    if (p && x.field === 'amount') p.amount = x.new
    if (p && x.field === 'title') p.title = x.new
    if (p && x.field === 'category' && PERSONAL_CATS.indexOf(x.new) >= 0) p.cat = x.new
    else if (x.field === 'category' || !p)
      return toast('ثبت شخصی تغییر نکرد: این دسته یا خود ثبت در حساب شخصی شما نیست')
    toast('در ثبت شخصی اعمال شد')
  },
  nSkip: function () {
    var s = S.sheet2 || S.sheet
    S.notices.splice(S.notices.indexOf(notice(s.id)), 1)
    A.close()
  },
  nAck: function () {
    var x = notice(S.sheet.id),
      p = pers(x.ref)
    S.notices.splice(S.notices.indexOf(x), 1)
    if (p) p.link = 'none'
    S.sheet = null
  },
  nFormOk: function () {
    S.sheet2 = null
  },
  connectRow: function () {
    if (S.ent.amount || S.ent.title) S.sheet = { kind: 'connectLeave' }
    else A.connectGo()
  },
  connectGo: function () {
    S.screen = 'hub'
    S.sheet = { kind: 'connect' }
  }
})

Object.assign(ON_CHANGE, {
  'e-cat': function (el) {
    S.ent.cat = el.value
    S.ent.sharedCat = ''
  },
  't-cat': function (el) {
    S.ent.sharedCat = el.value
  },
  't-payer': function (el) {
    S.ent.payer = el.value
  },
  'a-cat': function (el) {
    S.add.cat = el.value
  },
  'a-payer': function (el) {
    S.add.payer = el.value
  },
  's-dir': function (el) {
    S.settleDraft.from = el.value
  }
})
