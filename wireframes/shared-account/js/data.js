/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Sample data and constants. Names, e-mails and amounts are made up; nothing is saved. */
var IC = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  back: 'M19 12H5M11 6l-6 6 6 6',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  swap: 'M4 8h14l-4-4M20 16H6l4 4',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0',
  building: 'M4 21V7l6-3v17M10 21h10V10l-10-3M7 9v.01M7 13v.01M7 17v.01M14 13h2M14 17h2',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  debt: 'M12 19V5M6 11l6-6 6 6M5 21h14',
  cheque: 'M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2zM9 9h6M9 13h6',
  hand: 'M4 14h3l4 3h6a2 2 0 0 0 0-4h-4M7 14V9M12 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  box: 'M4 6h16v13H4zM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
  wallet: 'M4 7h15v12H4zM4 7l12-3v3M15 13h.01'
}

var OWNER = 'nima@example.com'
var PARTNER = 'mina@example.com'
var VIEWER = 'sara@example.com'
/* Inside the shared account names come from the sharing info; outside it (hub, personal forms)
   the app shows the e-mail's local part (spec «Personal side details»). */
var NAMES = { 'nima@example.com': 'نیما', 'mina@example.com': 'مینا', 'sara@example.com': 'سارا' }
var ACCOUNT = 'خانهٔ ما'

var PERMS = [
  ['record', 'ثبت هزینه و درآمد'],
  ['editOthers', 'ویرایش و حذف ثبت‌های دیگران'],
  ['settle', 'ثبت تسویه'],
  ['budget', 'بودجه و دسته‌ها'],
  ['members', 'دعوت و مدیریت اعضا'],
  ['export', 'خروجی و پشتیبان']
]
var WRITE_PERMS = ['record', 'editOthers', 'settle', 'budget', 'members']
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
var STATUS = { active: 'فعال', invited: 'دعوت‌شده' }
var EXP_CATS = ['خوراک', 'اجاره', 'قبوض', 'سلامت', 'حمل‌ونقل', 'خانه', 'سایر']
var INC_CATS = ['حقوق', 'هدیه', 'سایر']
var PERSONAL_CATS = ['خوراک', 'رستوران', 'قبوض', 'حمل‌ونقل', 'حقوق']

/* Shared records: payer, split (equal | only:<email>), creator («ایجادکننده») and the personal
   record a copy came from. «تسویه» rows are expense rows: payer = from, split only:<to>. */
var RECORDS = [
  'r4|قبض برق و گاز|640000|قبوض|expense|mina|equal|mina|۳ آبان ۱۴۰۵|یکشنبه|m1',
  'r3|شام بیرون|1200000|خوراک|expense|nima|only:mina|nima|۳ آبان ۱۴۰۵|یکشنبه|',
  'r2|میوه و سبزی|900000|خانه|expense|nima|equal|nima|۲ آبان ۱۴۰۵|شنبه|p1',
  'r1|اجاره آبان|12000000|اجاره|expense|mina|equal|mina|۱ آبان ۱۴۰۵|جمعه|',
  'r5|حقوق مهر|60000000|حقوق|income|||nima|۲۹ مهر ۱۴۰۵|سه‌شنبه|',
  'r6|خرید هفته|640000|خوراک|expense|mina|equal|mina|۲۳ مهر ۱۴۰۵|چهارشنبه|',
  's1|تسویه|2000000|تسویه|settle|mina|only:nima|mina|۱۸ مهر ۱۴۰۵|جمعه|'
]
/* Notices go to the copy's creator after someone else changed or deleted it. */
var NOTICES = [
  'n1|nima|mina|p1|میوه و سبزی|amount|edit|850000|900000',
  'n2|nima|mina|p1|میوه و سبزی|category|edit|خوراک|خانه',
  'n3|nima|mina|p4|تاکسی فرودگاه|delete|delete||'
]
/* The signed-in person's personal records; link: none | linked | pending («در انتظار ارسال»). */
var PERS = [
  'p2|رستوران|420000|رستوران|۳ آبان ۱۴۰۵|expense|none',
  'p1|میوه و سبزی|850000|خوراک|۲ آبان ۱۴۰۵|expense|linked',
  'p3|قبض اینترنت|480000|قبوض|۲ آبان ۱۴۰۵|expense|pending',
  'p4|تاکسی فرودگاه|650000|حمل‌ونقل|۱ آبان ۱۴۰۵|expense|linked'
]
/* «nima» / «only:mina» in the tables stand for the sample e-mails. */
function rows(table, keys) {
  return table.map(function (line) {
    var o = {}
    line.split('|').forEach(function (v, i) {
      v = v.replace(/^(only:)?(nima|mina|sara)$/, '$1$2@example.com')
      o[keys[i]] = /^[0-9]+$/.test(v) ? Number(v) : v
    })
    return o
  })
}

/* Everything a jump in the rail resets: the account, its members, records and notices. */
function seed() {
  return {
    space: { owner: 'on', partner: 'on', viewer: 'on' },
    grant: true,
    failed: '',
    leaveFallback: false,
    backup: { [OWNER]: true, [PARTNER]: false, [VIEWER]: false },
    members: [
      { email: OWNER, role: 'owner', ov: {}, st: 'active' },
      { email: PARTNER, role: 'partner', ov: {}, st: 'active' },
      { email: VIEWER, role: 'viewer', ov: {}, st: 'active' }
    ],
    records: rows(RECORDS, [
      'id',
      'title',
      'amount',
      'cat',
      'type',
      'payer',
      'split',
      'creator',
      'date',
      'wd',
      'ref'
    ]),
    month: ['r1', 'r2', 'r3', 'r4'],
    notices: rows(NOTICES, ['id', 'to', 'by', 'ref', 'title', 'field', 'kind', 'old', 'new']),
    pers: rows(PERS, ['id', 'title', 'amount', 'cat', 'date', 'type', 'link'])
  }
}
function blankEntry(type) {
  return {
    mode: 'new',
    id: '',
    type: type || 'expense',
    amount: 0,
    title: '',
    cat: type === 'income' ? 'حقوق' : 'خوراک',
    on: false,
    linked: false,
    sharedCat: '',
    payer: '',
    split: 'equal',
    failed: false
  }
}
function freshWizard() {
  return {
    step: 1,
    name: '',
    email: '',
    role: 'partner',
    err: '',
    fail: false,
    kept: false,
    taken: false
  }
}
/* UI state (who is looking, which screen and sheet) plus the seeded data. */
var S = Object.assign(
  {
    as: 'owner',
    theme: 'light',
    screen: 'hub',
    filter: 'all',
    sheet: null,
    sheet2: null,
    toast: null,
    busy: null,
    expanded: '',
    wiz: freshWizard(),
    ent: blankEntry(),
    add: null,
    inv: null,
    settleDraft: null,
    offChoice: 'hide'
  },
  seed()
)
