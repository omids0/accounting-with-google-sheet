/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* ================= checks ================= */
BPAGES.checks = (R, b) => {
  const list = [...b.checks].sort((x, y) => x.due.localeCompare(y.due))
  return {
    title: 'چک‌های ساختمان',
    html: `<div class="card flat">${
      list
        .map(
          c =>
            `<div class="row"><span class="t">${esc(c.payee)}<small>سررسید ${dateFa(c.due)}${
              c.note ? ' · ' + esc(c.note) : ''
            }</small></span><span class="amt ${c.status === 'passed' ? 'muted' : 'neg'}">${money(
              c.amount
            )}</span>${
              c.status === 'passed'
                ? '<span class="pill good">پاس شد</span>'
                : `<button class="btn sm" data-a="passcheck" data-c="${c.id}">پاس شد</button>`
            }</div>`
        )
        .join('') || '<div class="row muted">چکی نیست</div>'
    }</div>
    <p class="note">«پاس شد» = هزینه از حساب صندوق ثبت می‌شود.</p>`,
    fab: [{ a: 'sheet', data: 'data-n="checkForm"', label: '+ چک' }]
  }
}
ACT.passcheck = d => {
  const b = curB()
  const c = b.checks.find(x => x.id === d.c)
  c.status = 'passed'
  addRec(b, {
    type: 'expense',
    date: TODAY,
    title: 'پاس شدن چک ' + c.payee,
    amount: c.amount,
    cat: 'تعمیرات',
    sub: '',
    kind: 'current',
    payer: 'fund',
    acc: c.acc,
    cp: c.payee
  })
  logAct(b, 'چک ' + c.payee + ' پاس شد')
  toast('چک پاس شد · از صندوق کسر شد')
}

/* ================= counterparties ================= */
const PERSON_KINDS = [
  { value: 'resident', label: 'ساکن / مالک' },
  { value: 'contractor', label: 'پیمانکار / خدمات' }
]
BPAGES.counterparties = (R, b) => {
  const grp = k => b.people.filter(p => p.kind === k)
  const row = p =>
    `<div class="row">${avatarOf(p.name)}<span class="t">${esc(p.name)}${
      p.me ? ' <span class="pill">من</span>' : ''
    }<small>${esc(p.phone || '—')}${
      p.card ? ' · کارت ' + esc(p.card.slice(0, 4) + '…' + p.card.slice(-4)) : ''
    }</small></span></div>`
  return {
    title: 'طرف حساب‌های ساختمان',
    html: `<p class="note">این فهرست فقط مال همین ساختمان است و با طرف‌حساب‌های شخصی شما یکی نمی‌شود.</p>
    <div class="sec"><span>ساکنان و مالکان (${fa(
      grp('resident').length
    )})</span></div><div class="card flat">${grp('resident').map(row).join('')}</div>
    <div class="sec"><span>پیمانکاران و خدمات (${fa(
      grp('contractor').length
    )})</span></div><div class="card flat">${
      grp('contractor').map(row).join('') || '<div class="row muted">—</div>'
    }</div>`,
    fab: [{ a: 'sheet', data: 'data-n="personForm"', label: '+ طرف حساب' }]
  }
}

/* ================= bank SMS ================= */
BPAGES.sms = (R, b) => {
  const queue = b.sms.filter(s => s.state === 'new')
  const known = queue.filter(s => s.type === 'in' && smsCandidates(b, s).both.length === 1)
  const card = s => {
    const c = smsCandidates(b, s)
    let sug = ''
    if (s.type === 'in') {
      if (c.both.length === 1) {
        const u = c.both[0]
        sug = `<div class="guide ok" style="margin-top:8px"><b>شارژ ${monthName(
          unitBalance(b, u.id).months[0] || latestMonth(b)
        )} · واحد ${fa(u.no)} · ${esc(
          chargeDebtor(b, u).person.name
        )}</b><span class="sub">کارت و مبلغ هر دو می‌خوانند</span><div class="btns" style="margin-top:8px"><button class="btn primary sm" data-a="smspay" data-m="${
          s.id
        }" data-u="${u.id}">ثبت پرداخت واحد ${fa(u.no)}</button></div></div>`
      } else if (c.byAmount.length || c.cardMatch.length) {
        const cand = [...new Set([...c.byAmount, ...c.cardMatch])]
        const pick = UI.f['pick' + s.id]
        sug = `<div class="card" style="margin-top:8px"><span class="sub">فقط مبلغ می‌خواند؛ واحد را انتخاب کن:</span><div class="chips" style="margin:6px 0">${cand
          .map(
            u =>
              `<button class="chip ${pick === u.id ? 'on' : ''}" data-a="setf" data-k="pick${
                s.id
              }" data-v="${u.id}">واحد ${fa(u.no)}</button>`
          )
          .join('')}</div><button class="btn primary sm" ${
          pick ? '' : 'disabled'
        } data-a="smspay" data-m="${s.id}" data-u="${pick || ''}">${
          pick ? 'ثبت پرداخت واحد ' + fa(unitById(b, pick).no) : 'ابتدا واحد را انتخاب کنید'
        }</button></div>`
      } else
        sug = `<span class="sub">واحدی با این مبلغ پیدا نشد.</span> <button class="btn sm" data-a="sheet" data-n="incomeForm">ثبت درآمد متفرقه</button>`
    } else {
      const a = /آسانسور/.test(s.text)
      sug = `<div class="guide ok" style="margin-top:8px"><b>${
        a ? 'سرویس آسانسور · طبق تکرار ماهانه' : 'هزینه'
      }</b><div class="btns" style="margin-top:8px"><button class="btn primary sm" data-a="smsexp" data-m="${
        s.id
      }">ثبت هزینه</button></div></div>`
    }
    return `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><b>${
      s.type === 'in' ? 'واریز' : 'برداشت'
    } ${money(
      s.amount
    )}</b><span class="pill">به این ساختمان (کارت ملت ۳۲۱۰)</span></div><span class="sub">${esc(
      s.text
    )} · ${dateFa(
      s.date
    )}</span>${sug}<button class="btn sm" style="margin-top:8px" data-a="smsignore" data-m="${
      s.id
    }">نادیده بگیر</button></div>`
  }
  return {
    title: 'پیامک بانکی',
    html: `<p class="note">پیامک‌ها روی دستگاه می‌آیند و با شمارهٔ کارت به ساختمان درست می‌روند. کارت‌های این ساختمان: ${
      b.accounts
        .filter(a => a.card)
        .map(a => '…' + lastDigits(a.card))
        .join('، ') || '—'
    }</p>
    ${
      known.length
        ? `<button class="btn primary block" data-a="smsall">ثبت همهٔ شناخته‌شده‌ها (${fa(
            known.length
          )})</button>`
        : ''
    }
    ${queue.map(card).join('') || emptyBox('صف خالی است', 'پیامک جدیدی برای کارت صندوق نیست.')}
    <div class="card"><b>در صف حساب شخصی ماند (${fa(
      S.pb.sms.length
    )})</b><span class="sub">${S.pb.sms
      .map(s => esc(s.text))
      .join(
        ' · '
      )}<br/>کارت شخصی شما در صندوق هیچ ساختمانی نیست؛ رفتار قبلی حفظ می‌شود.</span></div>`
  }
}
function smsDone(b, id, text) {
  const s = b.sms.find(x => x.id === id)
  s.state = 'done'
  toast(text)
}
ACT.smspay = d => {
  const b = curB()
  const s = b.sms.find(x => x.id === d.m)
  if (!d.u) return false
  const res = payUnit(b, d.u, s.amount, b.accounts[0].id, { viaSms: true, date: s.date })
  smsDone(b, d.m, 'پرداخت واحد ' + fa(res.unit.no) + ' ثبت شد · ' + money(res.amount))
}
ACT.smsall = () => {
  const b = curB()
  let n = 0
  b.sms
    .filter(s => s.state === 'new' && s.type === 'in')
    .forEach(s => {
      const c = smsCandidates(b, s)
      if (c.both.length === 1) {
        payUnit(b, c.both[0].id, s.amount, b.accounts[0].id, { viaSms: true, date: s.date })
        s.state = 'done'
        n++
      }
    })
  toast(fa(n) + ' پرداخت ثبت شد (فقط مواردی که کارت و مبلغ هر دو می‌خواندند)')
}
ACT.smsexp = d => {
  const b = curB()
  const s = b.sms.find(x => x.id === d.m)
  saveExpense(b, {
    title: 'سرویس ماهانه آسانسور (پیامک)',
    amount: s.amount,
    cat: 'آسانسور',
    sub: 'سرویس',
    kind: 'current',
    payer: 'fund',
    acc: b.accounts[0].id,
    cp: 'شرکت آسانسور پارس',
    date: s.date,
    splitOn: false
  })
  smsDone(b, d.m, 'هزینهٔ آسانسور ثبت شد')
}
ACT.smsignore = d => smsDone(curB(), d.m, 'نادیده گرفته شد')

/* ================= reports ================= */
BPAGES.reports = (R, b) => {
  const months = chargeMonths(b).slice(0, 4).reverse()
  const mx = Math.max(1, ...months.map(m => monthSummary(b, m).billed))
  const exp = b.recs.filter(r => r.type === 'expense')
  const byCat = {}
  exp.forEach(r => (byCat[r.cat] = (byCat[r.cat] || 0) + r.amount))
  const cats = Object.entries(byCat).sort((x, y) => y[1] - x[1])
  const tot = cats.reduce((s, x) => s + x[1], 0) || 1
  const colors = ['#0f766e', '#14b8a6', '#c99a3f', '#f59e0b', '#6366f1', '#ec4899', '#64748b']
  let acc = 0
  const grad = cats.map(([, v], i) => {
    const a = (acc / tot) * 360
    acc += v
    return colors[i % 7] + ' ' + a + 'deg ' + (acc / tot) * 360 + 'deg'
  })
  const byKind = {}
  exp.forEach(r => (byKind[kindLabel(b, r.kind)] = (byKind[kindLabel(b, r.kind)] || 0) + r.amount))
  const debtors = debtorUnits(b)
    .map(u => ({ u, bal: unitBalance(b, u.id), d: chargeDebtor(b, u) }))
    .sort((x, y) => y.bal.open - x.bal.open)
  return {
    title: 'گزارش‌ها و مجمع',
    html: `<div class="card"><b>صادر شده در برابر وصول‌شده</b><div class="cols">${months
      .map(m => {
        const s = monthSummary(b, m)
        return `<div class="c"><div class="pair"><i style="height:${
          (s.billed / mx) * 100
        }%"></i><i class="g" style="height:${(s.paid / mx) * 100}%"></i></div>${monthName(m)}</div>`
      })
      .join(
        ''
      )}</div><span class="sub"><span class="pill">صادر شده</span> <span class="pill good">وصول</span></span></div>
    <div class="card"><b>هزینه‌ها به تفکیک دسته</b><div style="display:flex;gap:12px;align-items:center;margin-top:8px"><div class="donut" style="background:conic-gradient(${
      grad.join(',') || '#ccc 0 360deg'
    })"></div><div class="leg">${cats
      .map(
        ([k, v], i) =>
          `<span><i style="background:${colors[i % 7]}"></i>${esc(k)} · ${money(v)}</span>`
      )
      .join('')}</div></div>
    <div class="chips" style="margin-top:8px">${Object.entries(byKind)
      .map(([k, v]) => `<span class="pill">${esc(k)}: ${money(v)}</span>`)
      .join('')}</div></div>
    <div class="card"><b>بدهکاران</b><table class="tbl"><tr><th>واحد</th><th>نام</th><th>ماه</th><th>مبلغ</th></tr>${
      debtors
        .map(
          x =>
            `<tr><td>${fa(x.u.no)}</td><td>${esc(x.d ? x.d.person.name : '—')}</td><td>${fa(
              x.bal.months.length
            )}</td><td class="neg">${money(x.bal.open)}</td></tr>`
        )
        .join('') || '<tr><td colspan="4" class="muted">بدهکاری نیست</td></tr>'
    }</table></div>
    <div class="card"><b>بدهی‌ها به مدیر</b><div class="sub">${money(
      dangOpen(b)
        .filter(d => d.cp === 'مدیر')
        .reduce((s, d) => s + d.amount, 0)
    )} تومان باز</div></div>
    <div class="btns"><button class="btn primary" data-a="exportcsv">${ico(
      'dl',
      'sm'
    )} گزارش مجمع (CSV)</button><button class="btn" data-a="exportpdf">PDF</button></div>`
  }
}
