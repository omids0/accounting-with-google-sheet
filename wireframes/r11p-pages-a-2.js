/* eslint-disable -- prototype scripts share globals, not part of the app source */
ACT.wiz2 = () => {
  UI.sheet = { name: 'creating', d: {}, p: { pct: 8 } }
  const steps = [30, 55, 80, 100]
  steps.forEach((p, i) =>
    setTimeout(() => {
      if (!UI.sheet || UI.sheet.name !== 'creating') return
      UI.sheet.p.pct = p
      if (p === 100) {
        const v = UI.w.nb
        const id = 'b' + Date.now()
        const b = newBuilding(id, v.name.startsWith('ساختمان') ? v.name : 'ساختمان ' + v.name, {
          address: v.address,
          floors: v.floors,
          charge: v.charge,
          opening: 0
        })
        b.accounts = v.accounts.map(a => ({
          id: uid('a'),
          name: a.name,
          type: a.type,
          card: a.type === 'cash' ? '' : a.card || '',
          balance: Number(a.bal) || 0
        }))
        Object.assign(b.profile, {
          defaultCharge: Number(v.charge) || 0,
          method: v.method,
          issueDay: Number(v.issueDay),
          dueDay: Number(v.dueDay),
          vacancy: v.vacancy
        })
        b.myRole = 'manager'
        b.plannedUnits = Number(v.units) || 0
        b.members = [{ name: 'امید سهیل‌نیا', roleKey: 'manager', me: true }]
        logAct(b, 'ساختمان ساخته شد')
        b.journey = true
        S.buildings.push(b)
        UI.sheet = null
        UI.w.nb = null
        go(`#/b/${id}/units?s=quick`)
        toast('شیت «حسابداری · ' + b.name + '» ساخته شد')
        return
      }
      render()
    }, 450 * (i + 1))
  )
  return true
}
const roleLabelB = v => (BUILDING_ROLES.find(r => r.value === v) || {}).label

/* ================= building dashboard ================= */
BPAGES.dashboard = (R, b) => {
  if (!b.units.length)
    return {
      title: 'داشبورد ساختمان',
      html: emptyBox(
        'واحدی تعریف نشده',
        'اول واحدها را بساز تا شارژ و صورت‌حساب کار کند.',
        `<button class="btn primary" data-a="sheet" data-n="quick">ساخت سریع واحدها</button>`
      )
    }
  const miss = missingIssueMonths(b)
  const lm = latestMonth(b)
  const ms = lm ? monthSummary(b, lm) : null
  const pct = ms && ms.billed ? Math.round((ms.paid / ms.billed) * 100) : 0
  const mdelta = lm ? flowIn(b, lm) - flowOut(b, lm) : 0
  const debt = debtorUnits(b)
  const debtSum = debt.reduce((s, u) => s + unitBalance(b, u.id).open, 0)
  const dg = dangOpen(b)
  const dgSum = dg.reduce((s, d) => s + d.amount, 0)
  const toMgr = dg.filter(d => d.cp === 'مدیر').reduce((s, d) => s + d.amount, 0)
  const issueCard = miss.length
    ? `<div class="guide"><b>شارژ ${monthName(miss[0])} صادر نشده</b>روز صدور (${fa(
        b.profile.issueDay
      )} هر ماه) گذشته است.<div class="btns" style="margin-top:8px"><button class="btn primary sm" data-a="sheet" data-n="issue" data-m="${
        miss[0]
      }">بررسی و صدور</button></div></div>`
    : ''
  const smsN = b.sms.filter(s => s.state === 'new').length
  const upcoming = [
    ...(miss.length
      ? []
      : [
          {
            d: nextMonth(lm || '1405-08') + '-' + pad(b.profile.issueDay),
            t: 'صدور شارژ ' + monthName(nextMonth(lm || '1405-08')),
            a: '',
            to: bhash(b, 'charges')
          }
        ]),
    ...b.checks
      .filter(c => c.status === 'pending')
      .map(c => ({ d: c.due, t: 'چک ' + c.payee, a: money(c.amount), to: bhash(b, 'checks') })),
    ...b.recs
      .filter(r => r.recurring)
      .map(r => ({
        d: nextMonth(r.date.slice(0, 7)) + r.date.slice(7),
        t: r.title + ' (تکرار)',
        a: money(r.amount),
        to: bhash(b, 'expenses')
      }))
  ]
    .sort((x, y) => x.d.localeCompare(y.d))
    .slice(0, 4)
  const month = (lm || '1405-07').slice(0, 7)
  const exN = b.recs.filter(r => r.type === 'expense' && r.date.startsWith(month)).length
  return {
    title: 'داشبورد ساختمان',
    html: `${fillCardHTML(b)}${issueCard}
    <div class="hero"><small>صندوق ساختمان</small><div class="big num">${money(
      sumAcc(b)
    )} <span style="font-size:13px;font-weight:500">تومان</span></div><div class="delta">${
      mdelta >= 0 ? '↑' : '↓'
    } ${money(Math.abs(mdelta))} در ${lm ? monthName(lm) : '—'} · وصول ‎− هزینه</div></div>
    ${
      ms
        ? `<button class="card" style="text-align:right;width:100%;font:inherit;color:inherit" data-a="go" data-to="${bhash(
            b,
            'charges'
          )}"><b>شارژ ${monthName(lm)}</b><span class="sub">${fa(ms.units - ms.openUnits)} از ${fa(
            ms.units
          )} واحد پرداخت کرده · وصول ${fa(
            pct
          )}٪</span><div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div></button>`
        : ''
    }
    <div class="stats"><button class="stat" data-a="go" data-to="${bhash(
      b,
      'units'
    )}?f=debt"><small>بدهکار</small><b>${fa(debt.length)} واحد</b><small class="neg">${money(
      debtSum
    )}</small></button>
    <button class="stat" data-a="go" data-to="${bhash(
      b,
      'dang'
    )}"><small>بدهی ساختمان</small><b>${money(dgSum)}</b><small>به مدیر ${money(
      toMgr
    )}</small></button></div>
    <div class="sec"><span>پیش رو</span></div><div class="card flat">${
      upcoming
        .map(
          u =>
            `<button class="row" data-a="go" data-to="${u.to}"><span class="t">${esc(
              u.t
            )}<small>${dateFa(u.d)}</small></span><span class="amt">${u.a}</span></button>`
        )
        .join('') || '<div class="row muted">موردی نیست</div>'
    }</div>
    <div class="sec"><span>این ماه</span></div><div class="card flat">
    <button class="row" data-a="go" data-to="${bhash(
      b,
      'expenses'
    )}"><span class="t">هزینه‌های ${monthName(month)}<small>${fa(
      exN
    )} هزینه ثبت شده</small></span>${ico('left')}</button>
    <button class="row" data-a="go" data-to="${bhash(
      b,
      'sms'
    )}"><span class="t">پیامک‌های در انتظار<small>${fa(
      smsN
    )} پیامک برای کارت صندوق</small></span>${ico('left')}</button></div>`
  }
}

/* ================= units ================= */
BPAGES.units = (R, b) => {
  const f = R.q.get('f')
  if (f && UI.f.st === undefined) UI.f.st = f
  const st = UI.f.st || 'all'
  const q = (UI.f.q || '').trim()
  UI.f.fl = UI.f.fl || 'all'
  const fl = UI.f.fl
  const floors = [...new Set(b.units.map(u => u.floor))].sort((a, c) => a - c)
  let list = b.units.filter(u => u.active)
  if (st === 'debt') list = list.filter(u => unitBalance(b, u.id).open > 0)
  if (st === 'vacant') list = list.filter(u => !occupantStay(b, u.id))
  if (fl !== 'all') list = list.filter(u => String(u.floor) === fl)
  if (q)
    list = list.filter(u => (fa(u.no) + ' ' + String(u.no) + ' ' + unitLine(b, u).who).includes(q))
  const n = {
    all: b.units.length,
    debt: debtorUnits(b).length,
    vacant: b.units.filter(u => !occupantStay(b, u.id)).length
  }
  const chip = (k, l, c) =>
    `<button class="chip ${st === k ? 'on' : ''}" data-a="setf" data-k="st" data-v="${k}">${l} ${fa(
      c
    )}</button>`
  return {
    title: 'واحدها',
    html: `${fillCardHTML(
      b
    )}<input class="input" placeholder="جستجوی شماره یا نام…" data-bind="f.q" value="${esc(
      UI.f.q || ''
    )}" /><div class="chips">${chip('all', 'همه', n.all)}${chip('debt', 'بدهکار', n.debt)}${chip(
      'vacant',
      'خالی',
      n.vacant
    )}</div>
    ${sel(
      '',
      'f.fl',
      [
        { value: 'all', label: 'همهٔ طبقه‌ها' },
        ...floors.map(x => ({ value: String(x), label: 'طبقه ' + fa(x) }))
      ],
      { id: 'fl' }
    )}
    ${
      list.length
        ? `<div class="card flat">${list.map(u => unitRowHTML(b, u)).join('')}</div>`
        : emptyBox(
            'واحدی پیدا نشد',
            b.units.length ? 'فیلترها را تغییر بده.' : 'اول واحدها را بساز.',
            b.units.length
              ? ''
              : `<button class="btn primary" data-a="sheet" data-n="quick">ساخت سریع واحدها</button>`
          )
    }
    <p class="note">لمس ردیف = صفحهٔ واحد.</p>`,
    fab: [{ a: 'sheet', data: 'data-n="unitForm"', label: '+ واحد' }]
  }
}
