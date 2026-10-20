/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — publishable reports: period digest (گزارش جامع), annual report, copy/CSV output */
'use strict'
function monthKeys(from, to) {
  const out = []
  for (let k = from.slice(0, 7); k <= to.slice(0, 7); k = nextMonth(k)) out.push(k)
  return out
}
const openAt = (r, to) => r.amount - r.paid.filter(p => p.date <= to).reduce((s, p) => s + p.amt, 0)
const recMonth = r => r.month || (r.due || '').slice(0, 7)
/* who owes the building at the end of the period (receivables issued up to that month, payments up to that date) */
function debtorsAt(b, to) {
  return b.units
    .map(u => {
      const rows = b.rec.filter(
        r => r.unitId === u.id && recMonth(r) <= to.slice(0, 7) && openAt(r, to) > 0
      )
      const d = chargeDebtor(b, u)
      return {
        u,
        name: d ? d.person.name : '—',
        months: [...new Set(rows.map(recMonth))].length,
        open: rows.reduce((s, r) => s + openAt(r, to), 0)
      }
    })
    .filter(x => x.open > 0)
    .sort((x, y) => y.open - x.open)
}
/* who the building owes (state today) */
function creditorsNow(b) {
  const g = {}
  dangOpen(b).forEach(d => (g[d.cp] = (g[d.cp] || 0) + d.amount))
  const people = Object.entries(g).map(([name, amount]) => ({ name, amount, kind: 'dang' }))
  const credits = b.units
    .filter(u => u.credit > 0)
    .map(u => ({
      name: 'واحد ' + fa(u.no) + ' (اعتبار پیش‌پرداخت)',
      amount: u.credit,
      kind: 'credit'
    }))
  return [...people, ...credits]
}
function paidIn(b, from, to) {
  return b.rec.reduce(
    (s, r) => s + r.paid.filter(p => p.date >= from && p.date <= to).reduce((a, p) => a + p.amt, 0),
    0
  )
}
function catTotals(list) {
  const g = {}
  list.forEach(r => (g[r.cat] = (g[r.cat] || 0) + r.amount))
  return Object.entries(g).sort((x, y) => y[1] - x[1])
}
function digestData(b, r) {
  const d = stmtData(b, r.from, r.to)
  const billed = monthKeys(r.from, r.to).reduce((s, k) => s + monthSummary(b, k).billed, 0)
  const collected = paidIn(b, r.from, r.to)
  return {
    ...d,
    billed,
    collected,
    rate: billed ? Math.round((collected / billed) * 100) : 0,
    debtors: debtorsAt(b, r.to),
    creditors: creditorsNow(b),
    cats: catTotals(d.expense)
  }
}
const nameOrUnit = (x, show) => 'واحد ' + fa(x.u.no) + (show ? ' · ' + x.name : '')
BPAGES.digest = (R, b) => {
  const r = repRange(b)
  const d = digestData(b, r)
  const names = UI.f.rpNames === '1'
  const debt = d.debtors.reduce((s, x) => s + x.open, 0)
  const cred = d.creditors.reduce((s, x) => s + x.amount, 0)
  return {
    title: 'گزارش جامع دوره',
    back: bhash(b, 'reports'),
    html: `${periodBar(b)}
    <div class="stats"><div class="stat"><small>شارژ صادرشده</small><b>${money(
      d.billed
    )}</b></div><div class="stat"><small>وصول · ${fa(d.rate)}٪</small><b>${money(
      d.collected
    )}</b></div><div class="stat"><small>هزینه</small><b>${money(d.exTotal)}</b></div></div>
    <div class="card flat">${rowLine('درآمد کل دوره', '', money(d.inTotal), 'pos')}${rowLine(
      'هزینهٔ کل دوره',
      '',
      money(d.exTotal),
      'neg'
    )}${rowLine('موجودی صندوق آخر دوره', 'اول دوره: ' + money(d.opening), money(d.closing))}</div>
    <div class="sec"><span>هزینه‌ها به تفکیک دسته</span></div><div class="card flat">${
      d.cats
        .slice(0, 6)
        .map(([k, v]) =>
          rowLine(esc(k), fa(Math.round((v / (d.exTotal || 1)) * 100)) + '٪', money(v))
        )
        .join('') || '<div class="row muted">هزینه‌ای نیست</div>'
    }</div>
    <div class="sec"><span>بدهکاران ساختمان · ${money(debt)}</span></div><div class="card flat">${
      d.debtors
        .map(x => rowLine(esc(nameOrUnit(x, names)), fa(x.months) + ' ماه', money(x.open), 'neg'))
        .join('') || '<div class="row muted">بدهکاری نیست</div>'
    }</div>
    <div class="toggle"><span class="tx">نمایش نام بدهکاران در گزارش</span><button type="button" class="sw ${
      names ? 'on' : ''
    }" role="switch" aria-checked="${names}" data-a="setf" data-k="rpNames" data-v="${
      names ? '' : '1'
    }"></button></div>
    <p class="note">پیش‌فرض خاموش است: برای گروه ساختمان فقط شمارهٔ واحد و مبلغ می‌آید، نه نام.</p>
    <div class="sec"><span>طلبکاران (ساختمان به آن‌ها بدهکار است) · ${money(
      cred
    )}</span></div><div class="card flat">${
      d.creditors
        .map(x =>
          rowLine(esc(x.name), x.kind === 'dang' ? 'بدهی باز تا امروز' : '', money(x.amount))
        )
        .join('') || '<div class="row muted">بدهی بازی نیست</div>'
    }</div>
    <div class="sec"><span>صندوق</span></div><div class="card flat">${b.accounts
      .map(a => rowLine(esc(a.name), '', money(a.balance)))
      .join('')}</div>
    ${outBar('digest')}`
  }
}
const yearsOf = b =>
  [...new Set([...b.recs.map(r => r.date.slice(0, 4)), ...chargeMonths(b).map(k => k.slice(0, 4))])]
    .sort()
    .reverse()
function annualData(b, y) {
  const months = Array.from({ length: 12 }, (_, i) => y + '-' + pad(i + 1))
  const rows = months.map(k => {
    const s = stmtData(b, k + '-01', k + '-31')
    return { k, billed: monthSummary(b, k).billed, inc: s.inTotal, exp: s.exTotal }
  })
  const whole = stmtData(b, y + '-01-01', y + '-12-31')
  return {
    rows,
    whole,
    billed: rows.reduce((s, x) => s + x.billed, 0),
    cats: catTotals(whole.expense),
    kinds: Object.entries(
      whole.expense.reduce(
        (g, x) => ((g[kindLabel(b, x.kind)] = (g[kindLabel(b, x.kind)] || 0) + x.amount), g),
        {}
      )
    ),
    top: [...whole.expense].sort((x, y2) => y2.amount - x.amount).slice(0, 5),
    debtors: debtorsAt(b, y + '-12-31'),
    creditors: creditorsNow(b)
  }
}
BPAGES.annual = (R, b) => {
  const years = yearsOf(b)
  const y = UI.f.ry || rpLatest(b).slice(0, 4)
  const a = annualData(b, y)
  const w = a.whole
  const net = w.inTotal - w.exTotal
  const mx = Math.max(1, ...a.rows.map(x => Math.max(x.inc, x.exp)))
  return {
    title: 'گزارش سالانه',
    back: bhash(b, 'reports'),
    html: `<div class="chips">${years
      .map(
        yy =>
          `<button class="chip ${
            yy === y ? 'on' : ''
          }" data-a="setf" data-k="ry" data-v="${yy}">${fa(yy).replace(/٬/g, '')}</button>`
      )
      .join('')}</div>
    <div class="stats"><div class="stat"><small>درآمد سال</small><b>${money(
      w.inTotal
    )}</b></div><div class="stat"><small>هزینهٔ سال</small><b>${money(
      w.exTotal
    )}</b></div><div class="stat"><small>${net >= 0 ? 'مازاد' : 'کسری'}</small><b class="${
      net >= 0 ? 'pos' : 'neg'
    }">${money(Math.abs(net))}</b></div></div>
    <div class="card"><b>درآمد و هزینهٔ ماهانه</b><div class="cols">${a.rows
      .map(
        x =>
          `<div class="c"><div class="pair"><i class="g" style="height:${
            (x.inc / mx) * 100
          }%"></i><i style="height:${(x.exp / mx) * 100}%"></i></div>${fa(
            Number(x.k.slice(5))
          )}</div>`
      )
      .join(
        ''
      )}</div><span class="sub"><span class="pill good">درآمد</span> <span class="pill">هزینه</span></span></div>
    <div class="card"><table class="tbl"><tr><th>ماه</th><th>صادرشده</th><th>درآمد</th><th>هزینه</th><th>تراز</th></tr>${a.rows
      .map(
        x =>
          `<tr><td>${monthName(x.k)}</td><td>${x.billed ? money(x.billed) : '—'}</td><td>${
            x.inc ? money(x.inc) : '—'
          }</td><td>${x.exp ? money(x.exp) : '—'}</td><td class="${
            x.inc - x.exp >= 0 ? 'pos' : 'neg'
          }">${x.inc || x.exp ? money(x.inc - x.exp) : '—'}</td></tr>`
      )
      .join('')}<tr><th>جمع</th><th>${money(a.billed)}</th><th>${money(w.inTotal)}</th><th>${money(
      w.exTotal
    )}</th><th>${money(net)}</th></tr></table></div>
    <div class="card flat">${rowLine('موجودی صندوق اول سال', '', money(w.opening))}${rowLine(
      'موجودی صندوق آخر سال',
      '',
      money(w.closing)
    )}</div>
    <div class="sec"><span>هزینه‌ها به تفکیک دسته</span></div><div class="card flat">${a.cats
      .map(([k, v]) =>
        rowLine(esc(k), fa(Math.round((v / (w.exTotal || 1)) * 100)) + '٪', money(v))
      )
      .join('')}</div>
    <div class="chips">${a.kinds
      .map(([k, v]) => `<span class="pill">${esc(k)}: ${money(v)}</span>`)
      .join('')}</div>
    <div class="sec"><span>۵ هزینهٔ بزرگ سال</span></div><div class="card flat">${a.top
      .map(x => rowLine(esc(x.title), dateFa(x.date) + ' · ' + esc(x.cat), money(x.amount), 'neg'))
      .join('')}</div>
    <div class="sec"><span>پایان سال</span></div><div class="card flat">${rowLine(
      'واحدهای بدهکار',
      fa(a.debtors.length) + ' واحد',
      money(a.debtors.reduce((s, x) => s + x.open, 0)),
      'neg'
    )}${rowLine(
      'بدهی ساختمان',
      'به مدیر، پیمانکاران و اعتبار واحدها',
      money(a.creditors.reduce((s, x) => s + x.amount, 0))
    )}</div>
    ${outBar('annual')}`
  }
}
