// Persona 1: housewife (45). Household money in toman, one bank card + cash, small family loans, one appliance instalment.
import * as L from './lib.mjs'
import * as A from './areas.mjs'
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
    opening: 55000000
  })

  // ---- people
  const sister = L.person(TAG, 'sister', 'فرزانه', 'محمدی', { phones: ['09121112233'] })
  const brother = L.person(TAG, 'brother', 'علی', 'نوروزی', { phones: ['09123334455'] })
  const neighbor = L.person(TAG, 'neighbor', 'خانم', 'احمدی', { phones: ['09351234567'] })
  const shop = L.person(TAG, 'shop', 'سوپرمارکت', 'رفاه', { phones: ['02177889900'] })
  const mom = L.person(TAG, 'mom', 'مادرم', '', { phones: ['09121110001'], note: 'مادر من' })
  const mechanic = L.person(TAG, 'mechanic', 'استاد', 'رحیمی (مکانیک)', { phones: ['09123330044'], note: 'تعمیرگاه پژو، خیابان کارگر' })
  const brotherInLaw = L.person(TAG, 'bil', 'حسین', 'کریمی', { phones: ['09351110022'], note: 'برادر همسر' })
  const school = L.person(TAG, 'school', 'مدرسه', 'شهید بهشتی', { phones: ['02133445566'] })
  const people = [sister, brother, neighbor, shop, mom, mechanic, brotherInLaw, school]

  // ---- income
  const inc = (daysAgo, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'income', date: ago(daysAgo), title, category, amount, account, ...extra })

  inc(61, 'خرجی ماهانه از همسر', 'هدیه و یارانه', 38000000, card, { sub: 'خرجی', time: '09:10' })
  inc(30, 'خرجی ماهانه از همسر', 'هدیه و یارانه', 38000000, card, { sub: 'خرجی', time: '09:12' })
  inc(40, 'هدیه مادر', 'هدیه و یارانه', 2000000, cash, { time: '16:00', counterparty: L.fullName(mom) })
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
      counterparty: i % 3 === 0 ? L.fullName(shop) : '',
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
  exp(35, 'شهریه مدرسه — قسط اول', 'آموزش', 9500000, card, { sub: 'مدرسه', time: '10:00', counterparty: L.fullName(school) })
  exp(21, 'کلاس زبان دخترم', 'آموزش', 3200000, card, { sub: 'کلاس' })
  exp(5, 'شهریه مدرسه — قسط دوم', 'آموزش', 9500000, card, { sub: 'مدرسه', time: '10:05', counterparty: L.fullName(school) })

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

  // ---- the family car (vehicles module): 3 periodic services, a mechanic visit, fuel, deadlines.
  // Insurance ends in 3 weeks; the technical inspection ran out 12 days ago.
  const veh = A.vehicleKit(book, TAG)
  const rahimi = L.fullName(mechanic)

  const car = veh.vehicle({
    key: '206',
    title: 'پژو ۲۰۶ — ماشین خانواده',
    startKm: 106400,
    since: ago(64),
    vin: 'NAAP03EE5CJ245871',
    year: '1395',
    capacity: '5 نفر',
    plate: A.plate('12', 'ب', '645', '33'),
    interval: 'first-of-month'
  })

  // an old oil change typed in afterwards (no expense in the books, no reading)
  veh.service(car, { type: 'روغن موتور', d: 230, km: 99300, intervalKm: 7500, brand: 'شل هلیکس', location: 'روغنی پیروزی', amount: 1500000, account: card, historical: true })
  veh.service(car, { type: 'روغن موتور', d: 62, km: 106850, intervalKm: 7500, brand: 'شل هلیکس HX7', location: 'روغنی پیروزی', amount: 1650000, account: card })
  veh.fuel(car, 58, 30, 107200, card)
  veh.fuel(car, 52, 28, 107690, card)
  veh.fuel(car, 46, 32, 108230, cash)
  veh.service(car, { type: 'لنت ترمز', d: 44, km: 108520, intervalKm: 40000, brand: 'لنت ایران‌خودرو', location: 'تعمیرگاه استاد رحیمی', amount: 2800000, account: card, counterparty: rahimi })
  veh.fuel(car, 39, 27, 108950, card)

  veh.mechanic(car, {
    d: 36,
    km: 109300,
    location: 'تعمیرگاه استاد رحیمی',
    items: [
      { category: 'جلو بندی', note: 'تعویض spiral جلو' },
      { category: 'برق', note: 'تعویض سنسور دما' }
    ],
    amount: 3400000,
    account: card,
    counterparty: rahimi
  })

  veh.fuel(car, 32, 29, 109640, cash)
  veh.service(car, { type: 'باتری', d: 27, km: 110020, intervalKm: 60000, brand: 'صبا باتری ۶۰ آمپر', location: 'باتری‌سازی مهدوی', amount: 5900000, account: card })
  veh.fuel(car, 22, 31, 110420, card)
  veh.fuel(car, 16, 33, 110980, cash)
  veh.fuel(car, 10, 26, 111470, card)
  veh.fuel(car, 4, 30, 111960, card)
  veh.reading(car, 1, 112100)

  veh.deadline(car, { category: 'بیمه شخص ثالث', start: ago(344), end: L.ahead(21), amount: 6400000, reminder: true, daysBefore: 7, renewals: [{ start: ago(709), end: ago(344), km: 82000, amount: 4800000 }] })
  veh.deadline(car, { category: 'معاینه فنی', start: ago(377), end: ago(12), amount: 1350000, notes: 'مرکز معاینه فنی شماره ۱۲', reminder: true, daysBefore: 3, renewals: [{ start: ago(742), end: ago(377), km: 81500, amount: 1200000 }] })

  // ---- savings goals: money leaves the card account into the goal (a ledger line each)
  const goals = A.goalKit(book, TAG)
  const north = goals.goal({ key: 'north', title: 'سفر شمال', target: 45000000, targetDate: L.ahead(145), account: card, note: 'نوروز ۱۴۰۶، یک هفته در رامسر', since: ago(52) })
  const dowry = goals.goal({ key: 'dowry', title: 'جهیزیه دختر', target: 400000000, targetDate: L.ahead(1100), account: card, note: 'پس‌انداز بلندمدت، ماهی ۴ میلیون', since: ago(60) })

  goals.deposit(dowry, 55, 4000000)
  goals.deposit(north, 48, 6000000)
  goals.deposit(dowry, 26, 4000000)
  goals.deposit(north, 19, 6500000)
  goals.deposit(north, 3, 3500000)
  goals.deposit(dowry, 4, 4500000)

  // ---- recurring items: the allowance comes on the 5th (the pending SMS below is the same money)
  const recurringRows = [
    A.recurringRowOf(TAG, 'allowance', { type: 'income', category: 'هدیه و یارانه', sub: 'خرجی', account: card, amount: 38000000, title: 'خرجی ماهانه از همسر', day: 5, lastPosted: '1405-07' }),
    A.recurringRowOf(TAG, 'internet', { type: 'expense', category: 'قبوض', sub: 'اینترنت', account: card, amount: 1150000, title: 'اینترنت ماهانه', day: 23, lastPosted: '1405-07' }),
    A.recurringRowOf(TAG, 'filimo', { type: 'expense', category: 'تفریح و سفر', sub: 'اشتراک', account: card, amount: 150000, title: 'اشتراک فیلیمو', day: 14, lastPosted: '1405-07' })
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
        ['پوشاک و زیبایی', 3000000],
        ['خودرو', 3000000]
      ],
      ago(50)
    ),
    [L.names.PERSONAL_REMINDERS_SHEET]: [
      L.heads.PERSONAL_REMINDERS_HEADERS,
      reminderRow('power', { category: 'قبض', title: 'قبض برق', dueDate: L.ahead(6), recurrence: 'monthly', amount: 800000, daysBefore: 2 }),
      reminderRow('life', { category: 'بیمه', title: 'بیمه عمر', dueDate: L.ahead(40), recurrence: 'yearly', amount: 6000000, daysBefore: 7 }),
      A.reminderRowOf(TAG, 'tuition3', { category: 'سایر', title: 'قسط سوم شهریه مدرسه', due: L.ahead(34), recurrence: 'none', amount: 9500000, daysBefore: 7 }),
      A.reminderRowOf(TAG, 'municipality', { category: 'مالیات', title: 'عوارض نوسازی شهرداری', due: L.ahead(95), recurrence: 'yearly', amount: 2400000, daysBefore: 7 }),
      // switched off on purpose: it must not show on the dashboard
      A.reminderRowOf(TAG, 'filimo', { category: 'اشتراک', title: 'تمدید اشتراک فیلیمو', due: L.ahead(18), recurrence: 'monthly', amount: 150000, daysBefore: 1, enabled: false })
    ],
    [L.names.RECURRING_SHEET]: [L.heads.RECURRING_HEADERS, ...recurringRows],
    [L.names.TREASURY_GOALS_SHEET]: goals.rows(),
    ...veh.tabs()
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

  // «مانده» chain: see L.chainBalances. The allowance (newest pending) is the deliberate +1M case.
  const events = L.chainBalances(
    book,
    card,
    [
      { day: ago(2), time: '17:41', verb: 'خرید', toman: 420000, delta: -420000, recorded: true },
      { day: ago(2), time: '19:20', verb: 'برداشت', toman: 3000000, delta: -3000000 },
      { day: ago(2), time: '19:21', verb: 'برداشت', toman: 2500, delta: -2500 }, // ATM fee
      { day: ago(1), time: '12:15', verb: 'خرید', toman: 1850000, delta: -1850000 },
      { day: ago(0), time: '08:05', verb: 'واریز', toman: 38000000, delta: 38000000 }
    ],
    { deliberateOff: 1000000 }
  )

  const body = e =>
    F.melli(e.verb, { toman: e.toman, balance: e.balance, acct: card.acctNo, day: e.day, time: e.time })

  const swipe = events.find(e => e.toman === 1850000)

  const meta = []
  const smsList = [
    ...events.map(e => {
      const item = L.sms({ sender, day: e.day, time: e.time, body: body(e) })

      meta.push(L.chainMeta(item, e.status, { account: card.id, ...(e.off ? { offToman: e.off } : {}) }))

      return item
    }),
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

  meta.push(L.chainMeta(L.sms({ sender, day: swipe.day, time: '12:16', body: body(swipe), idSalt: '#2' }), 'redelivery'))

  return { data, sms: smsList, meta, templates: templates.map(t => t.template), book, card, cash }
}
