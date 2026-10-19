/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — data model + domain logic (mirrors the spec services) */
'use strict'
const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
]
let TODAY = '1405-08-01'
function setToday(d) {
  TODAY = d
  S.today = d
}
const fa = n => Number(n).toLocaleString('fa-IR')
const money = n => fa(Math.round(n))
const pad = n => String(n).padStart(2, '0')
const mkey = (y, m) => y + '-' + pad(m)
const monthLabel = k => MONTHS[Number(k.slice(5)) - 1] + ' ' + fa(k.slice(0, 4)).replace(/٬/g, '')
const monthName = k => MONTHS[Number(k.slice(5)) - 1]
const dateFa = s => {
  const [y, m, d] = s.split('-').map(Number)
  return fa(d) + ' ' + MONTHS[m - 1] + ' ' + String(y).replace(/\d/g, x => '۰۱۲۳۴۵۶۷۸۹'[x])
}
const nextMonth = k => {
  let [y, m] = k.split('-').map(Number)
  m++
  if (m > 12) {
    m = 1
    y++
  }
  return mkey(y, m)
}
const prevMonth = k => {
  let [y, m] = k.split('-').map(Number)
  m--
  if (m < 1) {
    m = 12
    y--
  }
  return mkey(y, m)
}
let _id = 1000
const uid = p => (p || 'x') + ++_id
const round1000 = n => Math.round(n / 1000) * 1000

/* ---------- option registry (spec Decision 3) ---------- */
const RESIDENT_ROLES = [
  { value: 'owner', label: 'مالک' },
  { value: 'tenant', label: 'مستأجر' }
]
const CHARGE_METHODS = [
  { value: 'fixed', label: 'ثابت (برای همه یکسان)', hint: 'هر واحد مبلغ خودش یا پیش‌فرض' },
  { value: 'area', label: 'بر اساس متراژ', hint: 'سهم هر واحد از مجموع متراژ' },
  { value: 'people', label: 'بر اساس تعداد نفرات', hint: 'سهم هر واحد از مجموع نفرات' }
]
const VACANCY_RULES = [
  { value: 'full', label: 'شارژ کامل' },
  { value: 'half', label: 'نصف شارژ' },
  { value: 'zero', label: 'معاف' }
]
const SPLIT_MODES = [
  { value: 'equal', label: 'مساوی بین واحدها' },
  { value: 'area', label: 'به نسبت متراژ' },
  { value: 'people', label: 'به نسبت نفرات' },
  { value: 'manual', label: 'دستی' }
]
const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: fa(i + 1) + ' هر ماه'
}))
const BUILDING_ROLES = [
  { value: 'manager', label: 'مدیر' },
  { value: 'board', label: 'عضو هیئت مدیره' },
  { value: 'accountant', label: 'حسابدار' }
]
const defaultLists = () => ({
  expenseKinds: [
    { value: 'current', label: 'جاری', chargeTo: 'resident', hidden: false },
    { value: 'capital', label: 'عمرانی', chargeTo: 'owner', hidden: false }
  ],
  payers: [
    { value: 'fund', label: 'صندوق', hidden: false },
    { value: 'manager', label: 'مدیر', hidden: false }
  ]
})
const CHARGE_TO = [
  { value: 'resident', label: 'ساکن (مستأجر یا مالک ساکن)' },
  { value: 'owner', label: 'مالک' }
]
const BUILDING_CATS = {
  expense: {
    آسانسور: ['سرویس', 'تعمیر', 'بیمه'],
    نظافت: ['نظافتچی', 'مواد شوینده'],
    'قبوض مشاعات': ['برق', 'آب', 'گاز'],
    تعمیرات: ['تأسیسات', 'ساختمانی', 'برق‌کشی', 'پمپ و مخزن'],
    'حقوق سرایدار': [],
    'بیمه ساختمان': [],
    'عوارض و شهرداری': [],
    اداری: ['پرینت', 'پیک', 'کارمزد', 'بازپرداخت'],
    'فضای سبز': [],
    'ایمنی و اطفاء': [],
    انتقال: ['بازپرداخت به مدیر'],
    سایر: []
  },
  income: [
    'شارژ ساختمان',
    'پارکینگ مهمان',
    'اجارهٔ مشاعات',
    'سود سپرده',
    'جریمه',
    'کمک مالی',
    'طلب',
    'سایر'
  ]
}

/* ---------- building factory ---------- */
function newBuilding(id, name, o = {}) {
  return {
    id,
    name,
    address: o.address || 'تهران، ولنجک، کوچهٔ ۴، پلاک ۱۲',
    floors: o.floors || 4,
    myRole: 'manager',
    profile: {
      defaultCharge: o.charge || 1200000,
      method: 'fixed',
      issueDay: 1,
      dueDay: 10,
      vacancy: 'half'
    },
    accounts: [
      {
        id: uid('a'),
        name: 'ملت · صندوق',
        card: '۶۱۰۴۳۳۷۰۰۰۰۰۳۲۱۰',
        balance: o.opening ?? 12000000
      },
      { id: uid('a'), name: 'نقد · سرایدار', card: '', balance: 1500000 }
    ],
    people: [],
    units: [],
    stays: [],
    rec: [],
    recs: [],
    dang: [],
    checks: [],
    sms: [],
    lists: defaultLists(),
    members: [
      { name: 'امید سهیل‌نیا', roleKey: 'manager', me: true },
      { name: 'خانم جلالی', roleKey: 'board' },
      { name: 'آقای حسینی', roleKey: 'accountant' }
    ],
    issueLog: [],
    quickDone: false,
    activity: []
  }
}
const personById = (b, id) => b.people.find(p => p.id === id)
const unitById = (b, id) => b.units.find(u => u.id === id)
const unitByNo = (b, no) => b.units.find(u => u.no === Number(no))
const accById = (b, id) => b.accounts.find(a => a.id === id)
const kindOf = (b, v) => b.lists.expenseKinds.find(k => k.value === v)
const payerOf = (b, v) => b.lists.payers.find(k => k.value === v)
function addPerson(b, name, kind = 'resident', extra = {}) {
  const p = {
    id: uid('p'),
    name,
    phone: extra.phone || '',
    card: extra.card || '',
    kind,
    me: !!extra.me
  }
  b.people.push(p)
  return p
}
function addUnit(b, o) {
  const u = {
    id: uid('u'),
    no: o.no,
    floor: o.floor,
    area: o.area || 90,
    people: o.people || 3,
    parking: o.parking ?? 1,
    storage: o.storage ?? 0,
    charge: o.charge || 0,
    ownerId: o.ownerId || null,
    credit: 0,
    active: true,
    note: o.note || ''
  }
  b.units.push(u)
  b.units.sort((x, y) => x.no - y.no)
  return u
}
function occupantStay(b, unitId) {
  return b.stays.find(s => s.unitId === unitId && !s.to) || null
}
function occupantOf(b, unit) {
  const s = occupantStay(b, unit.id)
  return s ? { person: personById(b, s.personId), role: s.role, from: s.from } : null
}
function chargeDebtor(b, unit) {
  const occ = occupantOf(b, unit)
  if (occ && occ.role === 'tenant') return { person: occ.person, role: 'tenant' }
  if (occ && occ.role === 'owner') return { person: occ.person, role: 'owner' }
  const ow = personById(b, unit.ownerId)
  return ow ? { person: ow, role: 'owner' } : null
}
function ownerDebtor(b, unit) {
  const ow = personById(b, unit.ownerId)
  return ow ? { person: ow, role: 'owner' } : null
}
function unitCharge(b, unit) {
  const p = b.profile
  const act = b.units.filter(u => u.active)
  let base
  if (p.method === 'area') {
    const avg = act.reduce((s, u) => s + u.area, 0) / (act.length || 1)
    base = round1000((p.defaultCharge * unit.area) / avg)
  } else if (p.method === 'people') {
    const avg = act.reduce((s, u) => s + u.people, 0) / (act.length || 1)
    base = round1000((p.defaultCharge * unit.people) / avg)
  } else base = unit.charge || p.defaultCharge
  if (!occupantStay(b, unit.id)) base = base * ({ full: 1, half: 0.5, zero: 0 }[p.vacancy] ?? 1)
  return round1000(base)
}
const paidOf = r => r.paid.reduce((s, x) => s + x.amt, 0)
const openOf = r => r.amount - paidOf(r)
function unitBalance(b, unitId) {
  const open = b.rec.filter(r => r.unitId === unitId && openOf(r) > 0)
  const sum = open.reduce((s, r) => s + openOf(r), 0)
  const all = b.rec
    .filter(r => r.unitId === unitId)
    .flatMap(r => r.paid.map(p => p.date))
    .sort()
  const u = unitById(b, unitId)
  return {
    open: sum,
    months: [...new Set(open.map(r => r.month))].sort(),
    partial: open.some(r => paidOf(r) > 0),
    lastPaidAt: all.length ? all[all.length - 1] : null,
    credit: u ? u.credit : 0
  }
}
