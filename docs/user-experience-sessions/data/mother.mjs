// Persona 1: housewife (45). Household money in toman, one bank card + cash, small family loans, one appliance instalment.
import * as L from './lib.mjs'
import * as F from './smsFormats.mjs'

const { ago, uid } = L
const TAG = 'mother'
const ANCHOR = '2026-08-23' // 1 Shahrivar 1405, the first month the book covers

export function buildMother() {
  const book = new L.Book(TAG, ANCHOR)

  const cash = book.account({ key: 'cash', title: 'پول نقد خانه', kind: 'نقدی', opening: 12000000 })

  const card = book.account({
    key: 'card',
    title: 'کارت خرج خانه',
    bank: 'بانک ملی',
    card: '6037997788901234',
    holder: 'زهرا محمدی',
    acctNo: '0101234567001',
    opening: 15000000
  })

  // ---- people
  const sister = L.person(TAG, 'sister', 'فرزانه', 'محمدی', { phones: ['09121112233'] })
  const brother = L.person(TAG, 'brother', 'علی', 'نوروزی', { phones: ['09123334455'] })
  const neighbor = L.person(TAG, 'neighbor', 'خانم', 'احمدی', { phones: ['09351234567'] })
  const shop = L.person(TAG, 'shop', 'سوپرمارکت', 'رفاه', { phones: ['02177889900'] })
  const people = [sister, brother, neighbor, shop]

  // ---- income
  const inc = (daysAgo, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'income', date: ago(daysAgo), title, category, amount, account, ...extra })

  inc(61, 'خرجی ماهانه از همسر', 'هدیه و یارانه', 38000000, card, { sub: 'خرجی', time: '09:10' })
  inc(30, 'خرجی ماهانه از همسر', 'هدیه و یارانه', 38000000, card, { sub: 'خرجی', time: '09:12' })
  inc(40, 'هدیه مادر', 'هدیه و یارانه', 2000000, cash, { time: '16:00' })
  inc(7, 'خرجی اضافه برای شهریه', 'هدیه و یارانه', 3000000, cash, { time: '10:30' })

  // ---- expenses
  const exp = (daysAgo, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'expense', date: ago(daysAgo), title, category, amount, account, ...extra })

  const groceries = [
    [54, 1850000], [50, 1240000], [46, 2310000], [41, 980000], [37, 1760000], [33, 2040000],
    [28, 1390000], [24, 2580000], [19, 1120000], [15, 1960000], [10, 1480000], [6, 2230000],
    [2, 1675000]
  ]

  groceries.forEach(([d, amt], i) =>
    exp(d, i % 3 === 0 ? 'خرید هفتگی از سوپرمارکت' : 'خرید میوه و مواد غذایی', 'خوراک', amt, i % 4 === 0 ? cash : card, {
      sub: i % 3 === 0 ? 'سوپرمارکت' : 'میوه و سبزی',
      time: '11:20'
    })
  )

  exp(47, 'قبض برق شهریور', 'قبوض', 640000, card, { sub: 'برق' })
  exp(44, 'اینترنت ماهانه', 'قبوض', 1150000, card, { sub: 'اینترنت' })
  exp(20, 'قبض برق مهر', 'قبوض', 780000, card, { sub: 'برق' })
  exp(18, 'قبض گاز', 'قبوض', 420000, card, { sub: 'گاز' })
  exp(17, 'قبض آب', 'قبوض', 310000, card, { sub: 'آب' })
  exp(12, 'اینترنت ماهانه', 'قبوض', 1150000, card, { sub: 'اینترنت' })

  exp(40, 'لوازم‌التحریر بچه‌ها', 'آموزش', 1850000, cash, { sub: 'لوازم‌التحریر' })
  exp(35, 'شهریه مدرسه — قسط اول', 'آموزش', 9500000, card, { sub: 'مدرسه', time: '10:00' })
  exp(21, 'کلاس زبان دخترم', 'آموزش', 3200000, card, { sub: 'کلاس' })
  exp(5, 'شهریه مدرسه — قسط دوم', 'آموزش', 9500000, card, { sub: 'مدرسه', time: '10:05' })

  exp(30, 'داروخانه', 'سلامت', 680000, cash, { sub: 'دارو' })
  exp(26, 'ویزیت دکتر', 'سلامت', 1500000, cash, { sub: 'پزشک' })
  exp(14, 'دندانپزشک', 'سلامت', 4500000, card, { sub: 'دندان' })
  exp(2, 'داروخانه', 'سلامت', 420000, card, { sub: 'دارو', time: '17:40' })

  exp(29, 'اسنپ', 'حمل‌ونقل', 190000, cash, { sub: 'تاکسی' })
  exp(16, 'اسنپ', 'حمل‌ونقل', 230000, cash, { sub: 'تاکسی' })
  exp(8, 'اسنپ', 'حمل‌ونقل', 175000, cash, { sub: 'تاکسی' })

  exp(42, 'لباس مدرسه بچه‌ها', 'پوشاک و زیبایی', 3800000, card)
  exp(9, 'آرایشگاه', 'پوشاک و زیبایی', 1400000, cash)
  exp(13, 'کادوی تولد خواهرزاده', 'هدیه و مناسبت', 1200000, cash)
  exp(11, 'مواد شوینده و نظافت', 'خانه', 890000, card)
  exp(27, 'تعمیر شیر آب آشپزخانه', 'خانه', 650000, cash)
  exp(3, 'شارژ سیم‌کارت', 'سایر', 300000, cash)

  // ---- instalment: fridge, 12 x 4.2M, due on the 25th of each Jalali month
  const fridge = L.planRowOf(TAG, 'fridge', {
    title: 'یخچال ساید بای ساید',
    count: 12,
    dueDay: 25,
    start: '2026-08-20',
    amount: 4200000,
    note: 'خرید از فروشگاه لوازم خانگی'
  })

  const due = fridge.plan.payments.map(p => p.dueDate)
  const paidCount = due.filter(d => d <= L.TODAY).length
  const fridgeRecords = {}

  for (let n = 1; n <= paidCount; n += 1) {
    fridgeRecords[n] = exp(
      L.TODAY > due[n - 1] ? Math.round((new Date(L.TODAY) - new Date(due[n - 1])) / 864e5) : 0,
      `قسط: یخچال ساید بای ساید (#${n})`,
      'قسط',
      4200000,
      card,
      { time: '08:30' }
    )
  }

  const fridgePlan = L.planRowOf(TAG, 'fridge', {
    title: 'یخچال ساید بای ساید',
    count: 12,
    dueDay: 25,
    start: '2026-08-20',
    amount: 4200000,
    note: 'خرید از فروشگاه لوازم خانگی',
    paidUntil: due[paidCount - 1],
    records: fridgeRecords
  })

  // ---- debts (دنگ tab) and receivables (طلب‌ها tab)
  const debtPayRecord = exp(7, 'بدهی: قرض از خواهر شوهر', 'بدهی', 2000000, cash, {
    sub: 'قرض',
    counterparty: L.fullName(sister),
    time: '15:00'
  })

  const debts = [
    L.dangRowOf(TAG, 'sister-loan', {
      title: 'قرض از خواهر شوهر',
      category: 'قرض',
      counterparty: L.fullName(sister),
      amount: 5000000,
      date: ago(24),
      note: 'برای شهریه مدرسه',
      payments: [L.payment(TAG, 'sister-1', 2000000, ago(7), '', debtPayRecord.id)]
    }),
    L.dangRowOf(TAG, 'lamp', {
      title: 'ست آشپزخانه از همسایه',
      category: 'خرید',
      counterparty: L.fullName(neighbor),
      amount: 1600000,
      date: ago(15),
      payments: []
    })
  ]

  const brotherIncome = inc(3, 'طلب: قرض به برادر', 'طلب', 1000000, cash, {
    sub: 'قرض',
    counterparty: L.fullName(brother),
    time: '12:30'
  })

  const receivables = [
    L.receivableRowOf(TAG, 'brother', {
      title: 'قرض به برادر',
      debtor: L.fullName(brother),
      debtorId: brother.id,
      category: 'قرض',
      amount: 3000000,
      borrowDate: ago(45),
      payments: [L.payment(TAG, 'brother-1', 1000000, ago(3), '', brotherIncome.id)]
    }),
    L.receivableRowOf(TAG, 'neighbor', {
      title: 'پول خرید گوشت',
      debtor: L.fullName(neighbor),
      debtorId: neighbor.id,
      category: 'شخصی',
      amount: 1200000,
      borrowDate: ago(20)
    })
  ]

  // ---- reminders, budgets
  const reminderRow = (key, p) => [
    uid(`${TAG}:rem:${key}`),
    L.stamp(ago(30), '09:00'),
    p.category,
    p.title,
    p.dueDate,
    p.recurrence,
    String(p.amount),
    String(p.daysBefore),
    'TRUE'
  ]

  const out = book.build()

  const data = {
    ['درآمد']: out.income,
    ['هزینه']: out.expense,
    [L.names.WALLET_SHEET]: out.wallet,
    [L.names.WALLET_LEDGER_SHEET]: out.ledger,
    [L.names.CATEGORIES_SHEET]: L.categoryRows(L.defaultGroups()),
    [L.names.PERIOD_SETTINGS_SHEET]: L.periodRows(ANCHOR),
    [L.names.MONTHLY_BALANCE_SHEET]: L.monthlyBalanceRows(ANCHOR, L.openingTotal(book)),
    [L.names.COUNTERPARTIES_SHEET]: [L.heads.COUNTERPARTIES_HEADERS, ...people.map(L.personRow)],
    [L.names.INSTALLMENTS_SHEET]: [L.heads.INSTALLMENTS_HEADERS, fridgePlan.row],
    [L.names.DANG_SHEET]: [L.heads.DANG_HEADERS, ...debts],
    [L.names.RECEIVABLES_SHEET]: [L.heads.RECEIVABLES_HEADERS, ...receivables],
    [L.names.BUDGETS_SHEET]: L.budgetRows(
      [
        ['خوراک', 14000000],
        ['آموزش', 12000000],
        ['سلامت', 3000000],
        ['قبوض', 3000000],
        ['حمل‌ونقل', 1000000],
        ['پوشاک و زیبایی', 3000000]
      ],
      ago(50)
    ),
    [L.names.PERSONAL_REMINDERS_SHEET]: [
      L.heads.PERSONAL_REMINDERS_HEADERS,
      reminderRow('power', { category: 'قبض', title: 'قبض برق', dueDate: L.ahead(6), recurrence: 'monthly', amount: 800000, daysBefore: 2 }),
      reminderRow('life', { category: 'بیمه', title: 'بیمه عمر', dueDate: L.ahead(40), recurrence: 'yearly', amount: 6000000, daysBefore: 7 })
    ]
  }

  // ---- bank SMS (Melli card). Templates are what the app learns from a first sample.
  const taught = (key, sample) => L.templateRow(TAG, key, card, sample, { unit: 'rial' })
  const sample = (verb, day) =>
    F.melli(verb, { toman: 100000, balance: 5000000, acct: card.acctNo, day, time: '18:40' })

  const templates = [
    taught('buy', sample('خرید', ago(40))),
    taught('out', sample('برداشت', ago(40))),
    taught('in', sample('واریز', ago(40)))
  ]

  data[L.names.SMS_TEMPLATES_SHEET] = [L.heads.SMS_TEMPLATES_HEADERS, ...templates.map(t => t.row)]

  const sender = 'BMI'

  const events = L.runningBalances(book, card, [
    { day: ago(2), time: '17:41', verb: 'خرید', toman: 420000, delta: -420000, recorded: true },
    { day: ago(1), time: '12:15', verb: 'خرید', toman: 1850000, delta: -1850000 },
    { day: ago(0), time: '08:05', verb: 'واریز', toman: 38000000, delta: 38000000 },
    { day: ago(5), time: '19:20', verb: 'برداشت', toman: 3000000, delta: -3000000 },
    { day: ago(6), time: '09:00', verb: 'برداشت', toman: 2500, delta: -2500 }
  ])

  const body = e =>
    F.melli(e.verb, { toman: e.toman, balance: e.balance, acct: card.acctNo, day: e.day, time: e.time })

  const swipe = events.find(e => e.toman === 1850000)

  const smsList = [
    ...events.map(e => L.sms({ sender, day: e.day, time: e.time, body: body(e) })),
    // the same body again a minute later (double swipe): its own id so it stays a separate card
    L.sms({ sender, day: swipe.day, time: '12:16', body: body(swipe), idSalt: '#2' }),
    // marketing: not financial
    L.sms({ sender, day: ago(4), time: '10:00', body: F.promo('بانک ملی ایران') }),
    // a POS notice in a shape without a template (shows up as «unknown», can be taught)
    L.sms({
      sender: '10002040',
      day: ago(3),
      time: '14:02',
      body: F.posNotice({ shop: 'سوپرمارکت رفاه', toman: 34500, cardTail: '1234', day: ago(3), time: '14:02' })
    })
  ].sort((a, b) => a.receivedAt - b.receivedAt)

  return { data, sms: smsList, templates: templates.map(t => t.template), book, card, cash }
}
