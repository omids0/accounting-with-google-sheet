// Persona 3a: shop owner (55): the PERSONAL/shop books. The building he manages is building.mjs.
import * as L from './lib.mjs'
import * as F from './smsFormats.mjs'

const { ago, uid } = L
const TAG = 'merchant'
const ANCHOR = '2026-08-23'

/** Small deterministic PRNG so the sales look irregular but the file is reproducible. */
function prng(seed) {
  let a = seed

  return () => {
    a = (a + 0x6d2b79f5) | 0

    let t = Math.imul(a ^ (a >>> 15), 1 | a)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildMerchant() {
  const rnd = prng(55)
  const book = new L.Book(TAG, ANCHOR)

  const biz = book.account({
    key: 'biz',
    title: 'حساب جاری مغازه — ملت',
    bank: 'بانک ملت',
    card: '6104337711220099',
    holder: 'احمد صالحی',
    acctNo: '7712345678',
    opening: 85000000
  })

  const pers = book.account({
    key: 'pers',
    title: 'حساب شخصی — ملی',
    bank: 'بانک ملی',
    card: '6037997755004321',
    holder: 'احمد صالحی',
    acctNo: '0102223334445',
    opening: 22000000
  })

  const till = book.account({ key: 'till', title: 'صندوق مغازه', kind: 'نقدی', opening: 6500000 })

  const P = (key, first, last, phone) => L.person(TAG, key, first, last, { phones: [phone] })

  const novin = P('novin', 'فروشگاه', 'نوین‌کالا', '02155667788')
  const arman = P('arman', 'شرکت', 'پخش آرمان', '02144556677')
  const hosseini = P('hosseini', 'آقای', 'حسینی', '09121230001')
  const karimi = P('karimi', 'خانم', 'کریمی', '09121230002')
  const rezaei = P('rezaei', 'آقای', 'رضایی', '09121230003')
  const kazemi = P('kazemi', 'آقای', 'کاظمی', '09121230004')
  const ebrahimi = P('ebrahimi', 'آقای', 'ابراهیمی', '09121230005')
  const asadi = P('asadi', 'پیمانکار', 'اسدی', '09121230006')
  const ahmadi = P('ahmadi', 'خانم', 'احمدی', '09121230007')
  const naderi = P('naderi', 'آقای', 'نادری (مالک مغازه)', '09121230008')
  const brother = P('brother', 'اکبر', 'صالحی', '09121230009')
  const people = [novin, arman, hosseini, karimi, rezaei, kazemi, ebrahimi, asadi, ahmadi, naderi, brother]

  const inc = (d, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'income', date: ago(d), title, category, amount, account, ...extra })

  const exp = (d, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'expense', date: ago(d), title, category, amount, account, ...extra })

  const round = (n, step) => Math.round(n / step) * step

  // ---- weekly sales (card terminal -> bank, cash -> till) and the cash deposits
  const saleDays = [54, 47, 40, 33, 26, 19, 12, 5]
  const cardSales = {}

  saleDays.forEach((d, i) => {
    const amount = round(55000000 + rnd() * 20000000, 100000)

    cardSales[d] = inc(d, `فروش کارتخوان هفته ${L.fa(i + 1)}`, 'فروش کارتخوان', amount, biz, { sub: 'کارتخوان', time: '12:00' })
    inc(d - 1, `فروش نقدی هفته ${L.fa(i + 1)}`, 'فروش نقدی', round(18000000 + rnd() * 8000000, 100000), till, { sub: 'صندوق', time: '20:30' })
  })

  ;[48, 34, 20, 6].forEach(d => {
    exp(d, 'واریز نقد صندوق به بانک', 'انتقال', 42000000, till, { sub: 'انتقال داخلی', time: '17:00' })
    inc(d, 'واریز نقد صندوق از مغازه', 'سایر', 42000000, biz, { sub: 'انتقال داخلی', time: '17:05' })
  })

  // ---- purchases from suppliers, wages, rent, shop bills
  ;[[52, 28500000, novin], [47, 33200000, arman], [41, 41000000, novin], [36, 26000000, arman], [31, 38400000, novin], [26, 30100000, arman], [21, 35500000, novin], [16, 27900000, arman], [10, 42000000, novin], [4, 31200000, arman]].forEach(
    ([d, amount, who]) => exp(d, `خرید کالا — ${L.fullName(who)}`, 'خرید کالا', amount, biz, { sub: 'کالا', counterparty: L.fullName(who), time: '10:30' })
  )

  ;[35, 5].forEach(d => {
    exp(d, 'حقوق کارگر — حسین', 'حقوق کارگر', 18000000, biz, { sub: 'حقوق', time: '09:00' })
    exp(d, 'حقوق کارگر — رضا', 'حقوق کارگر', 18000000, biz, { sub: 'حقوق', time: '09:05' })
  })

  ;[34, 4].forEach(d => exp(d, 'اجاره مغازه', 'اجاره و شارژ مغازه', 25000000, biz, { sub: 'اجاره', counterparty: L.fullName(naderi), time: '09:30' }))
  exp(19, 'قبض برق مغازه', 'قبوض', 2400000, biz, { sub: 'برق' })
  exp(30, 'تلفن و اینترنت مغازه', 'قبوض', 1100000, biz, { sub: 'اینترنت' })
  exp(24, 'بیمه تأمین اجتماعی مغازه', 'مالیات و بیمه', 7800000, biz, { sub: 'بیمه' })
  exp(15, 'تعمیر ویترین', 'تعمیرات', 3400000, till, { sub: 'تعمیرات' })

  // ---- own-money draw: shop account -> personal account (both sides recorded by hand)
  ;[30, 6].forEach(d => {
    exp(d, 'برداشت شخصی از حساب مغازه', 'انتقال', 30000000, biz, { sub: 'برداشت شخصی', time: '16:00' })
    inc(d, 'برداشت شخصی از مغازه', 'سایر', 30000000, pers, { sub: 'برداشت شخصی', time: '16:00' })
  })

  // ---- household
  ;[[50, 2240000], [43, 1980000], [36, 2650000], [28, 1740000], [21, 2310000], [14, 2090000], [7, 1860000], [3, 2450000]].forEach(([d, amount]) =>
    exp(d, 'خرید هفتگی منزل', 'خوراک', amount, pers, { sub: 'سوپرمارکت', time: '18:00' })
  )
  exp(32, 'قبض گاز و برق منزل', 'قبوض', 1450000, pers, { sub: 'برق' })
  exp(25, 'داروخانه و ویزیت دکتر', 'سلامت', 3200000, pers, { sub: 'پزشک' })
  exp(18, 'کمک به پسرم (شهریه دانشگاه)', 'خانواده و فرزند', 12000000, pers, { sub: 'شهریه' })
  exp(9, 'هدیه عروسی', 'هدیه و مناسبت', 3000000, pers)

  // ---- instalments: loan (due on the 10th), shop equipment (due on the 25th)
  const loanSpec = { title: 'وام سرمایه در گردش بانک ملی', count: 24, dueDay: 10, start: '2026-03-10', amount: 9500000, note: 'وام ۲۴ ماهه' }
  const equipSpec = { title: 'کارتخوان و ویترین یخچالی', count: 18, dueDay: 25, start: '2026-02-20', amount: 6800000, note: 'اقساط فروشگاه تجهیزات' }
  const dueOf = spec => L.planRowOf(TAG, spec.title, spec).plan.payments.map(p => p.dueDate)
  const daysSince = iso => Math.round((new Date(L.TODAY) - new Date(iso)) / 864e5)
  const loanDue = dueOf(loanSpec)
  const equipDue = dueOf(equipSpec)

  const paidOf = (due, skipLast = 0) => due.filter(d => d <= L.TODAY).length - skipLast

  const records = (spec, due, paidCount) => {
    const out = {}

    for (let n = 1; n <= paidCount; n += 1) {
      if (due[n - 1] < ANCHOR) continue
      out[n] = exp(daysSince(due[n - 1]), `قسط: ${spec.title} (#${n})`, 'قسط', spec.amount, biz, { time: '08:00' })
    }

    return out
  }

  const loanPaid = paidOf(loanDue)
  const equipPaid = paidOf(equipDue, 1) // the latest instalment is overdue and unpaid

  const loanPlan = L.planRowOf(TAG, loanSpec.title, { ...loanSpec, paidUntil: loanDue[loanPaid - 1], records: records(loanSpec, loanDue, loanPaid) })
  const equipPlan = L.planRowOf(TAG, equipSpec.title, { ...equipSpec, paidUntil: equipDue[equipPaid - 1], records: records(equipSpec, equipDue, equipPaid) })

  // ---- checks (given = پرداختی, received = دریافتی)
  const dirCol = L.heads.CHECKS_HEADERS.indexOf('نوع چک')
  const paidCheckRec = (d, number, who, amount) => exp(d, `چک: ${number} — ${L.fullName(who)}`, 'چک', amount, biz, { note: `سررسید: ${ago(d)}`, time: '10:00' })
  const g6 = paidCheckRec(43, '4501220', novin, 16000000)
  const g1 = paidCheckRec(15, '4501231', arman, 9800000)

  const r4 = inc(15, `چک: 7788004 — ${L.fullName(ebrahimi)}`, 'چک', 5200000, biz, { note: `سررسید: ${ago(15)}`, time: '10:10' })

  const checks = [
    L.checkRowOf(TAG, 'g6', { number: '4501220', direction: 'paid', counterparty: L.fullName(novin), amount: 16000000, creationDate: ago(70), dueDate: ago(43), paid: true, paidAt: ago(43), recordId: g6.id }, dirCol),
    L.checkRowOf(TAG, 'g1', { number: '4501231', direction: 'paid', counterparty: L.fullName(arman), amount: 9800000, creationDate: ago(36), dueDate: ago(15), paid: true, paidAt: ago(15), recordId: g1.id }, dirCol),
    L.checkRowOf(TAG, 'g2', { number: '4501234', direction: 'paid', counterparty: L.fullName(novin), amount: 18500000, creationDate: ago(27), dueDate: ago(3) }, dirCol), // overdue by 3 days
    L.checkRowOf(TAG, 'g3', { number: '4501235', direction: 'paid', counterparty: L.fullName(arman), amount: 12000000, creationDate: ago(26), dueDate: L.ahead(2) }, dirCol), // due in 2 days
    L.checkRowOf(TAG, 'g4', { number: '4501236', direction: 'paid', counterparty: L.fullName(novin), amount: 22000000, creationDate: ago(17), dueDate: L.ahead(9) }, dirCol),
    L.checkRowOf(TAG, 'g5', { number: '4501237', direction: 'paid', counterparty: L.fullName(naderi), amount: 15000000, creationDate: ago(8), dueDate: L.ahead(24), sub: 'اجاره' }, dirCol),
    L.checkRowOf(TAG, 'r1', { number: '7788001', direction: 'received', counterparty: L.fullName(rezaei), amount: 6400000, creationDate: ago(26), dueDate: ago(1) }, dirCol), // overdue by a day
    L.checkRowOf(TAG, 'r2', { number: '7788002', direction: 'received', counterparty: L.fullName(karimi), amount: 8900000, creationDate: ago(29), dueDate: ago(12), sub: 'برگشتی' }, dirCol), // bounced: marked by hand
    L.checkRowOf(TAG, 'r3', { number: '7788003', direction: 'received', counterparty: L.fullName(kazemi), amount: 3500000, creationDate: ago(12), dueDate: L.ahead(3) }, dirCol),
    L.checkRowOf(TAG, 'r4', { number: '7788004', direction: 'received', counterparty: L.fullName(ebrahimi), amount: 5200000, creationDate: ago(40), dueDate: ago(15), paid: true, paidAt: ago(15), recordId: r4.id }, dirCol),
    L.checkRowOf(TAG, 'r5', { number: '7788005', direction: 'received', counterparty: 'تعاونی فرهنگیان', amount: 25000000, creationDate: ago(5), dueDate: L.ahead(16) }, dirCol)
  ]

  // ---- receivables (customers) and debts (suppliers)
  const hosseiniPay = inc(14, 'طلب: فروش نسیه — آقای حسینی', 'طلب', 5000000, biz, { sub: 'مشتری', counterparty: L.fullName(hosseini) })
  const asadiPay1 = inc(33, 'طلب: فروش نسیه — پیمانکار اسدی', 'طلب', 12000000, biz, { sub: 'مشتری', counterparty: L.fullName(asadi) })
  const asadiPay2 = inc(13, 'طلب: فروش نسیه — پیمانکار اسدی', 'طلب', 8000000, biz, { sub: 'مشتری', counterparty: L.fullName(asadi) })

  const recv = (key, who, title, amount, daysAgo, category, payments = [], note = '') =>
    L.receivableRowOf(TAG, key, { title, debtor: L.fullName(who), debtorId: who.id, category, amount, borrowDate: ago(daysAgo), payments, note })

  const receivables = [
    recv('hosseini', hosseini, 'فروش نسیه — آقای حسینی', 14000000, 35, 'مشتری', [L.payment(TAG, 'hosseini-1', 5000000, ago(14), '', hosseiniPay.id)]),
    recv('asadi', asadi, 'فروش نسیه — پیمانکار اسدی', 32000000, 50, 'مشتری', [
      L.payment(TAG, 'asadi-1', 12000000, ago(33), '', asadiPay1.id),
      L.payment(TAG, 'asadi-2', 8000000, ago(13), '', asadiPay2.id)
    ]),
    recv('ahmadi', ahmadi, 'فروش نسیه — خانم احمدی', 3800000, 8, 'مشتری'),
    recv('brother', brother, 'قرض به برادر', 2000000, 60, 'شخصی', [], 'برای خرید لوازم')
  ]

  const novinPay = exp(12, 'بدهی: خرید کالا نسیه — نوین‌کالا', 'بدهی', 20000000, biz, { sub: 'خرید', counterparty: L.fullName(novin), time: '11:00' })

  const debts = [
    L.dangRowOf(TAG, 'novin', {
      title: 'خرید کالا نسیه — نوین‌کالا',
      category: 'خرید',
      counterparty: L.fullName(novin),
      amount: 48000000,
      date: ago(30),
      payments: [L.payment(TAG, 'novin-1', 20000000, ago(12), '', novinPay.id)]
    }),
    L.dangRowOf(TAG, 'arman', { title: 'خرید کالا — پخش آرمان', category: 'خرید', counterparty: L.fullName(arman), amount: 26500000, date: ago(21), note: 'تسویه پایان ماه' }),
    L.dangRowOf(TAG, 'bro-debt', { title: 'قرض از برادر', category: 'قرض', counterparty: L.fullName(brother), amount: 10000000, date: ago(45) })
  ]

  const reminder = (key, category, title, dueDate, recurrence, amount, daysBefore) => [
    uid(`${TAG}:rem:${key}`), L.stamp(ago(30), '09:00'), category, title, dueDate, recurrence, String(amount), String(daysBefore), 'TRUE'
  ]

  const out = book.build()

  const incomeCats = ['فروش کارتخوان', 'فروش نقدی', 'چک', 'طلب', 'سود و سرمایه', 'سایر']
  const expenseCats = ['خرید کالا', 'اجاره و شارژ مغازه', 'حقوق کارگر', 'قبوض', 'مالیات و بیمه', 'تعمیرات', 'خوراک', 'سلامت', 'خانواده و فرزند', 'هدیه و مناسبت', 'قسط', 'چک', 'بدهی', 'انتقال', 'سایر']

  const groups = { ...L.emptyGroups(), income: incomeCats, expense: expenseCats, receivable: ['مشتری', 'شخصی', 'قرض', 'سازمان', 'سایر'] }

  const data = {
    درآمد: out.income,
    هزینه: out.expense,
    [L.names.WALLET_SHEET]: out.wallet,
    [L.names.WALLET_LEDGER_SHEET]: out.ledger,
    [L.names.CATEGORIES_SHEET]: L.categoryRows(groups),
    [L.names.PERIOD_SETTINGS_SHEET]: L.periodRows(ANCHOR),
    [L.names.MONTHLY_BALANCE_SHEET]: L.monthlyBalanceRows(ANCHOR, L.openingTotal(book)),
    [L.names.COUNTERPARTIES_SHEET]: [L.heads.COUNTERPARTIES_HEADERS, ...people.map(L.personRow)],
    [L.names.INSTALLMENTS_SHEET]: [L.heads.INSTALLMENTS_HEADERS, loanPlan.row, equipPlan.row],
    [L.names.CHECKS_SHEET]: [L.heads.CHECKS_HEADERS, ...checks],
    [L.names.RECEIVABLES_SHEET]: [L.heads.RECEIVABLES_HEADERS, ...receivables],
    [L.names.DANG_SHEET]: [L.heads.DANG_HEADERS, ...debts],
    [L.names.PERSONAL_REMINDERS_SHEET]: [
      L.heads.PERSONAL_REMINDERS_HEADERS,
      reminder('tamin', 'بیمه', 'بیمه تأمین اجتماعی مغازه', L.ahead(7), 'monthly', 7800000, 3),
      reminder('vat', 'مالیات', 'ارزش افزوده فصل پاییز', L.ahead(24), 'none', 18000000, 5),
      reminder('rent', 'سایر', 'اجاره مغازه', L.ahead(25), 'monthly', 25000000, 3)
    ]
  }

  // ---- bank SMS
  const mellatOf = e => F.mellat(e.verb, { toman: e.toman, balance: e.balance, ref: '6104***0099', day: e.day, time: e.time })
  const melliOf = e => F.melli(e.verb, { toman: e.toman, balance: e.balance, acct: pers.acctNo, day: e.day, time: e.time })

  // «مانده» chain: see L.chainBalances. The overdue instalment (newest pending on the shop
  // account) is the deliberate +1M case; the personal account's chain is exact.
  const bizEvents = L.chainBalances(
    book,
    biz,
    [
      { day: ago(1), time: '10:20', verb: 'برداشت', toman: 18500000, delta: -18500000 }, // = overdue check 4501234
      { day: ago(2), time: '15:00', verb: 'واریز', toman: 9000000, delta: 9000000 }, // = what Mr Hosseini still owes
      { day: ago(5), time: '12:05', verb: 'واریز', toman: cardSales[5].amount, delta: cardSales[5].amount, recorded: true },
      { day: ago(0), time: '07:30', verb: 'برداشت', toman: 6800000, delta: -6800000 }, // = overdue instalment of the equipment plan
      { day: ago(6), time: '16:01', verb: 'برداشت', toman: 30000000, delta: -30000000, recorded: true }
    ],
    { deliberateOff: 1000000 }
  )

  const persEvents = L.chainBalances(book, pers, [
    { day: ago(6), time: '16:02', verb: 'واریز', toman: 30000000, delta: 30000000, recorded: true },
    { day: ago(2), time: '18:10', verb: 'خرید', toman: 1860000, delta: -1860000 }
  ])

  const overdueCheck = bizEvents.find(e => e.toman === 18500000)

  const meta = []
  const tracked = (account, item, e) => {
    meta.push(L.chainMeta(item, e.status, { account: account.id, ...(e.off ? { offToman: e.off } : {}) }))

    return item
  }
  const checkRepeat = L.sms({ sender: 'BankMellat', day: overdueCheck.day, time: '10:21', body: mellatOf(overdueCheck), idSalt: '#2' })

  meta.push(L.chainMeta(checkRepeat, 'redelivery'))

  const smsList = [
    ...bizEvents.map(e => tracked(biz, L.sms({ sender: 'BankMellat', day: e.day, time: e.time, body: mellatOf(e) }), e)),
    ...persEvents.map(e => tracked(pers, L.sms({ sender: 'BMI', day: e.day, time: e.time, body: melliOf(e) }), e)),
    checkRepeat,
    L.sms({ sender: 'BankMellat', day: ago(4), time: '10:00', body: F.promo('بانک ملت') }),
    L.sms({ sender: '10002040', day: ago(1), time: '13:30', body: F.posNotice({ shop: 'پخش آرمان', toman: 4200000, cardTail: '0099', day: ago(1), time: '13:30' }) })
  ].sort((a, b) => a.receivedAt - b.receivedAt)

  const taught = (account, key, sample) => L.templateRow(TAG, key, account, sample, { unit: 'rial' })
  const m0 = (verb, day) => F.mellat(verb, { toman: 100000, balance: 5000000, ref: '6104***0099', day, time: '18:40' })
  const s0 = (verb, day) => F.melli(verb, { toman: 100000, balance: 5000000, acct: pers.acctNo, day, time: '18:40' })

  const templates = [
    taught(biz, 'biz-out', m0('برداشت', ago(40))),
    taught(biz, 'biz-in', m0('واریز', ago(40))),
    taught(pers, 'pers-buy', s0('خرید', ago(40))),
    taught(pers, 'pers-out', s0('برداشت', ago(40))),
    taught(pers, 'pers-in', s0('واریز', ago(40)))
  ]

  data[L.names.SMS_TEMPLATES_SHEET] = [L.heads.SMS_TEMPLATES_HEADERS, ...templates.map(t => t.row)]

  return { data, sms: smsList, meta, templates: templates.map(t => t.template), book, accounts: [biz, pers, till] }
}
