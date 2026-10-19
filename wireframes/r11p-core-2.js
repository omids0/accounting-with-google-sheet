/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* ---------- charges ---------- */
function planIssue(b, monthKey) {
  const rows = []
  const skipped = []
  b.units
    .filter(u => u.active)
    .forEach(u => {
      const d = chargeDebtor(b, u)
      const amount = unitCharge(b, u)
      if (!d) return skipped.push(u)
      if (amount <= 0)
        return rows.push({
          unit: u,
          debtor: d,
          basis: 'معاف',
          amount: 0,
          already: false,
          zero: true
        })
      const ref = 'charge:' + u.id + ':' + monthKey
      const already = b.rec.some(r => r.ref === ref)
      const occ = occupantStay(b, u.id)
      const basis = !occ
        ? 'خالی · ' + (b.profile.vacancy === 'half' ? 'نصف' : 'کامل')
        : CHARGE_METHODS.find(m => m.value === b.profile.method).label.split(' (')[0]
      rows.push({ unit: u, debtor: d, basis, amount, already })
    })
  const fresh = rows.filter(r => !r.already && !r.zero)
  return { rows, skipped, total: fresh.reduce((s, r) => s + r.amount, 0), count: fresh.length }
}
function issueCharges(b, monthKey, due, note) {
  const plan = planIssue(b, monthKey)
  let n = 0
  plan.rows
    .filter(r => !r.already && !r.zero)
    .forEach(r => {
      const rec = {
        id: uid('r'),
        unitId: r.unit.id,
        debtorId: r.debtor.person.id,
        title: 'شارژ ' + monthName(monthKey) + ' · واحد ' + fa(r.unit.no),
        ref: 'charge:' + r.unit.id + ':' + monthKey,
        amount: r.amount,
        due,
        month: monthKey,
        cat: 'شارژ ساختمان',
        sub: 'جاری',
        paid: []
      }
      b.rec.push(rec)
      n++
      if (r.unit.credit > 0) {
        const use = Math.min(r.unit.credit, rec.amount)
        r.unit.credit -= use
        rec.paid.push({ id: uid('pm'), amt: use, date: TODAY, acc: null, fromCredit: true })
      }
    })
  if (n) {
    b.issueLog.push(monthKey)
    logAct(b, 'شارژ ' + monthName(monthKey) + ' برای ' + fa(n) + ' واحد صادر شد')
  }
  return n
}
function missingIssueMonths(b, today = TODAY) {
  const [y, m, d] = today.split('-').map(Number)
  const cur = mkey(y, m)
  const out = []
  let k = cur
  for (let i = 0; i < 12; i++) {
    if (k === cur && d < b.profile.issueDay) {
      k = prevMonth(k)
      continue
    }
    if (b.rec.some(r => r.ref && r.ref.startsWith('charge:') && r.month === k)) break
    if (!b.units.length) break
    out.push(k)
    k = prevMonth(k)
  }
  return out.reverse()
}
function chargeMonths(b) {
  return [...new Set(b.rec.filter(r => r.ref && r.ref.startsWith('charge:')).map(r => r.month))]
    .sort()
    .reverse()
}
function monthSummary(b, monthKey) {
  const rows = b.rec.filter(r => r.ref && r.ref.startsWith('charge:') && r.month === monthKey)
  const billed = rows.reduce((s, r) => s + r.amount, 0)
  const paid = rows.reduce((s, r) => s + paidOf(r), 0)
  const units = new Set(rows.map(r => r.unitId))
  const openUnits = new Set(rows.filter(r => openOf(r) > 0).map(r => r.unitId))
  const partial = new Set(rows.filter(r => openOf(r) > 0 && paidOf(r) > 0).map(r => r.unitId))
  return {
    rows,
    billed,
    paid,
    units: units.size,
    openUnits: openUnits.size,
    partial: partial.size,
    due: rows[0]?.due
  }
}
/* ---------- accounts, records, payments ---------- */
function logAct(b, text) {
  b.activity.unshift({ id: uid('l'), text, date: TODAY })
}

function addRec(b, r) {
  const rec = Object.assign(
    { id: uid('x'), date: TODAY, items: [], note: '', cp: '', attach: false },
    r
  )
  b.recs.unshift(rec)
  const a = rec.acc && accById(b, rec.acc)
  if (a) a.balance += rec.type === 'income' || rec.type === 'correction' ? rec.amount : -rec.amount
  return rec
}
/* oldest-first allocation, partial allowed, overflow -> credit (Decision 4) */
function allocatePayment(b, unitId, amount) {
  const open = b.rec
    .filter(r => r.unitId === unitId && openOf(r) > 0)
    .sort((x, y) => (x.due + x.month).localeCompare(y.due + y.month))
  let left = amount
  const parts = []
  for (const r of open) {
    if (left <= 0) break
    const use = Math.min(left, openOf(r))
    parts.push({ rec: r, use })
    left -= use
  }
  return { parts, overflow: left }
}
function payUnit(b, unitId, amount, accId, o = {}) {
  const u = unitById(b, unitId)
  const alloc = allocatePayment(b, unitId, amount)
  const date = o.date || TODAY
  const debtor = personById(
    b,
    (alloc.parts[0] && alloc.parts[0].rec.debtorId) || (chargeDebtor(b, u) || {}).person?.id
  )
  alloc.parts.forEach(p =>
    p.rec.paid.push({ id: uid('pm'), amt: p.use, date, acc: accId, viaSms: !!o.viaSms })
  )
  const applied = amount - alloc.overflow
  let credit = 0
  if (alloc.overflow > 0 && o.credit !== false) {
    u.credit += alloc.overflow
    credit = alloc.overflow
  }
  const total = applied + credit
  if (total > 0)
    addRec(b, {
      type: 'income',
      date,
      title: 'شارژ واحد ' + fa(u.no) + (debtor ? ' · ' + debtor.name : ''),
      amount: total,
      cat: 'شارژ ساختمان',
      sub: '',
      acc: accId,
      unitId,
      viaSms: !!o.viaSms
    })
  const months = [...new Set(alloc.parts.map(p => p.rec.month))].sort()
  const bal = unitBalance(b, unitId)
  logAct(b, 'پرداخت واحد ' + fa(u.no) + ': ' + money(total))
  return {
    unit: u,
    debtor,
    amount: total,
    applied,
    credit,
    months,
    remaining: bal.open,
    acc: accById(b, accId),
    date,
    parts: alloc.parts.map(p => ({ title: p.rec.title, use: p.use }))
  }
}
function statementText(b, unitId) {
  const u = unitById(b, unitId)
  const d = chargeDebtor(b, u)
  const bal = unitBalance(b, unitId)
  const lines = b.rec
    .filter(r => r.unitId === unitId && openOf(r) > 0)
    .sort((x, y) => x.month.localeCompare(y.month))
    .map(
      r =>
        '• ' +
        r.title.replace(' · واحد ' + fa(u.no), '') +
        (r.ref.startsWith('share:') && ownerDebtor(b, u).person.id === r.debtorId
          ? ' (به نام مالک)'
          : '') +
        ': ' +
        money(openOf(r))
    )
  const acc = b.accounts[0]
  return [
    'صورت‌حساب ساختمان ' + b.name,
    'واحد ' + fa(u.no) + (d ? ' · ' + d.person.name : ''),
    ...(lines.length ? lines : ['بدهی باز ندارید ✓']),
    '—',
    'جمع بدهی: ' + money(bal.open) + ' تومان',
    bal.credit ? 'اعتبار: ' + money(bal.credit) + ' تومان' : '',
    acc && acc.card ? 'کارت صندوق: ' + acc.card : ''
  ]
    .filter(Boolean)
    .join('\n')
}
function receiptText(b, r) {
  return [
    'رسید پرداخت · ' + dateFa(r.date),
    'ساختمان ' + b.name + ' — واحد ' + fa(r.unit.no) + ' · ' + (r.debtor ? r.debtor.name : ''),
    money(r.amount) +
      ' تومان بابت ' +
      (r.months.length ? r.months.map(monthName).join('، ') : 'اعتبار شارژ'),
    r.credit ? '(اعتبار ثبت‌شده: ' + money(r.credit) + ')' : '',
    'واریز به ' + r.acc.name,
    'ماندهٔ بدهی: ' + money(r.remaining) + ' تومان'
  ]
    .filter(Boolean)
    .join('\n')
}
/* ---------- expense split + shares (Step 5) ---------- */
function splitExpense(amount, units, mode, manual = {}) {
  const out = {}
  if (!units.length) return out
  if (mode === 'manual') {
    units.forEach(u => (out[u.id] = Math.round(Number(manual[u.id]) || 0)))
    return out
  }
  const w = u => (mode === 'area' ? u.area : mode === 'people' ? u.people : 1)
  const tot = units.reduce((s, u) => s + w(u), 0)
  let used = 0
  units.forEach(u => {
    out[u.id] = Math.floor((amount * w(u)) / tot)
    used += out[u.id]
  })
  out[units[units.length - 1].id] += amount - used
  return out
}
function shareDebtor(b, kindValue, unit) {
  const k = kindOf(b, kindValue)
  return k && k.chargeTo === 'owner' ? ownerDebtor(b, unit) : chargeDebtor(b, unit)
}
