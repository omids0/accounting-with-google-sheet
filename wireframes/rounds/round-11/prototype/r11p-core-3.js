/* eslint-disable -- prototype scripts share globals, not part of the app source */
function createShares(b, rec) {
  if (!rec.split || !rec.split.charge) return 0
  const units = b.units.filter(u => u.active)
  const parts = splitExpense(rec.amount, units, rec.split.mode, rec.split.manual)
  let n = 0
  units.forEach(u => {
    const ref = 'share:' + u.id + ':' + rec.id
    const d = shareDebtor(b, rec.kind, u)
    if (!d || !parts[u.id]) return
    const ex = b.rec.find(r => r.ref === ref)
    if (ex) {
      if (!ex.paid.length) ex.amount = parts[u.id]
      return
    }
    b.rec.push({
      id: uid('r'),
      unitId: u.id,
      debtorId: d.person.id,
      title: 'سهم ' + rec.title + ' · واحد ' + fa(u.no),
      ref,
      amount: parts[u.id],
      due: rec.date,
      month: rec.date.slice(0, 7),
      cat: 'شارژ ساختمان',
      sub: kindOf(b, rec.kind)?.label || '',
      paid: []
    })
    n++
  })
  return n
}
function dedupeChargeReferences(b) {
  const seen = {}
  let removed = 0
  b.rec = b.rec.filter(r => {
    if (!r.ref) return true
    if (!seen[r.ref]) {
      seen[r.ref] = r
      return true
    }
    if (r.paid.length) return true
    removed++
    return false
  })
  if (removed) logAct(b, 'صدور تکراری حذف شد (' + fa(removed) + ')')
  return removed
}
function saveExpense(b, d) {
  const rec = addRec(b, {
    type: 'expense',
    date: d.date || TODAY,
    title: d.title,
    amount: d.amount,
    cat: d.cat,
    sub: d.sub,
    kind: d.kind,
    payer: d.payer,
    acc: d.payer === 'fund' ? d.acc : null,
    cp: d.cp,
    items: d.items || [],
    attach: !!d.attach,
    recurring: d.recurring || '',
    split: d.splitOn ? { charge: true, mode: d.mode, manual: d.manual || {} } : null
  })
  let shares = 0
  if (rec.split) shares = createShares(b, rec)
  let dang = null
  if (d.payer && d.payer !== 'fund') {
    dang = {
      id: uid('d'),
      title: d.title,
      cp: payerOf(b, d.payer)?.label || 'مدیر',
      amount: d.amount,
      paid: false,
      recId: rec.id,
      bridged: !!d.bridge
    }
    b.dang.push(dang)
    if (d.bridge) bridgePersonalReceivable(b, dang)
  }
  logAct(b, 'هزینه «' + d.title + '» ثبت شد')
  return { rec, shares, dang }
}
function deleteExpense(b, recId) {
  const rec = b.recs.find(r => r.id === recId)
  if (!rec) return
  const a = rec.acc && accById(b, rec.acc)
  if (a) a.balance += rec.type === 'income' ? -rec.amount : rec.amount
  b.recs = b.recs.filter(r => r.id !== recId)
  /* unpaid share receivables go, paid ones stay */
  b.rec = b.rec.filter(r => !(r.ref || '').endsWith(':' + recId) || r.paid.length)
  b.dang = b.dang.filter(x => x.recId !== recId || x.paid)
}
function editExpenseAmount(b, recId, amount) {
  const rec = b.recs.find(r => r.id === recId)
  const a = rec.acc && accById(b, rec.acc)
  if (a) a.balance += rec.amount - amount
  rec.amount = amount
  if (rec.split) createShares(b, rec)
  const dg = b.dang.find(x => x.recId === recId && !x.paid)
  if (dg) dg.amount = amount
}
/* ---------- bridges (Step 7) ---------- */
function bridgePersonalReceivable(b, dang) {
  S.pb.receivables.push({
    id: uid('pr'),
    title: 'طلب از «' + b.name + '»',
    note: dang.title,
    buildingId: b.id,
    dangId: dang.id,
    amount: dang.amount,
    paid: 0
  })
}
function settleDang(b, dangId, accId, personalAccId) {
  const d = b.dang.find(x => x.id === dangId)
  d.paid = true
  addRec(b, {
    type: 'transfer',
    date: TODAY,
    title: 'بازپرداخت به ' + d.cp + ' · ' + d.title,
    amount: d.amount,
    cat: 'انتقال',
    sub: 'بازپرداخت به مدیر',
    acc: accId
  })
  logAct(b, 'بدهی «' + d.title + '» از صندوق تسویه شد')
  const pr = S.pb.receivables.find(x => x.dangId === dangId)
  if (pr) {
    pr.paid = pr.amount
    const pa = S.pb.accounts.find(a => a.id === personalAccId) || S.pb.accounts[0]
    pa.balance += pr.amount
    S.pb.recs.unshift({
      id: uid('pc'),
      type: 'income',
      title: 'دریافت بازپرداخت از «' + b.name + '»',
      amount: pr.amount,
      date: TODAY
    })
  }
}
function bridgeMyCharge(b, res) {
  S.pb.accounts[0].balance -= res.amount
  S.pb.recs.unshift({
    id: uid('pc'),
    type: 'expense',
    title: 'شارژ واحد ' + fa(res.unit.no) + ' · ' + b.name,
    amount: res.amount,
    cat: 'خانه › شارژ',
    date: TODAY
  })
}
/* ---------- SMS routing + matching (Step 6) ---------- */
const lastDigits = c =>
  en(c || '')
    .replace(/\D/g, '')
    .slice(-4)
function smsCandidates(b, sms) {
  const cardMatch = b.units.filter(u => {
    const d = chargeDebtor(b, u)
    return d && d.person.card && lastDigits(d.person.card) === lastDigits(sms.fromCard)
  })
  const byAmount = b.units.filter(u => {
    const bal = unitBalance(b, u.id)
    if (bal.open <= 0) return false
    const ch = unitCharge(b, u)
    return (
      bal.open === sms.amount ||
      ch === sms.amount ||
      (ch > 0 && sms.amount % ch === 0 && sms.amount / ch <= 6 && bal.open >= sms.amount)
    )
  })
  const both = cardMatch.filter(u => byAmount.includes(u))
  return { cardMatch, byAmount, both }
}
function routeSms(sms) {
  for (const b of S.buildings)
    if (b.accounts.some(a => lastDigits(a.card) === lastDigits(sms.card))) return b.id
  return null
}
