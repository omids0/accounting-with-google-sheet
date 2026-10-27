// Persona 3b: the building the merchant manages. A building is its OWN spreadsheet in the app
// («فضای ساختمان»), so this is a separate data file; run it as the main workbook together with
// init-merchant-building.js (which marks the workbook as a building).
import * as L from './lib.mjs'
import * as F from './smsFormats.mjs'

const { ago, uid } = L
const TAG = 'building'
const ANCHOR = '2026-08-23' // 1 Shahrivar 1405
const MANAGER_EMAIL = 'perf@test.local' // the e2e session the runner signs in with

const PROFILE = {
  name: 'مجتمع مسکونی یاس',
  address: 'تهران، خیابان ولیعصر، کوچه ۱۲، پلاک ۸',
  floors: 4,
  defaultCharge: 2400000,
  chargeMethod: 'fixed',
  issueDay: 1,
  dueDay: 10,
  vacancyRule: 'half'
}

// number, floor, area, people, parking, storage, own charge (0 = default), occupancy, owner, tenant
const UNIT_TABLE = [
  ['1', 1, 78, 3, 1, 1, 0, 'owner-resident', ['رضا', 'موسوی'], null],
  ['2', 1, 82, 2, 1, 0, 0, 'owner-resident', ['مریم', 'کریمی'], null],
  ['3', 1, 95, 4, 1, 1, 0, 'tenant', ['حمید', 'فروغی'], ['کامران', 'یزدانی']],
  ['4', 2, 78, 3, 1, 1, 0, 'owner-resident', ['علی', 'اکبری'], null],
  ['5', 2, 82, 2, 0, 0, 0, 'owner-resident', ['زهرا', 'صادقی'], null],
  ['6', 2, 120, 5, 2, 1, 3000000, 'owner-resident', ['داریوش', 'نیک‌نام'], null],
  ['7', 3, 95, 3, 1, 1, 0, 'tenant', ['مجید', 'احمدی'], ['وحید', 'باقری']],
  ['8', 3, 110, 4, 1, 1, 0, 'owner-resident', ['احمد', 'صالحی'], null],
  ['9', 3, 78, 2, 0, 0, 1800000, 'owner-resident', ['فاطمه', 'جعفری'], null],
  ['10', 4, 82, 3, 1, 0, 0, 'tenant', ['محمد', 'کاظمی'], ['سمیه', 'حیدری']],
  ['11', 4, 95, 1, 1, 1, 0, 'owner-resident', ['بهروز', 'توکلی'], null],
  ['12', 4, 110, 0, 1, 1, 0, 'vacant', ['شهرام', 'حسینی'], null]
]

export function buildBuilding() {
  const book = new L.Book(TAG, ANCHOR, true)

  const bank = book.account({
    key: 'fund-bank',
    title: 'صندوق ساختمان — بانک ملی',
    bank: 'بانک ملی',
    card: '6037997755443322',
    holder: 'احمد صالحی',
    acctNo: '0103334445556',
    opening: 85000000
  })

  const cash = book.account({ key: 'fund-cash', title: 'تنخواه نقدی ساختمان', kind: 'نقدی', opening: 6000000 })

  // ---- people, units, stays
  const people = []
  const stays = []

  const units = UNIT_TABLE.map(([number, floor, area, peopleCount, parking, storage, own, occupancy, owner, tenant]) => {
    const ownerP = L.person(TAG, `owner-${number}`, owner[0], owner[1], {
      phones: [`0912${String(1000000 + Number(number) * 7919).slice(0, 7)}`],
      accounts: [{ bankName: 'بانک ملت', accountNumber: `6104${String(33770000 + Number(number) * 1111).padStart(8, '0')}${String(1000 + Number(number) * 37).slice(0, 4)}` }],
      me: number === '8',
      since: ANCHOR
    })

    people.push(ownerP)

    const unit = {
      id: uid(`${TAG}:unit:${number}`),
      number,
      floor,
      area,
      people: peopleCount,
      parking,
      storage,
      monthlyCharge: own,
      occupancy,
      owner: ownerP,
      tenant: null
    }

    stays.push({ unit, person: ownerP, role: 'owner', from: '2024-03-21' })

    if (tenant) {
      const tenantP = L.person(TAG, `tenant-${number}`, tenant[0], tenant[1], {
        phones: [`0935${String(2000000 + Number(number) * 4231).slice(0, 7)}`],
        accounts: [{ bankName: 'بانک ملی', accountNumber: `6037${String(99120000 + Number(number) * 2222).padStart(8, '0')}${String(2000 + Number(number) * 53).slice(0, 4)}` }],
        since: ANCHOR
      })

      people.push(tenantP)
      unit.tenant = tenantP
      stays.push({ unit, person: tenantP, role: 'tenant', from: '2026-03-01' })
    }

    return unit
  })

  const unitRows = units.map(u =>
    bUnitsRow(u)
  )

  function bUnitsRow(u) {
    return L.bUnits.unitToRow({
      id: u.id,
      createdAt: L.stamp(ANCHOR, '10:00'),
      number: u.number,
      floor: u.floor,
      area: u.area,
      people: u.people,
      parking: u.parking,
      storage: u.storage,
      monthlyCharge: u.monthlyCharge,
      active: true,
      note: '',
      occupancy: u.occupancy
    })
  }

  const stayRows = stays.map(s =>
    L.bStays.stayToRow({
      id: uid(`${TAG}:stay:${s.unit.number}:${s.role}`),
      createdAt: L.stamp(ANCHOR, '10:05'),
      unitId: s.unit.id,
      personId: s.person.id,
      role: s.role,
      from: s.from,
      to: '',
      active: true
    })
  )

  const debtorOf = u => u.tenant ?? u.owner
  const nameOf = p => L.fullName(p)

  // the real charge formula decides every unit's monthly amount
  const profile = PROFILE
  const unitsForCharge = units.map(u => ({ area: u.area, people: u.people, monthlyCharge: u.monthlyCharge, occupancy: u.occupancy }))
  const chargeOf = u => L.bCharges.unitCharge(profile, unitsForCharge[units.indexOf(u)], unitsForCharge)

  // ---- charges (receivables) and their payments
  const months = [
    { key: '1405-06', issued: '2026-08-23', due: L.bMonths.dueDateOf('1405-06', 10) },
    { key: '1405-07', issued: '2026-09-23', due: L.bMonths.dueDateOf('1405-07', 10) },
    { key: '1405-08', issued: '2026-10-23', due: L.bMonths.dueDateOf('1405-08', 10) }
  ]

  // paid[unitNumber][monthKey] = [[isoDate, amount], ...]
  const paid = {
    1: { '1405-06': [['2026-08-26', 2400000]], '1405-07': [['2026-09-25', 2400000]], '1405-08': [['2026-10-24', 2400000]] },
    2: { '1405-06': [['2026-09-12', 2400000]], '1405-07': [['2026-09-28', 2400000]], '1405-08': [['2026-10-25', 2400000]] },
    3: { '1405-06': [['2026-08-30', 2400000]], '1405-07': [['2026-10-01', 2400000]], '1405-08': [['2026-10-26', 2400000]] },
    4: { '1405-06': [['2026-09-02', 2400000]] },
    5: { '1405-06': [['2026-08-28', 2400000]], '1405-07': [['2026-10-03', 2400000]], '1405-08': [['2026-10-26', 2400000]] },
    6: { '1405-06': [['2026-09-03', 3000000]], '1405-07': [['2026-10-01', 3000000]] },
    7: {},
    8: { '1405-06': [['2026-08-24', 2400000]], '1405-07': [['2026-09-24', 2400000]], '1405-08': [['2026-10-24', 2400000]] },
    9: { '1405-06': [['2026-09-05', 1800000]], '1405-07': [['2026-10-04', 1800000]], '1405-08': [['2026-10-26', 1800000]] },
    10: { '1405-06': [['2026-09-08', 2400000]], '1405-07': [['2026-10-10', 2400000]] },
    11: { '1405-06': [['2026-09-01', 2400000]], '1405-07': [['2026-10-12', 1000000]] },
    12: { '1405-06': [['2026-09-10', 1200000]], '1405-07': [['2026-10-06', 1200000]] }
  }

  const receivables = []
  let creditNote = null

  for (const month of months) {
    for (const u of units) {
      const amount = chargeOf(u)
      const debtor = debtorOf(u)
      const monthLabel = L.bMonths.monthName(month.key)
      const payments = []

      for (const [date, value] of paid[u.number]?.[month.key] ?? []) {
        // u3 overpays Aban by 600k: the income record is the full deposit, the rest becomes credit
        const applied = Math.min(value, amount)
        const total = u.number === '3' && month.key === '1405-08' ? 3000000 : value

        const rec = book.rec({
          type: 'income',
          date,
          title: `شارژ واحد ${L.fa(u.number)} · ${nameOf(debtor)}`,
          category: 'شارژ ساختمان',
          amount: total,
          account: bank,
          counterparty: nameOf(debtor),
          time: '09:30'
        })

        payments.push(L.payment(TAG, `${u.number}:${month.key}`, applied, date, '', rec.id))

        if (total > applied) creditNote = { unit: u, debtor, amount: total - applied, date }
      }

      receivables.push(
        L.receivableRowOf(TAG, `charge:${u.number}:${month.key}`, {
          title: `شارژ ${monthLabel} · واحد ${L.fa(u.number)}`,
          debtor: nameOf(debtor),
          debtorId: debtor.id,
          category: 'شارژ ساختمان',
          sub: 'جاری',
          amount,
          borrowDate: month.due,
          payments,
          reference: L.bCharges.chargeReference(u.id, month.key)
        })
      )
    }
  }

  // previous debt of unit 7, and the credit unit 3 holds
  const u7 = units.find(u => u.number === '7')

  receivables.push(
    L.receivableRowOf(TAG, 'opening:7', {
      title: 'بدهی قبلی · واحد ۷',
      debtor: nameOf(debtorOf(u7)),
      debtorId: debtorOf(u7).id,
      category: 'شارژ ساختمان',
      sub: 'بدهی قبلی',
      amount: 1800000,
      borrowDate: ANCHOR,
      reference: `opening:${u7.id}`
    })
  )

  if (creditNote) {
    receivables.push(
      L.receivableRowOf(TAG, 'credit:3', {
        title: `اعتبار واحد ${L.fa(creditNote.unit.number)}`,
        debtor: nameOf(creditNote.debtor),
        debtorId: creditNote.debtor.id,
        category: 'شارژ ساختمان',
        sub: 'اعتبار',
        amount: creditNote.amount,
        borrowDate: creditNote.date,
        note: 'اضافه‌پرداخت؛ در صدور بعدی کسر می‌شود',
        reference: L.bCharges.creditReference(creditNote.unit.id)
      })
    )
  }

  // ---- other income and building expenses (all paid by the fund)
  book.rec({ type: 'income', date: ago(22), title: 'اجارهٔ فضای آنتن پشت‌بام', category: 'اجارهٔ مشاعات', sub: 'آنتن', amount: 4500000, account: bank, time: '11:00' })

  const exp = (d, title, category, sub, amount, account = bank, extra = {}) =>
    book.rec({ type: 'expense', date: ago(d), title, category, sub, amount, account, payer: 'fund', time: '12:00', ...extra })

  exp(53, 'سرویس ماهانه آسانسور', 'آسانسور', 'سرویس', 3500000, bank, { counterparty: 'شرکت آسانسور پارس' })
  exp(22, 'سرویس ماهانه آسانسور', 'آسانسور', 'سرویس', 3500000, bank, { counterparty: 'شرکت آسانسور پارس' })
  exp(35, 'حقوق نظافتچی شهریور', 'نظافت', 'نظافتچی', 6000000)
  exp(5, 'حقوق نظافتچی مهر', 'نظافت', 'نظافتچی', 6000000)
  exp(43, 'قبض برق مشاعات شهریور', 'قبوض مشاعات', 'برق', 2150000)
  exp(13, 'قبض برق مشاعات مهر', 'قبوض مشاعات', 'برق', 2480000)
  exp(11, 'قبض آب مشاعات', 'قبوض مشاعات', 'آب', 960000)
  exp(18, 'تعمیر پمپ آب', 'تعمیرات', 'پمپ و مخزن', 7800000, bank, { counterparty: 'تأسیسات رضایی' })
  exp(9, 'تعویض لامپ‌های راه‌پله', 'تعمیرات', 'برق‌کشی', 1350000, cash)
  exp(27, 'کارمزد بانکی', 'اداری', 'کارمزد', 45000)
  exp(14, 'پرینت اطلاعیه‌ها', 'اداری', 'پرینت', 380000, cash)
  exp(30, 'سم‌پاشی ساختمان', 'سایر', '', 1200000, cash)

  // ---- a hand-entered debt of the building (to the painter, advance not yet repaid)
  const painter = L.person(TAG, 'painter', 'استاد', 'شیرازی', { phones: ['09128889900'], since: ago(20) })

  people.push(painter)

  const debts = [
    L.dangRowOf(TAG, 'painter', {
      title: 'پیش‌پرداخت رنگ‌آمیزی راه‌پله',
      category: 'سایر',
      counterparty: L.fullName(painter),
      amount: 5000000,
      date: ago(16),
      note: 'باقی‌مانده بعد از اتمام کار',
      payments: []
    })
  ]

  const out = book.build()

  // ---- workbook tabs
  const stamp = L.stamp(ANCHOR, '09:00')

  const data = {
    درآمد: out.income,
    هزینه: out.expense,
    [L.names.WALLET_SHEET]: out.wallet,
    [L.names.WALLET_LEDGER_SHEET]: out.ledger,
    [L.names.CATEGORIES_SHEET]: L.categoryRows(L.bTemplateData.buildingCategoryGroups(), L.bTemplateData.buildingSubcategories()),
    [L.names.PERIOD_SETTINGS_SHEET]: L.periodRows(ANCHOR, [
      ['نوع فضا', 'ساختمان', stamp],
      [`نقش:${MANAGER_EMAIL}`, 'manager', stamp]
    ]),
    [L.names.BUILDING_SHEET]: [L.heads.BUILDING_HEADERS, L.bTemplate.buildingProfileRow(profile, stamp)],
    [L.names.BUILDING_UNITS_SHEET]: [L.heads.BUILDING_UNITS_HEADERS, ...unitRows],
    [L.names.BUILDING_RESIDENTS_SHEET]: [L.heads.BUILDING_RESIDENTS_HEADERS, ...stayRows],
    [L.names.COUNTERPARTIES_SHEET]: [L.heads.COUNTERPARTIES_HEADERS, ...people.map(L.personRow)],
    [L.names.RECEIVABLES_SHEET]: [L.heads.RECEIVABLES_HEADERS, ...receivables],
    [L.names.DANG_SHEET]: [L.heads.DANG_HEADERS, ...debts],
    [L.names.RECURRING_SHEET]: [
      L.heads.RECURRING_HEADERS,
      [uid(`${TAG}:rec:lift`), L.stamp(ago(60), '10:00'), 'expense', 'آسانسور', 'سرویس', bank.id, '3500000', 'سرویس ماهانه آسانسور', '5', 'reminder', '1405-07', 'بله', 'آسانسور', 'fund'],
      [uid(`${TAG}:rec:clean`), L.stamp(ago(60), '10:01'), 'expense', 'نظافت', 'نظافتچی', bank.id, '6000000', 'حقوق نظافتچی', '30', 'reminder', '1405-07', 'بله', 'نظافت', 'fund']
    ]
  }

  // ---- bank SMS of the fund account (Melli): the payer's card is printed in every deposit
  const cardOf = p => p.accounts[0].accountNumber
  const masked = p => `${cardOf(p).slice(0, 4)}***${cardOf(p).slice(-4)}`
  const unit = n => units.find(u => u.number === n)

  const events = L.runningBalances(book, bank, [
    // unit 5 paid Aban on the 26th and the income record exists -> SMS says «already recorded»
    { day: ago(1), time: '09:31', verb: 'واریز', toman: 2400000, delta: 2400000, recorded: true, payer: debtorOf(unit('5')) },
    // unit 4 owes Mehr (2.4M): card + amount fit
    { day: ago(1), time: '16:45', verb: 'واریز', toman: 2400000, delta: 2400000, payer: debtorOf(unit('4')) },
    // unit 7 (tenant) sends 2 months of charge at once
    { day: ago(2), time: '12:10', verb: 'واریز', toman: 4800000, delta: 4800000, payer: debtorOf(unit('7')) },
    // unit 11 pays exactly what is left of Mehr
    { day: ago(0), time: '08:20', verb: 'واریز', toman: 1400000, delta: 1400000, payer: debtorOf(unit('11')) },
    // a deposit from a card nobody saved: amount fits many units
    { day: ago(3), time: '19:05', verb: 'واریز', toman: 2400000, delta: 2400000, payer: { accounts: [{ accountNumber: '5022291188776655' }] } },
    // elevator service leaves the fund
    { day: ago(0), time: '11:00', verb: 'برداشت', toman: 3500000, delta: -3500000 }
  ])

  const bodyOf = e =>
    e.verb === 'واریز'
      ? F.melliFromCard('واریز', { toman: e.toman, balance: e.balance, acct: bank.acctNo, payerCard: masked(e.payer), day: e.day, time: e.time })
      : F.melli('برداشت', { toman: e.toman, balance: e.balance, acct: bank.acctNo, day: e.day, time: e.time })

  const first = events.find(e => e.payer === debtorOf(unit('4')))

  const smsList = [
    ...events.map(e => L.sms({ sender: 'BMI', day: e.day, time: e.time, body: bodyOf(e) })),
    // the same deposit SMS delivered a second time
    L.sms({ sender: 'BMI', day: first.day, time: '16:46', body: bodyOf(first), idSalt: '#2' }),
    L.sms({ sender: 'BMI', day: ago(4), time: '10:00', body: F.promo('بانک ملی ایران') }),
    L.sms({ sender: '10009999', day: ago(6), time: '10:00', body: F.pasargadStyle({ toman: 2400000, balance: 8000000, acct: '205.8000.1234567.1', day: ago(6) }) })
  ].sort((a, b) => a.receivedAt - b.receivedAt)

  const sampleCredit = L.sms({
    sender: 'BMI',
    day: ago(40),
    body: F.melliFromCard('واریز', { toman: 100000, balance: 5000000, acct: bank.acctNo, payerCard: '6104***0000', day: ago(40), time: '18:40' })
  })

  const taught = (key, sample) => L.templateRow(TAG, key, bank, sample, { unit: 'rial' })

  const templates = [
    taught('in', sampleCredit.body),
    taught('out', F.melli('برداشت', { toman: 100000, balance: 5000000, acct: bank.acctNo, day: ago(40), time: '18:40' }))
  ]

  data[L.names.SMS_TEMPLATES_SHEET] = [L.heads.SMS_TEMPLATES_HEADERS, ...templates.map(t => t.row)]

  return { data, sms: smsList, templates: templates.map(t => t.template), book, bank, cash, units, people, profile }
}
