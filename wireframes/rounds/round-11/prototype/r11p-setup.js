/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — setup journey: checklist after creating a building, completion summary, first issue, invite */
'use strict'

/* first issue is manual; later months are automatic (manager only, no placeholder owners) */
function missingIssueMonths(b, today = TODAY) {
  if (!b.units.length) return []
  const [y, m, d] = today.split('-').map(Number)
  const cur = mkey(y, m)
  const start = d < b.profile.issueDay ? prevMonth(cur) : cur
  if (!chargeMonths(b).length) return [start]
  const has = k => b.rec.some(r => r.ref && r.ref.startsWith('charge:') && r.month === k)
  const out = []
  let k = start
  for (let i = 0; i < 12; i++) {
    if (has(k)) break
    out.push(k)
    k = prevMonth(k)
  }
  return out.reverse()
}
function autoIssue(b) {
  if (!can('autoIssue')) return
  if (!b.units.length || !chargeMonths(b).length || incompleteUnits(b).length) return
  S.autoDone = S.autoDone || {}
  const key = b.id + ':' + TODAY
  if (S.autoDone[key]) return
  S.autoDone[key] = 1
  dedupeChargeReferences(b)
  const months = missingIssueMonths(b)
  let n = 0
  months.forEach(m => (n += issueCharges(b, m, m + '-' + pad(Number(b.profile.dueDay)), '')))
  if (n) {
    UI.toast =
      'شارژ ' + months.map(monthName).join('، ') + ' خودکار برای ' + fa(n) + ' واحد صادر شد'
    UI.anim.toast = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      UI.toast = null
      render()
    }, 3600)
  }
}

/* ---------- checklist ---------- */
function setupSteps(b) {
  const s = b.setup || (b.setup = {})
  return [
    {
      k: 'units',
      t: 'تعریف واحدها و طبقه‌ها',
      done: b.units.length > 0,
      go: () => ACT.sheet({ n: 'quick' })
    },
    {
      k: 'people',
      t: 'ثبت مالک و ساکنان هر واحد',
      done: b.units.length > 0 && !incompleteUnits(b).length,
      go: () => ACT.fillopen()
    },
    {
      k: 'opening',
      t: 'موجودی فعلی حساب‌های صندوق',
      done: !!s.opening || sumAcc(b) > 0,
      go: () => ACT.sheet({ n: 'opening' })
    },
    {
      k: 'debts',
      t: 'بدهی‌های قبلی واحدها',
      optional: true,
      done: !!s.debts || chargeMonths(b).length > 0,
      go: () => ACT.sheet({ n: 'prevDebts' })
    },
    {
      k: 'issue',
      t: 'صدور اولین شارژ',
      done: chargeMonths(b).length > 0,
      go: () => ACT.sheet({ n: 'issue' })
    },
    {
      k: 'invite',
      t: 'دعوت هیئت مدیره و حسابدار',
      optional: true,
      done: !!s.invite || b.members.length > 1,
      go: () => ACT.sheet({ n: 'invite' })
    }
  ]
}
const nextStep = b => setupSteps(b).find(x => !x.done)
function setupCardHTML(b) {
  if (!can('settings')) return ''
  const st = setupSteps(b)
  const done = st.filter(x => x.done).length
  if (done === st.length) return ''
  const cur = nextStep(b)
  return `<div class="card"><b>راه‌اندازی ساختمان · ${fa(done)} از ${fa(
    st.length
  )}</b><div class="bar" style="margin:8px 0"><i style="width:${Math.round(
    (done / st.length) * 100
  )}%"></i></div>
  <div class="card flat" style="box-shadow:none">${st
    .map(
      x =>
        `<div class="row"><span class="badge circle" style="min-width:28px;height:28px;font-size:12px;${
          x.done ? '' : 'background:var(--color-bg);border:1px solid var(--color-border)'
        }">${x.done ? '✓' : ''}</span><span class="t" style="${x.done ? 'opacity:.55' : ''}">${
          x.t
        }${x.optional ? '<small>اختیاری</small>' : ''}</span>${
          x.done
            ? ''
            : x === cur
            ? `<button class="btn primary sm" data-a="setupgo" data-k="${x.k}">ادامه</button>`
            : `<button class="btn sm" data-a="setupgo" data-k="${x.k}">باز کن</button>`
        }${
          !x.done && x.optional
            ? `<button class="btn sm" data-a="setupskip" data-k="${x.k}">رد</button>`
            : ''
        }</div>`
    )
    .join('')}</div></div>`
}
ACT.setupgo = d => {
  const s = setupSteps(curB()).find(x => x.k === d.k)
  UI.sheet = null
  if (s) s.go()
  return false
}
ACT.setupskip = d => {
  const b = curB()
  b.setup = b.setup || {}
  b.setup[d.k] = true
  /* from a sheet: continue the flow (the last step has no next one, so it must still close the sheet) */
  if (UI.sheet) return goNextStep(b)
}
function goNextStep(b) {
  const n = nextStep(b)
  UI.sheet = null
  if (n) {
    n.go()
    toast('مرحلهٔ بعد: ' + n.t)
  } else {
    go('#/b/' + b.id + '/dashboard')
    toast('راه‌اندازی کامل شد · از این ماه به بعد شارژ هر ماه خودکار صادر می‌شود')
  }
  return false
}
{
  const o = BPAGES.dashboard
  BPAGES.dashboard = (R, b) => {
    const p = o(R, b)
    p.html = setupCardHTML(b) + p.html
    return p
  }
  const oc = BPAGES.charges
  BPAGES.charges = (R, b) => {
    const p = oc(R, b)
    if (!chargeMonths(b).length)
      p.html = p.html.replace(
        /<div class="empty">[\s\S]*?<\/div>\s*(?=<|$)/,
        `<div class="empty"><b>هنوز شارژی صادر نشده</b>اولین شارژ را با پیش‌نمایش صادر کن؛ بعد از آن هر ماه خودکار صادر می‌شود.<div style="margin-top:10px"><button class="btn primary" data-a="sheet" data-n="issue">صدور اولین شارژ</button></div></div>`
      )
    return p
  }
  const os = BPAGES.settings
  BPAGES.settings = (R, b) => {
    const p = os(R, b)
    p.html = p.html.replace(
      '<div class="sec"><span>فعالیت‌ها</span></div>',
      `<button class="btn block" style="margin-top:8px" data-a="sheet" data-n="invite">+ دعوت عضو (هیئت مدیره / حسابدار)</button><div class="sec"><span>فعالیت‌ها</span></div>`
    )
    return p
  }
  const orr = BPAGES.residents
  BPAGES.residents = (R, b) => {
    const p = orr(R, b)
    p.html = fillCardHTML(b) + p.html
    return p
  }
}

/* ---------- completion: end screen with the next step ---------- */
const origFillSave = ACT.fillsave
ACT.fillsave = () => {
  const r = origFillSave()
  if (r === false) return r
  if (!UI.sheet || !incompleteUnits(curB()).length) {
    UI.toast = null
    openSheet('fillDone')
  }
  return false
}
const origFillSkip = ACT.fillskip
ACT.fillskip = () => {
  origFillSkip()
  if (!UI.sheet) openSheet('fillDone')
  return false
}
SHEETS.fillDone = (s, b) => {
  const left = incompleteUnits(b).length
  const cnt = { owner: 0, tenant: 0, vacant: 0 }
  b.units.forEach(u => {
    const st = occupantStay(b, u.id)
    cnt[!st ? 'vacant' : st.role === 'tenant' ? 'tenant' : 'owner']++
  })
  const nx = nextStep(b)
  return {
    title: left ? 'تکمیل واحدها · نیمه‌کاره' : 'همهٔ واحدها تکمیل شد ✓',
    body: `<div class="guide ${left ? '' : 'ok'}"><b>${
      left
        ? fa(left) + ' واحد هنوز بدون نام مالک است'
        : fa(b.units.length) + ' واحد با مالک و ساکن ثبت شد'
    }</b>مالک ساکن: ${fa(cnt.owner)} · مستأجر: ${fa(cnt.tenant)} · خالی: ${fa(cnt.vacant)}</div>
    ${
      left
        ? '<div style="height:8px"></div><button class="btn block" data-a="fillopen">ادامهٔ تکمیل واحدها</button>'
        : ''
    }
    ${
      nx
        ? `<div class="card" style="margin-top:10px"><b>قدم بعدی</b><span class="sub">${nx.t}${
            nx.optional ? ' (اختیاری)' : ''
          }</span><div class="btns" style="margin-top:8px"><button class="btn primary" data-a="setupgo" data-k="${
            nx.k
          }">ادامه: ${nx.t}</button></div></div>`
        : ''
    }`,
    foot: `<button class="btn" data-a="sheetclose">بعداً</button>${
      nx
        ? ''
        : `<button class="btn primary" data-a="go" data-to="#/b/${b.id}/dashboard">رفتن به داشبورد</button>`
    }`
  }
}

/* ---------- opening balances, previous debts, invite ---------- */
SHEETS.opening = (s, b) => {
  const d = s.d
  if (!d.bal) d.bal = Object.fromEntries(b.accounts.map(a => [a.id, a.balance]))
  return {
    title: 'موجودی فعلی حساب‌ها',
    body: `<p class="sub">موجودی امروز هر حساب صندوق را وارد کن؛ از اینجا به بعد با پرداخت‌ها و هزینه‌ها خودکار تغییر می‌کند.</p>${b.accounts
      .map(a =>
        txt(
          esc(a.name) + (a.card ? ' · …' + lastDigits(a.card) : '') + ' (تومان)',
          'd.bal.' + a.id,
          { amount: 1, num: 1 }
        )
      )
      .join('')}`,
    foot: `<button class="btn" data-a="setupskip" data-k="opening">رد کردن</button><button class="btn primary" data-a="saveopening">ثبت و ادامه</button>`
  }
}
ACT.saveopening = () => {
  const b = curB()
  const d = UI.sheet.d
  b.accounts.forEach(a => (a.balance = Number((d.bal || {})[a.id]) || 0))
  b.setup.opening = true
  logAct(b, 'موجودی اولیه حساب‌ها ثبت شد')
  return goNextStep(b)
}
