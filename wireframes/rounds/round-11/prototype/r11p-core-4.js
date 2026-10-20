/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* ---------- seeding ---------- */
function seedNarges() {
  const b = newBuilding('b1', 'ساختمان نرگس', { opening: 6000000 })
  b.quickDone = true
  const mk = (name, extra) => addPerson(b, name, 'resident', extra)
  const me = mk('امید سهیل‌نیا', { phone: '۰۹۱۲۱۱۱۲۲۳۳', me: true })
  const people = {
    musavi: mk('موسوی', { phone: '۰۹۱۲۳۴۵۶۷۸۹' }),
    farhadi: mk('فرهادی', { phone: '۰۹۱۹۱۱۱۲۲۲۳' }),
    kazemi: mk('کاظمی', { phone: '۰۹۳۵۴۴۴۵۵۵۶' }),
    ahmadi: mk('احمدی', { phone: '۰۹۱۲۷۷۷۸۸۸۹' }),
    rezaei: mk('رضایی', { phone: '۰۹۰۱۲۲۲۳۳۳۴', card: '۶۲۱۹۸۶۱۰۱۲۳۴۱۱۰۰' }),
    jalali: mk('جلالی', { phone: '۰۹۱۱۶۶۶۷۷۷۸' }),
    nikoo: mk('نیکو', { phone: '۰۹۱۲۸۸۸۹۹۹۰' }),
    hosseini: mk('حسینی'),
    moradi: mk('مرادی'),
    sadeghi: mk('صادقی'),
    karimi: mk('کریمی'),
    zarei: mk('زارعی'),
    bahrami: mk('بهرامی'),
    nasiri: mk('نصیری')
  }
  const P = people
  const def = [
    [1, 1, 110, 4, P.musavi, P.musavi, 'owner', 0],
    [2, 1, 95, 2, P.farhadi, P.kazemi, 'tenant', 1000000],
    [3, 1, 110, 3, P.ahmadi, P.ahmadi, 'owner', 0],
    [4, 2, 95, 2, P.hosseini, P.rezaei, 'tenant', 1000000],
    [5, 2, 100, 2, me, me, 'owner', 0],
    [6, 2, 95, 3, P.jalali, P.jalali, 'owner', 0],
    [7, 3, 80, 2, P.nikoo, null, null, 800000],
    [8, 3, 110, 4, P.hosseini, P.hosseini, 'owner', 0],
    [9, 3, 95, 3, P.moradi, P.sadeghi, 'tenant', 1000000],
    [10, 4, 110, 4, P.karimi, P.karimi, 'owner', 0],
    [11, 4, 95, 3, P.zarei, P.zarei, 'owner', 0],
    [12, 4, 80, 2, P.bahrami, P.nasiri, 'tenant', 900000]
  ]
  def.forEach(([no, fl, area, ppl, owner, occ, role, charge]) => {
    const u = addUnit(b, {
      no,
      floor: fl,
      area,
      people: ppl,
      charge,
      ownerId: owner.id,
      parking: no % 3 === 0 ? 0 : 1
    })
    if (occ)
      b.stays.push({
        id: uid('s'),
        unitId: u.id,
        personId: occ.id,
        role,
        from: '1403-01-01',
        to: null
      })
  })
  addPerson(b, 'شرکت آسانسور پارس', 'contractor', { phone: '۰۲۱۸۸۸۸۱۱۱۱', card: '۶۰۳۷۹۹۷۱۱۱۱۲۲۲۲' })
  addPerson(b, 'آقای قنبری (تأسیسات)', 'contractor', { phone: '۰۹۱۲۵۵۵۱۲۳۴' })
  addPerson(b, 'خانم نظیفی (نظافت)', 'contractor', { phone: '۰۹۳۶۱۱۱۲۲۳۳' })
  const uBy = no => unitByNo(b, no)
  const acc = b.accounts[0].id
  const issue = (mk, dueDay) => issueCharges(b, mk, mk + '-' + pad(dueDay), '')
  ;['1405-05', '1405-06', '1405-07'].forEach(k => issue(k, 10))
  /* capital share (pump) split equally between all units, charged to owners */
  const pump = saveExpense(b, {
    title: 'تعویض پمپ مخزن',
    amount: 5400000,
    cat: 'تعمیرات',
    sub: 'پمپ و مخزن',
    kind: 'capital',
    payer: 'fund',
    acc,
    cp: 'آقای قنبری (تأسیسات)',
    splitOn: true,
    mode: 'equal',
    date: '1405-07-12',
    attach: true
  })
  /* payments */
  const seedPay = (r, amt, date) => {
    r.paid.push({ id: uid('pm'), amt, date, acc })
    addRec(b, {
      type: 'income',
      date,
      title: 'شارژ واحد ' + fa(unitById(b, r.unitId).no) + ' · ' + personById(b, r.debtorId).name,
      amount: amt,
      cat: 'شارژ ساختمان',
      sub: '',
      acc,
      unitId: r.unitId
    })
  }
  const settle = (no, months, extra = {}) => {
    const u = uBy(no)
    b.rec
      .filter(r => r.unitId === u.id && months.includes(r.month))
      .sort((x, y) => x.month.localeCompare(y.month))
      .forEach(r => {
        const amt =
          extra.partial && r.ref.startsWith('charge') && r.month === '1405-07'
            ? Math.round(r.amount / 2)
            : openOf(r)
        if (amt > 0) seedPay(r, amt, r.month + '-' + pad(3 + (no % 6)))
      })
  }
  const all = ['1405-05', '1405-06', '1405-07']
  ;[1, 2, 5, 8, 10, 11, 12].forEach(n =>
    settle(n, n === 12 ? all : all, n === 12 ? { partial: true } : {})
  )
  b.rec
    .filter(r => r.unitId === uBy(3).id && r.ref.startsWith('share:'))
    .forEach(r => seedPay(r, openOf(r), '1405-07-20'))
  settle(4, ['1405-05', '1405-06'])
  settle(6, ['1405-05', '1405-06'])
  settle(7, ['1405-05', '1405-06'])
  settle(9, ['1405-05', '1405-06'])
  /* expenses */
  const ex = (title, amount, cat, sub, kind, cp, date, extra = {}) =>
    saveExpense(
      b,
      Object.assign(
        { title, amount, cat, sub, kind, payer: 'fund', acc, cp, date, splitOn: false },
        extra
      )
    )
  ex(
    'سرویس ماهانه آسانسور',
    2000000,
    'آسانسور',
    'سرویس',
    'current',
    'شرکت آسانسور پارس',
    '1405-07-05',
    { attach: true, recurring: 'monthly' }
  )
  ex('حقوق نظافتچی', 1800000, 'نظافت', 'نظافتچی', 'current', 'خانم نظیفی (نظافت)', '1405-07-08')
  ex('قبض برق مشاعات', 950000, 'قبوض مشاعات', 'برق', 'current', '', '1405-07-15')
  saveExpense(b, {
    title: 'پرینت و پیک صورت‌حساب‌ها',
    amount: 180000,
    cat: 'اداری',
    sub: 'پیک',
    kind: 'current',
    payer: 'manager',
    cp: '',
    date: '1405-07-25',
    splitOn: false
  })
  b.checks.push(
    {
      id: uid('c'),
      payee: 'آقای قنبری (تأسیسات)',
      amount: 3000000,
      due: '1405-08-12',
      status: 'pending',
      acc,
      note: 'بابت پمپ'
    },
    {
      id: uid('c'),
      payee: 'شرکت آسانسور پارس',
      amount: 2000000,
      due: '1405-08-05',
      status: 'pending',
      acc,
      note: 'سرویس آبان'
    }
  )
  /* device SMS: routed by card */
  b.sms.push(
    {
      id: uid('m'),
      type: 'in',
      text: 'واریز ۱٬۰۰۰٬۰۰۰ از کارت ۶۲۱۹…۱۱۰۰ به حساب ملت',
      fromCard: '۶۲۱۹۸۶۱۰۱۲۳۴۱۱۰۰',
      amount: 1000000,
      date: '1405-07-30',
      state: 'new'
    },
    {
      id: uid('m'),
      type: 'in',
      text: 'واریز ۱٬۲۰۰٬۰۰۰ به حساب ملت (فرستنده نامشخص)',
      fromCard: '',
      amount: 1200000,
      date: '1405-07-29',
      state: 'new'
    },
    {
      id: uid('m'),
      type: 'out',
      text: 'برداشت ۲٬۰۰۰٬۰۰۰ به کارت ۶۰۳۷…۲۲۲۲ (آسانسور پارس)',
      fromCard: '۶۰۳۷۹۹۷۱۱۱۱۲۲۲۲',
      amount: 2000000,
      date: '1405-07-28',
      state: 'new'
    }
  )
  b.members[0].me = true
  b.activity = []
  logAct(b, 'ساختمان ساخته شد')
  return b
}
function seedAftab() {
  const b = newBuilding('b2', 'برج آفتاب', {
    opening: 20000000,
    charge: 1500000,
    address: 'تهران، سعادت‌آباد، خیابان ۱۴'
  })
  b.quickDone = true
  const names = ['شمس', 'پارسا', 'دهقان', 'عزیزی', 'قاسمی', 'یگانه', 'معینی', 'فروغی']
  names.forEach((n, i) => {
    const p = addPerson(b, n)
    const u = addUnit(b, {
      no: i + 1,
      floor: Math.floor(i / 2) + 1,
      area: 100 + (i % 3) * 10,
      people: 2 + (i % 3),
      ownerId: p.id
    })
    b.stays.push({
      id: uid('s'),
      unitId: u.id,
      personId: p.id,
      role: 'owner',
      from: '1402-01-01',
      to: null
    })
  })
  issueCharges(b, '1405-07', '1405-07-10', '')
  b.units
    .slice(0, 6)
    .forEach(u => payUnit(b, u.id, 1500000, b.accounts[0].id, { date: '1405-07-06' }))
  b.activity = []
  logAct(b, 'ساختمان ساخته شد')
  return b
}
