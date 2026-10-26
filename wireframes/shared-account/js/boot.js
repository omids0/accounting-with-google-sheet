/* eslint-disable -- prototype scripts share globals, not part of the app source */
Object.assign(A, {
  plist: function () {
    S.screen = 'personal'
  },
  pedit: function (e) {
    var r = pers(e.id)
    S.screen = 'entry'
    S.ent = {
      id: r.id,
      type: r.type,
      a: r.a,
      t: r.t,
      cat: r.cat,
      share: r.sh,
      wasShared: r.sh,
      sp: r.sp || 'equal'
    }
  },
  esave: function () {
    var e = S.ent
    if (!e.a) {
      var f = $('e-amount')
      if (f) f.focus()
      toast('مبلغ را وارد کنید')
      return
    }
    var fam = S.familyOn && can('record'),
      name = '«' + S.wiz.name + '»',
      msg,
      r
    if (e.id) {
      r = pers(e.id)
      r.t = e.t || e.cat
      r.a = e.a
      r.cat = e.cat
      r.type = e.type
      r.sp = e.sp
    } else {
      r = {
        id: 'q' + ++S.n,
        t: e.t || e.cat,
        a: e.a,
        cat: e.cat,
        type: e.type,
        sh: false,
        sp: e.sp
      }
      S.pers.unshift(r)
    }
    var copy = S.txs.filter(function (t) {
      return t.src === r.id
    })[0]
    if (fam) {
      if (e.share) {
        r.sh = true
        if (e.type === 'inc')
          S.txs = S.txs.filter(function (t) {
            return t.src !== r.id
          })
        else if (copy) {
          copy.t = r.t
          copy.a = r.a
          copy.cat = r.cat
          copy.sp = e.sp
        } else
          S.txs.push({
            id: ++S.n + 200,
            t: r.t,
            a: r.a,
            cat: r.cat,
            by: S.as === 'B' ? 'B' : 'A',
            sp: e.sp,
            d: '۳ آبان',
            src: r.id
          })
        msg = e.wasShared ? 'ثبت و نسخهٔ حساب مشترک به‌روز شد' : 'ثبت شد و در ' + name + ' هم رفت'
      } else if (r.sh) {
        r.sh = false
        S.txs = S.txs.filter(function (t) {
          return t.src !== r.id
        })
        msg = 'نسخهٔ حساب مشترک حذف شد'
      }
    }
    toast(msg || (e.id ? 'به‌روز شد' : 'در حساب شخصی ثبت شد'))
    S.screen = 'personal'
  },
  pdelAsk: function (e) {
    S.sheet = { k: 'pdel', id: e.id }
  },
  pdel: function (e) {
    var id = S.sheet.id
    S.pers = S.pers.filter(function (r) {
      return r.id !== id
    })
    if (e.v === 'both')
      S.txs = S.txs.filter(function (t) {
        return t.src !== id
      })
    else
      S.txs.forEach(function (t) {
        if (t.src === id) delete t.src
      })
    S.sheet = null
    S.screen = 'personal'
    toast(e.v === 'both' ? 'از هر دو حذف شد' : 'از حساب شخصی حذف شد')
  },
  editTx: function (e) {
    var t = S.txs.filter(function (x) {
        return x.id === +e.id
      })[0],
      n = S.tAmt
    if (!t || !n || n === t.a) {
      S.sheet = null
      return
    }
    var old = t.a
    t.a = n
    if (t.src && t.by !== S.as) {
      S.notices.push({
        id: ++S.n + 300,
        to: t.by,
        by: S.as,
        src: t.src,
        title: t.t,
        old: old,
        new: n
      })
      toast('ذخیره شد و به ' + nm(t.by) + ' اطلاع داده شد')
    } else toast('ذخیره شد')
    S.sheet = null
  }
})
Object.assign(A, {
  notice: function (e) {
    S.sheet = { k: 'notice', id: +e.id }
  },
  nApply: function () {
    var n = S.notices.filter(function (x) {
        return x.id === S.sheet.id
      })[0],
      r = n && pers(n.src)
    if (r) r.a = n.new
    S.notices = S.notices.filter(function (x) {
      return x !== n
    })
    S.sheet = null
    toast('در ثبت شخصی شما هم اعمال شد')
  },
  nSkip: function () {
    var id = S.sheet.id
    S.notices = S.notices.filter(function (x) {
      return x.id !== id
    })
    S.sheet = null
    toast('نادیده گرفته شد؛ ثبت شخصی شما همان ماند')
  }
})
Object.assign(A, {
  backup: function () {
    S.backup = !S.backup
  },
  leaveSheet: function () {
    S.sheet = { k: 'leave' }
  },
  leave: function () {
    S.sheet = null
    S.screen = 'spaces'
    toast('از فضا خارج شدید (نمونه)')
  },
  offSheet: function () {
    S.sheet = { k: 'off' }
  },
  off: function (e) {
    S.familyOn = false
    S.sheet = null
    S.screen = 'spaces'
    toast(e.v === 'revoke' ? 'دسترسی‌ها قطع شد (نمونه)' : 'از منو پنهان شد')
  }
})

document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]')
  if (!el || el.disabled) return
  var fn = A[el.dataset.act]
  if (!fn) return
  fn({ v: el.dataset.v, id: el.dataset.id, p: el.dataset.p })
  render()
})
document.addEventListener('input', function (ev) {
  var t = ev.target,
    id = t.id
  if (id === 'w-name') S.wiz.name = t.value
  else if (id === 'w-email') S.wiz.email = t.value
  else if (id === 'i-email') {
    S.inv.email = t.value
    S.inv.err = ''
    var er = $('i-err')
    if (er) er.remove()
  } else if (id === 'd-title') S.draft.t = t.value
  else if (id === 'e-title') S.ent.t = t.value
  else if (id === 't-amount') {
    var q = +digits(t.value)
    S.tAmt = q
    t.value = q ? fmt(q) : ''
  } else if (id === 'e-amount') {
    var m = +digits(t.value)
    S.ent.a = m
    t.value = m ? fmt(m) : ''
    var ep = $('e-prev')
    if (ep) ep.textContent = prev({ a: m, sp: S.ent.sp })
  } else if (id === 'd-amount') {
    var n = +digits(t.value)
    S.draft.a = n
    t.value = n ? fmt(n) : ''
    $('d-prev').textContent = prev(S.draft)
  }
})
document.addEventListener('change', function (ev) {
  if (ev.target.id === 'd-cat') S.draft.cat = ev.target.value
  else if (ev.target.id === 'e-cat') S.ent.cat = ev.target.value
})
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && S.sheet) {
    S.sheet = null
    render()
  }
})

render()
