/* eslint-disable -- prototype scripts share globals, not part of the app source */
var IC = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  scale: 'M12 3v18M6 21h12M5 7h14M5 7l-3 7a3.5 3 0 0 0 6 0zM19 7l-3 7a3.5 3 0 0 0 6 0z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  plus: 'M12 5v14M5 12h14',
  back: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  file: 'M14 3H6v18h12V8zM14 3v5h5'
}
function ic(n, s) {
  s = s || 20
  return (
    '<svg width="' +
    s +
    '" height="' +
    s +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
    IC[n] +
    '"/></svg>'
  )
}
function $(id) {
  return document.getElementById(id)
}
function fmt(n) {
  return Math.round(n).toLocaleString('fa-IR')
}
function digits(s) {
  return String(s)
    .replace(/[۰-۹]/g, function (d) {
      return d.charCodeAt(0) - 1776
    })
    .replace(/[٠-٩]/g, function (d) {
      return d.charCodeAt(0) - 1632
    })
    .replace(/[^0-9]/g, '')
}

var PERMS = [
  ['record', 'ثبت هزینه و درآمد'],
  ['editOthers', 'ویرایش و حذف ثبت‌های دیگران'],
  ['settle', 'ثبت تسویه'],
  ['budget', 'بودجه و دسته‌ها'],
  ['members', 'دعوت و مدیریت اعضا'],
  ['export', 'خروجی و پشتیبان']
]
var DEF = {
  owner: { record: 1, editOthers: 1, settle: 1, budget: 1, members: 1, export: 1 },
  partner: { record: 1, editOthers: 0, settle: 1, budget: 1, members: 0, export: 1 },
  viewer: { record: 0, editOthers: 0, settle: 0, budget: 0, members: 0, export: 0 }
}
var ROLE = { owner: 'مالک', partner: 'شریک', viewer: 'ناظر' }
var ROLE_HINT = {
  owner: 'فایل در درایو این حساب است. همهٔ کارها را می‌تواند بکند و نقشش عوض نمی‌شود.',
  partner: 'هزینه ثبت می‌کند، تسویه می‌کند و همه‌چیز را می‌بیند. اعضا را نمی‌تواند عوض کند.',
  viewer: 'فقط می‌بیند. مناسب پدر و مادر یا حسابدار.'
}
var CATS = ['مسکن', 'خوراک', 'قبوض', 'سلامت', 'تفریح', 'حمل‌ونقل', 'سایر']

var S = {
  screen: 'spaces',
  tab: 'home',
  as: 'A',
  familyOn: false,
  step: 1,
  sheet: null,
  filter: 'all',
  backup: true,
  toast: '',
  tid: 0,
  n: 0,
  wiz: {
    name: 'خانهٔ نیما و مینا',
    email: 'mina@example.com',
    role: 'partner',
    split: 'equal',
    cards: false
  },
  ent: { type: 'exp', a: 0, t: '', cat: 'خوراک', share: false, sp: 'equal' },
  pers: [
    { id: 'p1', t: 'قبض اینترنت', a: 480000, cat: 'قبوض', type: 'exp', sh: true, sp: 'equal' },
    { id: 'p2', t: 'بنزین', a: 900000, cat: 'حمل‌ونقل', type: 'exp', sh: false, sp: 'equal' },
    { id: 'p3', t: 'حقوق', a: 60000000, cat: 'سایر', type: 'inc', sh: false, sp: 'equal' }
  ],
  notices: [],
  tAmt: 0,
  draft: null,
  inv: { email: '', role: 'partner', err: '' },
  members: [
    { id: 'A', name: 'نیما', email: 'nima@example.com', role: 'owner', ov: {}, st: 'active' },
    { id: 'B', name: 'مینا', email: 'mina@example.com', role: 'partner', ov: {}, st: 'active' },
    {
      id: 'C',
      name: 'مادر مینا',
      email: 'mother@example.com',
      role: 'viewer',
      ov: {},
      st: 'invited'
    }
  ],
  txs: [
    { id: 1, t: 'اجارهٔ خانه', a: 18000000, cat: 'مسکن', by: 'A', sp: 'equal', d: '۱ آبان' },
    { id: 2, t: 'خرید سوپرمارکت', a: 1850000, cat: 'خوراک', by: 'B', sp: 'equal', d: '۳ آبان' },
    { id: 3, t: 'قبض برق و گاز', a: 640000, cat: 'قبوض', by: 'A', sp: 'equal', d: '۲ آبان' },
    { id: 4, t: 'داروخانه', a: 420000, cat: 'سلامت', by: 'A', sp: 'B', d: '۲ آبان' },
    { id: 5, t: 'رستوران', a: 1350000, cat: 'تفریح', by: 'B', sp: 'equal', d: '۲ آبان' },
    {
      id: 6,
      t: 'قبض اینترنت',
      a: 480000,
      cat: 'قبوض',
      by: 'A',
      sp: 'equal',
      d: '۲ آبان',
      src: 'p1'
    }
  ],
  sets: [{ id: 1, from: 'B', to: 'A', a: 5000000, d: '۱۵ مهر' }]
}

function pers(id) {
  return S.pers.filter(function (r) {
    return r.id === id
  })[0]
}
function mem(id) {
  return S.members.filter(function (m) {
    return m.id === id
  })[0]
}
function me() {
  var m = mem(S.as)
  if (!m) {
    S.as = 'A'
    m = mem('A')
  }
  return m
}
function can(p, m) {
  m = m || me()
  var v = m.ov[p]
  return v !== undefined ? !!v : !!DEF[m.role][p]
}
function nm(id) {
  return id === S.as ? 'شما' : mem(id) ? mem(id).name : '؟'
}
function driveWrite(m) {
  return (
    m.role !== 'viewer' ||
    ['record', 'editOthers', 'settle', 'budget', 'members'].some(function (p) {
      return m.ov[p]
    })
  )
}
function custom(m) {
  return Object.keys(m.ov).length > 0
}

function net() {
  var n = { A: 0, B: 0 }
  S.txs.forEach(function (t) {
    n[t.by] += t.a
    if (t.sp === 'equal') {
      n.A -= t.a / 2
      n.B -= t.a / 2
    } else n[t.sp] -= t.a
  })
  S.sets.forEach(function (s) {
    n[s.from] += s.a
    n[s.to] -= s.a
  })
  return n
}
function paid() {
  var p = { A: 0, B: 0 }
  S.txs.forEach(function (t) {
    p[t.by] += t.a
  })
  return p
}
function spLabel(t) {
  return t.sp === 'equal' ? 'نصف‌نصف' : 'فقط برای ' + nm(t.sp)
}

/* ---------- screens ---------- */
function appbar(title, o) {
  o = o || {}
  return (
    '<header class="appbar">' +
    (o.back
      ? '<button class="icon" data-act="' +
        o.back +
        '" aria-label="بازگشت">' +
        ic('back') +
        '</button>'
      : '') +
    '<h2>' +
    title +
    '</h2>' +
    (o.right || '') +
    '</header>'
  )
}

function spaces() {
  var h = appbar('فضاهای من') + '<div class="pad">' + (S.familyOn ? notices() : '')
  h +=
    '<div class="card"><div class="row"><span class="av A">ش</span><div class="grow"><h3>حساب شخصی</h3><p>فقط خودتان می‌بینید</p></div><span class="pill good">فعال</span></div><button class="btn ghost block" data-act="entry">ثبت هزینه یا درآمد شخصی</button></div>'
  if (!S.familyOn) {
    h +=
      '<div class="card dash"><div class="row"><span class="av N">خ</span><div class="grow"><h3>حساب مشترک</h3><p>هزینه‌های مشترک شما و شریک‌تان در یک فایل جدا</p></div></div>' +
      '<ul><li>حساب شخصی شما همان‌طور که هست می‌ماند.</li><li>شریک‌تان فقط فایل حساب مشترک را می‌بیند.</li><li>هر لحظه می‌توانید خاموشش کنید.</li></ul>' +
      '<button class="btn block" data-act="wiz">راه‌اندازی</button></div>' +
      '<p class="small muted">این قابلیت اختیاری است. تا روشنش نکنید، در شیت و منوی شما هیچ چیز اضافه نمی‌شود.</p>'
  } else {
    var avs = S.members
      .map(function (m) {
        return '<span class="av sm ' + m.id + '" title="' + m.name + '">' + m.name[0] + '</span>'
      })
      .join('')
    h +=
      '<div class="card"><div class="row"><span class="av B">خ</span><div class="grow"><h3>' +
      S.wiz.name +
      '</h3><p>نقش شما: ' +
      ROLE[me().role] +
      '</p></div>' +
      avs +
      '</div>' +
      '<button class="btn block" data-act="openFam">باز کردن</button>' +
      (me().role === 'owner'
        ? '<button class="btn ghost block" data-act="offSheet">خاموش کردن قابلیت</button>'
        : '') +
      '</div>'
  }
  return h + '</div>'
}
