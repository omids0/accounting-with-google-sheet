/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* The rules as shipped (sharedViewModel.ts, sharedBalance.ts, memberCopy.ts), in plain JS. */
var EMAIL_OF = { owner: OWNER, partner: PARTNER, viewer: VIEWER }

function $(id) {
  return document.getElementById(id)
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  })
}
function ic(n, s) {
  s = s || 22
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n]}"/></svg>`
}
function fa(v) {
  return String(v).replace(/[0-9]/g, function (d) {
    return '۰۱۲۳۴۵۶۷۸۹'[d]
  })
}
function money(n) {
  return fa(Math.round(n).toLocaleString('en-US'))
}
function digits(s) {
  return Number(
    String(s)
      .replace(/[۰-۹]/g, function (d) {
        return d.charCodeAt(0) - 1776
      })
      .replace(/[^0-9]/g, '') || 0
  )
}
var ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
var TEENS = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده'
]
var TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
var HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
function words3(n) {
  var out = []
  if (n >= 100) out.push(HUNDREDS[Math.floor(n / 100)])
  n %= 100
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)])
    if (n % 10) out.push(ONES[n % 10])
  } else if (n >= 10) out.push(TEENS[n - 10])
  else if (n) out.push(ONES[n])
  return out.join(' و ')
}
/* «شش میلیون و ششصد و نود و پنج هزار تومان»: the words under every money input. */
function words(n) {
  var scales = ['', ' هزار', ' میلیون', ' میلیارد'],
    out = [],
    i = 0
  n = Math.floor(n)
  if (!n) return ''
  while (n > 0 && i < scales.length) {
    if (n % 1000) out.unshift(words3(n % 1000) + scales[i])
    n = Math.floor(n / 1000)
    i++
  }
  return out.join(' و ') + ' تومان'
}

function me() {
  return EMAIL_OF[S.as]
}
function member(email) {
  return S.members.filter(function (m) {
    return m.email === email
  })[0]
}
function myRole() {
  var m = member(me())
  return m ? m.role : S.as
}
function can(p, m) {
  m = m || member(me())
  if (!m) return false
  return p in m.ov ? !!m.ov[p] : !!DEF[m.role][p]
}
function custom(m) {
  return Object.keys(m.ov).length > 0
}
function local(email) {
  return email.split('@')[0]
}
/* Inside the shared account: «شما» or the member's name. */
function nameIn(email) {
  return email === me() ? 'شما' : NAMES[email] || local(email)
}
/* Outside it (hub, personal forms and lists): «شما» or the e-mail's local part. */
function nameOut(email) {
  return email === me() ? 'شما' : local(email)
}
/* The two people of the balance: the owner and the partner. */
function pair() {
  var p = S.members.filter(function (m) {
    return m.role === 'partner'
  })[0]
  return [OWNER, p ? p.email : PARTNER]
}
function otherOf(email) {
  var p = pair()
  return p[0] === email ? p[1] : p[0]
}
function sharesOf(r) {
  var p = pair(),
    out = {},
    half = Math.floor(r.amount / 2)
  p.forEach(function (e) {
    if (r.split.indexOf('only:') === 0) out[e] = r.split.slice(5) === e ? r.amount : 0
    else out[e] = e === r.payer ? half : r.amount - half
  })
  return out
}
/* paid − share for every expense; a «تسویه» row is an expense with split only:<to>. */
function net() {
  var n = {}
  pair().forEach(function (e) {
    n[e] = 0
  })
  S.records.forEach(function (r) {
    if (r.type === 'income') return
    var sh = sharesOf(r)
    n[r.payer] = (n[r.payer] || 0) + r.amount
    Object.keys(sh).forEach(function (e) {
      n[e] -= sh[e]
    })
  })
  return n
}
function suggest() {
  var n = net(),
    p = pair()
  var from = n[p[0]] < 0 ? p[0] : p[1],
    amount = Math.abs(n[from])
  return amount >= 1 ? { from: from, to: otherOf(from), amount: amount } : null
}
function headline() {
  var o = suggest(),
    mine = pair().indexOf(me()) >= 0
  if (!o) return mine ? 'حساب شما صاف است' : 'حساب صاف است'
  if (o.from === me()) return `شما به ${nameIn(o.to)} بدهکارید`
  return `${nameIn(o.from)} به ${nameIn(o.to)} بدهکار است`
}
/* Said first in the leave and off sheets; it never blocks. Outside the account: local part. */
function balanceWarning(nameFn) {
  var o = suggest(),
    f = nameFn || nameIn
  if (!o) return ''
  if (o.from === me()) return `شما ${money(o.amount)} تومان به ${f(o.to)} بدهکارید.`
  return `${f(o.from)} ${money(o.amount)} تومان به ${f(o.to)} بدهکار است.`
}
function splitLabel(split) {
  return split === 'equal' ? 'نصف‌نصف' : 'فقط برای ' + nameIn(split.slice(5))
}
function preview(amount, split, payer, nameFn) {
  if (!amount) return 'مبلغ را وارد کنید تا سهم هر نفر را ببینید.'
  var sh = sharesOf({ amount: amount, split: split, payer: payer || me() })
  return pair()
    .map(function (e) {
      return `سهم ${nameFn(e)}: ${money(sh[e])} تومان`
    })
    .join(' · ')
}
function monthTotals() {
  var t = { total: 0 }
  pair().forEach(function (e) {
    t[e] = 0
  })
  S.records.forEach(function (r) {
    if (S.month.indexOf(r.id) < 0 || r.type !== 'expense') return
    t.total += r.amount
    t[r.payer] += r.amount
  })
  return t
}
function canEdit(r) {
  if (!can(r.type === 'settle' ? 'settle' : 'record')) return false
  return can('editOthers') || r.creator === me()
}
function lockNote(r) {
  var settle = r.type === 'settle'
  if (settle && !can('settle')) return 'ثبت تسویه با دسترسی «ثبت تسویه» ممکن است.'
  if (!can('record')) {
    return myRole() === 'viewer'
      ? 'ناظر نمی‌تواند ثبت‌ها را تغییر بدهد.'
      : 'دسترسی «ثبت هزینه و درآمد» شما خاموش است و ثبت‌ها را نمی‌توانید تغییر بدهید.'
  }
  return `این ثبت را ${nameIn(r.creator)} انجام داده و شما دسترسی «ویرایش ثبت‌های دیگران» ندارید.`
}
/* «ویرایش» for owner and partner; a viewer given a writing switch is raised to «ویرایش» too. */
function driveWriter(m) {
  return (
    m.role !== 'viewer' ||
    WRITE_PERMS.some(function (p) {
      return can(p, m)
    })
  )
}
function driveLine(m) {
  return driveWriter(m) ? 'دسترسی ویرایش در گوگل‌درایو' : 'فقط مشاهده در گوگل‌درایو'
}
function myNotices() {
  return S.notices.filter(function (n) {
    return n.to === me()
  })
}
function noticeValue(n, v) {
  return n.field === 'amount' ? money(v) + ' تومان' : v
}
function noticeSentence(n, who) {
  var t = `«${n.title}»`
  if (n.kind === 'delete') return `${who} ${t} را از حساب مشترک حذف کرد`
  return `${who} ${n.field === 'amount' ? 'مبلغ ' : ''}${t} را در حساب مشترک عوض کرد`
}
function rec(id) {
  return S.records.filter(function (r) {
    return r.id === id
  })[0]
}
function pers(id) {
  return S.pers.filter(function (r) {
    return r.id === id
  })[0]
}
