/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — publishable reports: period model, statement (صورت‌حساب هزینه/درآمد) */
'use strict'
const rpLatest = b => chargeMonths(b)[0] || TODAY.slice(0, 7)
const monthRange = k => ({ from: k + '-01', to: k + '-31' })
const RP_MODES = [
  { k: 'cur', l: 'دورهٔ شارژ' },
  { k: 'prev', l: 'دورهٔ قبل' },
  { k: 'q', l: '۳ ماه' },
  { k: 'year', l: 'از اول سال' },
  { k: 'custom', l: 'بازهٔ دلخواه' }
]
/* the default period is the month the last charge was issued for (the period the building runs on) */
function repRange(b) {
  const mode = UI.f.rpMode || 'cur'
  const cur = rpLatest(b)
  if (mode === 'prev') {
    const k = prevMonth(cur)
    return { ...monthRange(k), label: monthLabel(k), mode }
  }
  if (mode === 'q') {
    const k = prevMonth(prevMonth(cur))
    return {
      from: k + '-01',
      to: cur + '-31',
      label: monthName(k) + ' تا ' + monthLabel(cur),
      mode
    }
  }
  if (mode === 'year')
    return {
      from: cur.slice(0, 4) + '-01-01',
      to: cur + '-31',
      label: 'فروردین تا ' + monthLabel(cur),
      mode
    }
  if (mode === 'custom') {
    const f = en(UI.f.rpFrom || '')
    const t = en(UI.f.rpTo || '')
    const ok = s => /^\d{4}-\d{2}-\d{2}$/.test(s)
    if (ok(f) && ok(t) && f <= t)
      return { from: f, to: t, label: dateFa(f) + ' تا ' + dateFa(t), mode }
    return { ...monthRange(cur), label: monthLabel(cur), mode, bad: true }
  }
  return { ...monthRange(cur), label: monthLabel(cur), mode: 'cur' }
}
function periodBar(b) {
  const r = repRange(b)
  const chips = RP_MODES.map(
    m =>
      `<button class="chip ${r.mode === m.k ? 'on' : ''}" data-a="setf" data-k="rpMode" data-v="${
        m.k
      }">${m.l}</button>`
  ).join('')
  const custom =
    r.mode === 'custom'
      ? `<div class="grid2">${txt('از تاریخ', 'f.rpFrom', { ph: '۱۴۰۵-۰۷-۰۱' })}${txt(
          'تا تاریخ',
          'f.rpTo',
          { ph: '۱۴۰۵-۰۷-۳۰' }
        )}</div>${
          r.bad
            ? '<p class="note">تاریخ‌ها را به شکل ۱۴۰۵-۰۷-۰۱ بنویس؛ تا آن موقع دورهٔ شارژ نشان داده می‌شود.</p>'
            : ''
        }`
      : ''
  const empty =
    r.mode === 'cur' && !b.recs.some(x => x.date >= r.from && x.date <= r.to)
      ? '<div class="guide"><b>هنوز رکوردی در این دوره نیست</b>اول دوره است. برای دیدن ماه گذشته «دورهٔ قبل» را بزن.</div>'
      : ''
  return `<div class="chips">${chips}</div>${custom}${empty}<p class="note">بازه: <b>${
    r.label
  }</b>${r.mode === 'cur' ? ' · پیش‌فرض، ماهی که آخرین شارژ برایش صادر شده' : ''}</p>`
}
const fundEffect = r =>
  r.acc ? ({ income: 1, correction: 1, expense: -1, transfer: -1 }[r.type] || 0) * r.amount : 0
const byDate = (x, y) => x.date.localeCompare(y.date)
function stmtData(b, from, to) {
  const list = b.recs.filter(r => r.date >= from && r.date <= to).sort(byDate)
  const sum = a => a.reduce((s, r) => s + r.amount, 0)
  const total = sumAcc(b)
  const income = list.filter(r => r.type === 'income')
  const expense = list.filter(r => r.type === 'expense')
  return {
    income,
    expense,
    transfers: list.filter(r => r.type === 'transfer'),
    corrections: list.filter(r => r.type === 'correction'),
    inTotal: sum(income),
    exTotal: sum(expense),
    pocket: sum(expense.filter(r => !r.acc)),
    opening: total - b.recs.filter(r => r.date >= from).reduce((s, r) => s + fundEffect(r), 0),
    closing: total - b.recs.filter(r => r.date > to).reduce((s, r) => s + fundEffect(r), 0)
  }
}
const outBar = k =>
  `<div class="btns" style="margin-top:10px"><button class="btn primary" data-a="repcopy" data-k="${k}">${ico(
    'share',
    'sm'
  )} کپی متن برای گروه ساختمان</button><button class="btn" data-a="exportpdf">PDF</button><button class="btn" data-a="repcsv" data-k="${k}">CSV</button></div><p class="note">متن کوتاه برای پیام‌رسان؛ PDF و CSV برای بایگانی یا مجمع.</p>`
const rowLine = (t, small, amt, cls) =>
  `<div class="row"><span class="t">${t}${
    small ? '<small>' + small + '</small>' : ''
  }</span><span class="amt ${cls || ''}">${amt}</span></div>`
BPAGES.statement = (R, b) => {
  const r = repRange(b)
  const d = stmtData(b, r.from, r.to)
  const brief = UI.f.rpBrief === '1'
  const items = it =>
    UI.f.rpItems === '1' && it.items && it.items.length
      ? it.items.map(x => esc(x.name || x.title || '') + ' ' + money(x.amount || 0)).join(' · ')
      : ''
  const inRows = d.income
    .map(x =>
      rowLine(esc(x.title), dateFa(x.date) + ' · ' + esc(x.cat || ''), money(x.amount), 'pos')
    )
    .join('')
  const exRows = d.expense
    .map(x =>
      rowLine(
        esc(x.title),
        [
          dateFa(x.date),
          esc(x.cat) + (x.sub ? ' › ' + esc(x.sub) : ''),
          kindLabel(b, x.kind),
          payerLabel(b, x.payer),
          items(x)
        ]
          .filter(Boolean)
          .join(' · '),
        money(x.amount),
        'neg'
      )
    )
    .join('')
  const net = d.inTotal - d.exTotal
  return {
    title: 'صورت‌حساب هزینه و درآمد',
    back: bhash(b, 'reports'),
    html: `${periodBar(b)}
    <div class="chips"><button class="chip ${
      !brief ? 'on' : ''
    }" data-a="setf" data-k="rpBrief" data-v="">ریز رکوردها</button><button class="chip ${
      brief ? 'on' : ''
    }" data-a="setf" data-k="rpBrief" data-v="1">فقط جمع‌ها</button><button class="chip ${
      UI.f.rpItems === '1' ? 'on' : ''
    }" data-a="setf" data-k="rpItems" data-v="${
      UI.f.rpItems === '1' ? '' : '1'
    }">با ریز اقلام</button></div>
    <div class="stats"><div class="stat"><small>درآمد</small><b>${money(
      d.inTotal
    )}</b></div><div class="stat"><small>هزینه</small><b>${money(
      d.exTotal
    )}</b></div><div class="stat"><small>${net >= 0 ? 'مازاد' : 'کسری'}</small><b class="${
      net >= 0 ? 'pos' : 'neg'
    }">${money(Math.abs(net))}</b></div></div>
    <div class="card flat">${rowLine('موجودی صندوق اول بازه', '', money(d.opening))}${rowLine(
      'موجودی صندوق آخر بازه',
      '',
      money(d.closing)
    )}${
      d.pocket
        ? rowLine(
            'از هزینه‌ها، جیب مدیر',
            'هنوز از صندوق خارج نشده (بدهی به مدیر)',
            money(d.pocket)
          )
        : ''
    }</div>
    ${
      brief
        ? ''
        : `<div class="sec"><span>درآمدها · ${fa(
            d.income.length
          )} رکورد</span></div><div class="card flat">${
            inRows || '<div class="row muted">رکوردی نیست</div>'
          }</div><div class="sec"><span>هزینه‌ها · ${fa(
            d.expense.length
          )} رکورد</span></div><div class="card flat">${
            exRows || '<div class="row muted">رکوردی نیست</div>'
          }</div>${
            d.transfers.length
              ? `<div class="sec"><span>انتقال‌های صندوق (جزو هزینه نیست)</span></div><div class="card flat">${d.transfers
                  .map(x => rowLine(esc(x.title), dateFa(x.date), money(x.amount)))
                  .join('')}</div>`
              : ''
          }`
    }
    <p class="note">هزینهٔ پرداخت‌شده از جیب مدیر یک بار در هزینه‌ها می‌آید؛ بازپرداخت آن از صندوق «انتقال» است و دوباره حساب نمی‌شود.</p>
    ${outBar('statement')}`
  }
}
