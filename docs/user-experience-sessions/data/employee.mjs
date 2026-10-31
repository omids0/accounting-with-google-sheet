// Persona 2: salaried accountant (28). Two bank accounts + cash, rent, loan instalments, checks,
// and deliberately tricky rows: a refund, a transfer between own accounts, near-duplicate entries.
import * as L from './lib.mjs'
import * as AR from './areas.mjs'
import * as F from './smsFormats.mjs'

const { ago, uid } = L
const TAG = 'employee'
const ANCHOR = '2026-08-23'

export function buildEmployee() {
  const book = new L.Book(TAG, ANCHOR)

  const A = book.account({
    key: 'salary',
    title: 'حقوق — بانک ملی',
    bank: 'بانک ملی',
    card: '6037998811223344',
    holder: 'امیرحسین کاظمی',
    acctNo: '0105551234002',
    opening: 25000000
  })

  const B = book.account({
    key: 'saving',
    title: 'پس‌انداز — بانک ملت',
    bank: 'بانک ملت',
    card: '6104337745671234',
    holder: 'امیرحسین کاظمی',
    acctNo: '9876543210',
    opening: 60000000
  })

  const C = book.account({ key: 'cash', title: 'پول نقد', kind: 'نقدی', opening: 6000000 })

  const landlord = L.person(TAG, 'landlord', 'آقای', 'نادری', { phones: ['09121234567'] })
  const friend = L.person(TAG, 'friend', 'سعید', 'رحیمی', { phones: ['09351112233'] })
  const engineer = L.person(TAG, 'eng', 'مهندس', 'کاویانی', { phones: ['09124445566'] })
  const pedram = L.person(TAG, 'pedram', 'پدرام', 'شیرازی', { phones: ['09190001122'] })
  const arian = L.person(TAG, 'arian', 'شرکت', 'آرین‌تجارت', { phones: ['02188776655'], note: 'مشتری پروژه سیستم حسابداری' })
  const nilo = L.person(TAG, 'nilo', 'فروشگاه', 'نیلو', { phones: ['02177112233'], note: 'مشتری پروژه داشبورد فروش' })
  const mechanic = L.person(TAG, 'mechanic', 'استاد', 'کریمی (مکانیک)', { phones: ['09125556677'] })
  const reza = L.person(TAG, 'reza', 'رضا', 'مرادی', { phones: ['09128889900'], note: 'همسفر شمال' })
  const people = [landlord, friend, engineer, pedram, arian, nilo, mechanic, reza]

  const inc = (d, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'income', date: ago(d), title, category, amount, account, ...extra })

  const exp = (d, title, category, amount, account, extra = {}) =>
    book.rec({ type: 'expense', date: ago(d), title, category, amount, account, ...extra })

  // ---- income
  inc(35, 'حقوق شهریور', 'حقوق', 65000000, A, { time: '08:00' })
  inc(5, 'حقوق مهر', 'حقوق', 65000000, A, { time: '08:00' })
  inc(12, 'پروژه حسابداری برای مشتری', 'کار آزاد', 6500000, A, { sub: 'پروژه', counterparty: 'شرکت آرین‌تجارت' })
  inc(27, 'سود سپرده', 'سود و سرمایه', 1150000, B, { sub: 'سپرده', time: '06:30' })

  // ---- tricky: refund (earlier purchase 3.2M, money back 5 weeks later)
  exp(23, 'هدفون بی‌سیم', 'سایر', 3200000, A, { sub: 'لوازم دیجیتال', note: 'خرید آنلاین' })
  inc(9, 'بازگشت وجه هدفون', 'سایر', 3200000, A, { sub: 'مرجوعی', note: 'مرجوعی خرید ۱۲ مهر', time: '11:00' })

  // ---- tricky: own-account transfer entered by hand as an expense + an income
  exp(4, 'انتقال به پس‌انداز ملت', 'انتقال', 10000000, A, { sub: 'انتقال داخلی', time: '09:58' })
  inc(4, 'انتقال از حقوق ملی', 'سایر', 10000000, B, { sub: 'انتقال داخلی', time: '10:00' })

  // ---- fixed costs
  exp(34, 'اجاره مهر', 'خانه', 18000000, A, { sub: 'اجاره', counterparty: L.fullName(landlord), time: '09:00' })
  exp(33, 'اینترنت ماهانه', 'قبوض', 1350000, A, { sub: 'اینترنت' })
  exp(25, 'شارژ و پکیج موبایل', 'قبوض', 620000, A, { sub: 'موبایل' })
  exp(20, 'قبض برق', 'قبوض', 1245000, A, { sub: 'برق', time: '19:00' })
  exp(19, 'قبض برق', 'قبوض', 1245000, A, { sub: 'برق', time: '08:30' }) // near-duplicate, one day later
  exp(18, 'قبض گاز', 'قبوض', 520000, A, { sub: 'گاز' })
  exp(17, 'قبض آب', 'قبوض', 380000, A, { sub: 'آب' })

  // ---- loan + laptop instalments (real schedules from the app's own functions)
  const loanSpec = {
    title: 'وام شخصی بانک ملی',
    count: 24,
    dueDay: 5,
    start: '2026-03-04',
    amount: 4350000,
    note: 'وام ۱۰۰ میلیونی'
  }

  const laptopSpec = {
    title: 'لپ‌تاپ اقساطی',
    count: 10,
    dueDay: 15,
    start: '2026-07-01',
    amount: 3100000,
    note: 'فروشگاه دیجیتال'
  }

  const dueOf = spec => L.planRowOf(TAG, spec.title, spec).plan.payments.map(p => p.dueDate)
  const loanDue = dueOf(loanSpec)
  const laptopDue = dueOf(laptopSpec)

  // loan: everything before today's due date is paid, today's stays open (the SMS below is its debit)
  const loanPaid = loanDue.filter(d => d < L.TODAY).length
  const laptopPaid = laptopDue.filter(d => d <= L.TODAY).length
  const daysSince = iso => Math.round((new Date(L.TODAY) - new Date(iso)) / 864e5)

  const instRecords = (spec, due, paidCount) => {
    const records = {}

    for (let n = 1; n <= paidCount; n += 1) {
      if (due[n - 1] < ANCHOR) continue
      records[n] = exp(daysSince(due[n - 1]), `قسط: ${spec.title} (#${n})`, 'قسط', spec.amount, A, { time: '08:15' })
    }

    return records
  }

  const loanPlan = L.planRowOf(TAG, loanSpec.title, {
    ...loanSpec,
    paidUntil: loanDue[loanPaid - 1],
    records: instRecords(loanSpec, loanDue, loanPaid)
  })

  const laptopPlan = L.planRowOf(TAG, laptopSpec.title, {
    ...laptopSpec,
    paidUntil: laptopDue[laptopPaid - 1],
    records: instRecords(laptopSpec, laptopDue, laptopPaid)
  })

  // ---- food, transport, life: weekly groceries and ~3 lunches a week
  ;[[53, 1420000], [47, 1980000], [40, 1650000], [32, 2210000], [26, 1530000], [14, 1870000], [8, 1390000], [2, 2040000]].forEach(
    ([d, amt], i) => exp(d, 'خرید هفتگی', 'خوراک', amt, A, { sub: 'سوپرمارکت', time: '18:30' })
  )

  const lunchAmounts = [380000, 450000, 520000, 410000, 640000, 395000, 580000]
  let lunchIndex = 0

  for (let d = 55; d >= 1; d -= 1) {
    const weekday = new Date(`${ago(d)}T12:00:00Z`).getUTCDay() // 0 Sun .. 6 Sat

    if ([4, 5].includes(weekday)) continue // Thursday and Friday are the weekend
    if (d === 6) continue // the 21st has its own, hand-placed pair below
    if ((lunchIndex += 1) % 3 !== 0) continue

    exp(d, 'ناهار بیرون', 'خوراک', lunchAmounts[lunchIndex % lunchAmounts.length], A, {
      sub: 'رستوران',
      time: '13:20'
    })
  }

  // ---- tricky: the same lunch entered twice within a minute (the SMS below matches only one)
  exp(6, 'ناهار — رستوران سنتی', 'خوراک', 540000, A, { sub: 'رستوران', time: '13:05' })
  exp(6, 'ناهار — رستوران سنتی', 'خوراک', 540000, A, { sub: 'رستوران', time: '13:05' })

  // ---- tricky: odd amount, and a record that must not move a balance (friend's card)
  exp(16, 'خرید از دیجی‌کالا', 'خانه', 1248750, A, { sub: 'لوازم', note: 'کابل و پریز هوشمند' })
  exp(17, 'ناهار گروهی با دوستان', 'تفریح و سفر', 1100000, A, { sub: 'رستوران', apply: false, note: 'با کارت دوستم پرداخت شد؛ فقط ثبت' })

  exp(40, 'اشتراک باشگاه ورزشی', 'تفریح و سفر', 2800000, A, { sub: 'باشگاه' })
  exp(22, 'اشتراک موسیقی و فیلم', 'تفریح و سفر', 420000, A, { sub: 'اشتراک' })
  exp(11, 'سینما و شام', 'تفریح و سفر', 1650000, C, { sub: 'تفریح' })
  exp(36, 'دوره آنلاین ACCA', 'آموزش', 6200000, A, { sub: 'دوره', time: '10:00' })
  exp(31, 'کتاب حسابداری', 'آموزش', 420000, C, { sub: 'کتاب' })
  exp(15, 'لباس زمستانی', 'پوشاک و زیبایی', 5400000, A, { time: '17:00' })
  exp(21, 'کادوی تولد دوست', 'هدیه و مناسبت', 1800000, A)
  exp(13, 'ویزیت دکتر', 'سلامت', 900000, C, { sub: 'پزشک' })
  exp(10, 'داروخانه', 'سلامت', 350000, C, { sub: 'دارو' })
  exp(7, 'تعمیر گوشی', 'سایر', 2300000, A, { sub: 'تعمیرات' })
  ;[[48, 190000], [43, 260000], [38, 150000], [29, 310000], [24, 220000], [12, 400000], [3, 240000]].forEach(([d, amt]) =>
    exp(d, 'اسنپ', 'حمل‌ونقل', amt, C, { sub: 'تاکسی اینترنتی', time: '21:40' })
  )
  exp(30, 'شارژ کارت مترو', 'حمل‌ونقل', 500000, C, { sub: 'مترو' })

  // ---- checks
  const dirCol = L.heads.CHECKS_HEADERS.indexOf('نوع چک')
  const caviPay = exp(15, 'چک: 3300123 — مهندس کاویانی', 'چک', 8000000, A, { note: `سررسید: ${ago(15)}`, time: '10:30' })

  const checks = [
    L.checkRowOf(TAG, 'c1', { number: '3300123', direction: 'paid', counterparty: L.fullName(engineer), amount: 8000000, creationDate: ago(40), dueDate: ago(15), paid: true, paidAt: ago(15), recordId: caviPay.id }, dirCol),
    L.checkRowOf(TAG, 'c2', { number: '3300124', direction: 'paid', counterparty: L.fullName(landlord), amount: 12000000, creationDate: ago(20), dueDate: L.ahead(19), sub: 'ودیعه' }, dirCol),
    L.checkRowOf(TAG, 'c3', { number: '5566001', direction: 'received', counterparty: L.fullName(friend), amount: 25000000, creationDate: ago(10), dueDate: L.ahead(14) }, dirCol),
    L.checkRowOf(TAG, 'c4', { number: '5566002', direction: 'received', counterparty: L.fullName(pedram), amount: 4000000, creationDate: ago(25), dueDate: ago(2) }, dirCol)
  ]

  const rentReminder = [
    uid(`${TAG}:recurring:rent`),
    L.stamp(ago(60), '10:00'),
    'expense',
    'خانه',
    'اجاره',
    A.id,
    '18000000',
    'اجاره منزل',
    '1',
    'reminder',
    '1405-07',
    'بله',
    '',
    ''
  ]

  // ---- freelance income: the second project's invoice (the first one, 6.5M, is above)
  inc(3, 'پروژه داشبورد فروش — فروشگاه نیلو', 'کار آزاد', 9000000, A, { sub: 'پروژه', counterparty: L.fullName(nilo), time: '16:20' })

  // ---- his own small car (vehicles module): 2 periodic services, fuel, insurance and inspection
  const veh = AR.vehicleKit(book, TAG)
  const karimi = L.fullName(mechanic)

  const car = veh.vehicle({
    key: 'tiba',
    title: 'تیبا ۲ — شخصی',
    startKm: 61100,
    since: ago(60),
    year: '1398',
    capacity: '5 نفر',
    plate: AR.plate('45', 'د', '312', '11'),
    interval: 'every-2-months'
  })

  veh.service(car, { type: 'روغن موتور', d: 38, km: 61350, intervalKm: 5000, brand: 'بهران', location: 'روغنی ستاره', amount: 1450000, account: A, counterparty: karimi })
  veh.fuel(car, 33, 28, 61600, A)
  veh.fuel(car, 26, 30, 61980, A)
  veh.service(car, { type: 'لنت ترمز', d: 21, km: 62150, intervalKm: 40000, brand: 'لنت ایساکو', location: 'تعمیرگاه استاد کریمی', amount: 2100000, account: A, counterparty: karimi })
  veh.fuel(car, 19, 25, 62300, A)
  veh.fuel(car, 12, 27, 62720, A)
  veh.fuel(car, 5, 29, 63050, A)

  veh.deadline(car, { category: 'بیمه شخص ثالث', start: ago(225), end: L.ahead(140), amount: 3900000, reminder: true, daysBefore: 7, renewals: [{ start: ago(590), end: ago(225), km: 52000, amount: 3100000 }] })
  veh.deadline(car, { category: 'معاینه فنی', start: ago(160), end: L.ahead(205), amount: 1350000, notes: 'برای ۲ سال', reminder: false })

  // ---- savings goal with a target date: money leaves the savings account
  const goals = AR.goalKit(book, TAG)
  const fund = goals.goal({ key: 'fund', title: 'صندوق اضطراری ۶ ماهه', target: 240000000, targetDate: L.ahead(210), account: B, note: 'معادل ۶ ماه هزینه و قسط', since: ago(50) })

  goals.deposit(fund, 33, 15000000)
  goals.deposit(fund, 19, 12000000)
  goals.deposit(fund, 6, 18000000)

  // ---- timesheets: two freelance projects, ~6 weeks. The rate is in the description (no column for it).
  // Entries marked «تایید شده» are the ones an invoice covered: project 1, 13 h x 500k = 6.5M (income on day -12);
  // project 2, 15 h x 600k = 9M (income on day -3).
  const ts = AR.timesheetKit(TAG)
  const p1 = ts.sheet({ key: 'arian', title: 'آرین‌تجارت — سیستم حسابداری', description: 'نرخ ساعتی: ۵۰۰٬۰۰۰ تومان', since: ago(44) })
  const p2 = ts.sheet({ key: 'nilo', title: 'فروشگاه نیلو — داشبورد فروش', description: 'نرخ ساعتی: ۶۰۰٬۰۰۰ تومان', since: ago(32) })

  ;[
    [41, '19:00', 120, 'جلسه تحلیل نیازمندی با مدیر مالی', true],
    [39, '19:30', 90, 'طراحی ساختار حساب‌ها', true],
    [36, '10:00', 120, 'طراحی دیتابیس', true],
    [34, '19:00', 60, 'نمونه اولیه صفحه ورود', true],
    [31, '09:30', 120, 'پیاده‌سازی ثبت سند', true],
    [27, '19:00', 90, 'گزارش تراز آزمایشی', true],
    [23, '19:15', 60, 'اصلاح ایرادهای جلسه بازبینی', true],
    [20, '10:00', 60, 'مستندسازی', true],
    [15, '19:00', 60, 'آموزش کاربران', true],
    [11, '19:00', 90, 'گزارش ترازنامه', false],
    [9, '19:30', 120, 'خروجی اکسل', false],
    [7, '10:00', 150, 'تست با داده واقعی', false],
    [4, '19:00', 60, 'رفع ایراد گزارش', false],
    [1, '19:30', 75, 'جلسه تحویل مرحله دوم', false]
  ].forEach(([d, start, min, title, checked]) => ts.entry(p1, d, start, min, title, '', checked))

  ;[
    [30, '20:00', 120, 'جمع‌آوری نیازمندی', true],
    [28, '20:00', 90, 'طراحی داشبورد', true],
    [25, '10:00', 150, 'اتصال به فایل فروش', true],
    [22, '20:00', 120, 'نمودار فروش روزانه', true],
    [19, '20:30', 90, 'فیلتر دسته‌بندی کالا', true],
    [16, '10:00', 180, 'گزارش مشتریان', true],
    [13, '20:00', 150, 'بهینه‌سازی سرعت', true],
    [8, '20:00', 120, 'نسخه موبایل', false],
    [6, '20:00', 90, 'اصلاحات درخواستی', false],
    [3, '20:30', 60, 'خروجی PDF', false],
    [2, '10:00', 120, 'تست نهایی', false]
  ].forEach(([d, start, min, title, checked]) => ts.entry(p2, d, start, min, title, '', checked))

  if (ts.minutes(p1, true) !== 780 || ts.minutes(p2, true) !== 900) throw new Error('invoiced minutes do not match the invoices')

  // ---- dang-split: a trip with friends (shared expenses split by weights, nothing posts to the wallet)
  const trip = AR.dangSplitGroup(TAG, {
    key: 'north',
    title: 'سفر شمال با دوستان',
    description: 'سه شب ویلا در رامسر؛ ضریب زوج ۲',
    since: ago(24),
    settledOn: ago(10),
    categories: [{ key: 'couple', title: 'زوج' }, { key: 'single', title: 'مجرد' }],
    people: [
      { key: 'me', name: 'امیرحسین کاظمی', cat: 'single', weight: 1, paid: -15887332 },
      { key: 'saeed', name: 'سعید رحیمی', cat: 'single', weight: 1, paid: 7486166, settled: true },
      { key: 'pedram', name: 'پدرام شیرازی', cat: 'single', weight: 1, deposit: 1000000, paid: 401166, settled: true },
      { key: 'couple', name: 'نیلوفر و آرش', cat: 'couple', weight: 2, paid: 8000000, note: 'دو نفر، یک سهم دوبرابر' },
      { key: 'reza', name: 'رضا مرادی', cat: 'single', weight: 1, note: 'فقط دو روز بود' }
    ],
    expenses: [
      { key: 'villa', title: 'اجاره ویلا ۳ شب', d: 27, amount: 36000000, payer: 'me' },
      { key: 'fuel', title: 'بنزین و عوارض', d: 27, amount: 2350000, payer: 'saeed', note: 'فقط ماشین سعید', weights: { me: 1, saeed: 1, pedram: 1 } },
      { key: 'food', title: 'خرید غذا و کباب', d: 26, amount: 8435000, payer: 'pedram' },
      { key: 'boat', title: 'قایق‌سواری', d: 26, amount: 3000000, payer: 'me', note: 'رضا هنوز نرسیده بود', weights: { me: 1, saeed: 1, pedram: 1, couple: 2 } },
      { key: 'breakfast', title: 'صبحانه و میوه', d: 25, amount: 1860000, payer: 'couple', weights: { me: 1, saeed: 1, pedram: 1, couple: 1, reza: 1 } },
      { key: 'park', title: 'ورودی پارک آبی', d: 25, amount: 2700000, payer: 'reza', weights: { me: 1, saeed: 1, pedram: 1, reza: 1 } }
    ]
  })

  // ---- recurring: salary and internet join the rent reminder above (Aban not recorded yet for any of the three)
  const recurringRows = [
    rentReminder,
    AR.recurringRowOf(TAG, 'salary', { type: 'income', category: 'حقوق', account: A, amount: 65000000, title: 'حقوق ماهانه', day: 30, lastPosted: '1405-07' }),
    AR.recurringRowOf(TAG, 'internet', { type: 'expense', category: 'قبوض', sub: 'اینترنت', account: A, amount: 1350000, title: 'اینترنت ماهانه', day: 3, lastPosted: '1405-07' })
  ]

  // ---- net worth («دارایی ماهانه»): 3 months from before the book (typed / rebuilt), 2 written by the app.
  // Illustrative: assets = wallet (+ goal) at month end; liabilities = instalments due in the next 30 days.
  const plans = [
    { dues: loanDue, amount: loanSpec.amount },
    { dues: laptopDue, amount: laptopSpec.amount }
  ]
  const monthEnd = month => L.jalaliToIso(1405, month, month <= 6 ? 31 : 30)
  const due30 = end => AR.remainingAt(plans, end) - AR.remainingAt(plans, L.isoAdd(30, end))
  const snapshot = (month, assets, source, at) => ({ month: `1405-${String(month).padStart(2, '0')}`, assets, liabilities: due30(monthEnd(month)), source, at })

  const netWorth = AR.netWorthRows([
    snapshot(3, 70500000, 'manual', ago(60)),
    snapshot(4, 80200000, 'rebuilt', ago(60)),
    snapshot(5, 91000000, 'rebuilt', ago(60)),
    snapshot(6, book.walletTotalAt(monthEnd(6)) + goals.balanceAt(fund, monthEnd(6)), 'auto', L.isoAdd(1, monthEnd(6))),
    snapshot(7, book.walletTotalAt(monthEnd(7)) + goals.balanceAt(fund, monthEnd(7)), 'auto', L.isoAdd(1, monthEnd(7)))
  ])

  const out = book.build()

  const data = {
    درآمد: out.income,
    هزینه: out.expense,
    [L.names.WALLET_SHEET]: out.wallet,
    [L.names.WALLET_LEDGER_SHEET]: out.ledger,
    [L.names.CATEGORIES_SHEET]: L.categoryRows(L.defaultGroups()),
    [L.names.PERIOD_SETTINGS_SHEET]: L.periodRows(ANCHOR),
    [L.names.MONTHLY_BALANCE_SHEET]: L.monthlyBalanceRows(ANCHOR, L.openingTotal(book)),
    [L.names.COUNTERPARTIES_SHEET]: [L.heads.COUNTERPARTIES_HEADERS, ...people.map(L.personRow)],
    [L.names.INSTALLMENTS_SHEET]: [L.heads.INSTALLMENTS_HEADERS, loanPlan.row, laptopPlan.row],
    [L.names.CHECKS_SHEET]: [L.heads.CHECKS_HEADERS, ...checks],
    [L.names.RECURRING_SHEET]: [L.heads.RECURRING_HEADERS, ...recurringRows],
    [L.names.BUDGETS_SHEET]: L.budgetRows(
      [['خوراک', 12000000], ['تفریح و سفر', 6000000], ['حمل‌ونقل', 3000000], ['قبوض', 6000000], ['پوشاک و زیبایی', 4000000], ['خودرو', 4000000]],
      ago(50)
    ),
    [L.names.PERSONAL_REMINDERS_SHEET]: [
      L.heads.PERSONAL_REMINDERS_HEADERS,
      [uid(`${TAG}:rem:ins`), L.stamp(ago(30), '09:00'), 'بیمه', 'بیمه تکمیلی', L.ahead(33), 'yearly', '9500000', '7', 'TRUE'],
      AR.reminderRowOf(TAG, 'domain', { category: 'اشتراک', title: 'تمدید دامنه و هاست سایت', due: L.ahead(58), recurrence: 'yearly', amount: 850000, daysBefore: 7 }),
      AR.reminderRowOf(TAG, 'tax', { category: 'مالیات', title: 'اظهارنامه مالیات بر درآمد (کار آزاد)', due: L.ahead(64), recurrence: 'yearly', amount: 0, daysBefore: 7 })
    ],
    [L.names.TREASURY_GOALS_SHEET]: goals.rows(),
    [L.names.NET_WORTH_SHEET]: netWorth,
    [L.names.TIMESHEETS_SHEET]: ts.sheetRows(),
    [L.names.TIMESHEET_ENTRIES_SHEET]: ts.entryRows(),
    ...trip.tabs(),
    ...veh.tabs()
  }

  // ---- bank SMS
  const melliOf = (verb, e) => F.melli(verb, { toman: e.toman, balance: e.balance, acct: A.acctNo, day: e.day, time: e.time })
  const mellatOf = (verb, e) => F.mellat(verb, { toman: e.toman, balance: e.balance, ref: '4567***1234', day: e.day, time: e.time })

  // «مانده» chain: see L.chainBalances. Today's loan instalment (newest pending on A) is the
  // deliberate +1M case; B's chain is exact.
  const aEvents = L.chainBalances(
    book,
    A,
    [
      { day: ago(6), time: '13:40', verb: 'خرید', toman: 540000, delta: -540000, recorded: true },
      { day: ago(5), time: '08:10', verb: 'واریز', toman: 65000000, delta: 65000000, recorded: true },
      { day: ago(1), time: '18:00', verb: 'برداشت', toman: 5000000, delta: -5000000 }, // transfer out, pending pair
      { day: ago(1), time: '20:30', verb: 'خرید', toman: 2380000, delta: -2380000 },
      { day: ago(0), time: '07:15', verb: 'برداشت', toman: 4350000, delta: -4350000 } // today's loan instalment
    ],
    { deliberateOff: 1000000 }
  )

  const bEvents = L.chainBalances(book, B, [
    { day: ago(2), time: '06:30', verb: 'واریز', toman: 1230000, delta: 1230000 },
    { day: ago(1), time: '18:01', verb: 'واریز', toman: 5000000, delta: 5000000 } // transfer in, pending pair
  ])

  const meta = []
  const tracked = (account, item, e) => {
    meta.push(L.chainMeta(item, e.status, { account: account.id, ...(e.off ? { offToman: e.off } : {}) }))

    return item
  }
  const dinnerRepeat = L.sms({ sender: 'BMI', day: ago(1), time: '20:31', body: melliOf('خرید', aEvents.find(e => e.toman === 2380000)), idSalt: '#2' })

  meta.push(L.chainMeta(dinnerRepeat, 'redelivery'))

  const smsList = [
    ...aEvents.map(e => tracked(A, L.sms({ sender: 'BMI', day: e.day, time: e.time, body: melliOf(e.verb, e) }), e)),
    ...bEvents.map(e => tracked(B, L.sms({ sender: 'BankMellat', day: e.day, time: e.time, body: mellatOf(e.verb, e) }), e)),
    // same dinner body twice (double swipe)
    dinnerRepeat,
    L.sms({ sender: 'BMI', day: ago(3), time: '10:00', body: F.promo('بانک ملی ایران') }),
    // a shape no template knows: unknown, can be taught
    L.sms({ sender: '10002040', day: ago(2), time: '15:30', body: F.posNotice({ shop: 'کافه نیلوفر', toman: 285000, cardTail: '3344', day: ago(2), time: '15:30' }) })
  ].sort((a, b) => a.receivedAt - b.receivedAt)

  const taught = (account, key, sample) => L.templateRow(TAG, key, account, sample, { unit: 'rial' })
  const s0 = (verb, day) => F.melli(verb, { toman: 100000, balance: 5000000, acct: A.acctNo, day, time: '18:40' })
  const m0 = (verb, day) => F.mellat(verb, { toman: 100000, balance: 5000000, ref: '4567***1234', day, time: '18:40' })

  const templates = [
    taught(A, 'a-buy', s0('خرید', ago(40))),
    taught(A, 'a-out', s0('برداشت', ago(40))),
    taught(A, 'a-in', s0('واریز', ago(40))),
    taught(B, 'b-out', m0('برداشت', ago(40))),
    taught(B, 'b-in', m0('واریز', ago(40)))
  ]

  data[L.names.SMS_TEMPLATES_SHEET] = [L.heads.SMS_TEMPLATES_HEADERS, ...templates.map(t => t.row)]

  return { data, sms: smsList, meta, templates: templates.map(t => t.template), book, accounts: [A, B, C] }
}
