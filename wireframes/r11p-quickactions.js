/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* round 11 prototype — fund accounts modal (wizard + fund page), dashboard speed dial */
'use strict'

/* registry: account types (same idea as the wallet page) */
const ACCOUNT_TYPES = [
  { value: 'bank', label: 'حساب بانکی', hint: 'با کارت؛ پیامک بانکی به همین ساختمان می‌آید' },
  { value: 'cash', label: 'نقدی (صندوق دستی)', hint: 'مثلاً نقد دست سرایدار؛ بدون پیامک' }
]
const typeLabel = v => (ACCOUNT_TYPES.find(t => t.value === v) || ACCOUNT_TYPES[0]).label
const accountFields = d =>
  `${txt('نام حساب', 'd.name', { ph: 'مثلاً ملت · صندوق' })}${sel(
    'نوع حساب',
    'd.type',
    ACCOUNT_TYPES,
    { id: 'at' }
  )}${
    d.type === 'cash'
      ? ''
      : txt('شمارهٔ کارت', 'd.card', {
          tel: 1,
          ph: '۶۱۰۴۳۳۷۰۰۰۰۰۳۲۱۰',
          hint: 'پیامک‌های این کارت به همین ساختمان مسیریابی می‌شود'
        })
  }`

/* ---------- wizard step 2: accounts list + modal ---------- */
const origWizPage = PPAGES.new
PPAGES.new = R => {
  const p = origWizPage(R)
  if (R.arg !== '2') return p
  const v = UI.w.nb
  const list = v.accounts
    .map(
      (a, i) =>
        `<button class="row" data-a="wizaccopen" data-i="${i}"><span class="badge">${ico(
          'bank'
        )}</span><span class="t">${esc(a.name)}<small>${
          a.type === 'cash' ? 'نقدی' : esc(a.card || 'کارت ثبت نشده')
        }</small></span><span class="amt">${money(a.bal)}</span>${ico('left')}</button>`
    )
    .join('')
  const block = `<div class="sec"><span>صندوق ساختمان · حساب‌ها</span><button data-a="wizaccopen" data-i="-1">+ حساب جدید</button></div>
  <div class="card flat">${
    list || '<div class="row muted">حسابی نیست؛ حداقل یک حساب لازم است</div>'
  }${
    v.accounts.length
      ? `<div class="row"><span class="t muted">جمع موجودی</span><span class="amt">${money(
          v.accounts.reduce((s, a) => s + (Number(a.bal) || 0), 0)
        )}</span></div>`
      : ''
  }</div>
  <button class="btn block" style="border-style:dashed" data-a="wizaccopen" data-i="-1">+ افزودن حساب (بانکی یا نقدی)</button>
  <p class="note">هر حساب با موجودی فعلی‌اش ثبت می‌شود. بعداً از «صندوق» حساب‌ها را اضافه، ویرایش و با بانک تطبیق می‌دهی.</p>`
  p.html = p.html.replace(
    /<div class="sec"><span>صندوق ساختمان · حساب‌ها<\/span><\/div>[\s\S]*?(?=<div class="sec"><span>شارژ<\/span><\/div>)/,
    block
  )
  return p
}
ACT.wizaccopen = d => {
  const i = Number(d.i)
  const a = i >= 0 ? UI.w.nb.accounts[i] : null
  openSheet(
    'wizAccount',
    a
      ? { i, name: a.name, type: a.type, card: a.card, bal: a.bal }
      : { i: -1, name: '', type: 'bank', card: '', bal: 0 }
  )
  return false
}
SHEETS.wizAccount = s => {
  const d = s.d
  const edit = d.i >= 0
  const canDelete = edit && UI.w.nb.accounts.length > 1
  return {
    title: edit ? 'ویرایش حساب' : 'حساب جدید',
    body: `${accountFields(d)}${amt('موجودی فعلی (تومان)', 'd.bal')}${
      canDelete ? '<button class="btn danger block" data-a="wizaccdel">حذف این حساب</button>' : ''
    }`,
    foot: `<button class="btn" data-a="sheetclose">بستن</button><button class="btn primary" data-a="wizaccsave">ذخیره</button>`
  }
}
ACT.wizaccsave = () => {
  const d = UI.sheet.d
  if (!String(d.name || '').trim()) return toast('نام حساب را وارد کنید'), false
  const acc = {
    id: d.i >= 0 ? UI.w.nb.accounts[d.i].id : 'w' + Date.now(),
    name: d.name.trim(),
    type: d.type,
    card: d.type === 'cash' ? '' : d.card,
    bal: Number(d.bal) || 0
  }
  if (d.i >= 0) UI.w.nb.accounts[d.i] = acc
  else UI.w.nb.accounts.push(acc)
  UI.sheet = null
}
ACT.wizaccdel = () => {
  UI.w.nb.accounts.splice(UI.sheet.d.i, 1)
  UI.sheet = null
}
const origWiz2 = ACT.wiz2
ACT.wiz2 = () => {
  if (!UI.w.nb.accounts.length) return toast('حداقل یک حساب برای صندوق لازم است'), false
  return origWiz2()
}

/* ---------- fund page: same modal with the account type ---------- */
SHEETS.accountForm = s => {
  const edit = !!s.p.unitId
  return {
    title: edit ? 'ویرایش حساب' : 'حساب جدید',
    body: `${accountFields(s.d)}${
      edit
        ? '<p class="note">برای تغییر موجودی از «تطبیق موجودی با بانک» استفاده کن تا تاریخچه حفظ شود.</p>'
        : amt('موجودی فعلی (تومان)', 'd.bal')
    }`,
    foot: `<button class="btn" data-a="sheetclose">بستن</button><button class="btn primary" data-a="saveaccount">ذخیره</button>`
  }
}
ACT.saveaccount = () => {
  const b = curB()
  const d = UI.sheet.d
  if (!String(d.name || '').trim()) return toast('نام حساب را وارد کنید'), false
  const card = d.type === 'cash' ? '' : d.card
  if (UI.sheet.p.unitId)
    Object.assign(accById(b, UI.sheet.p.unitId), { name: d.name.trim(), type: d.type, card })
  else {
    b.accounts.push({
      id: uid('a'),
      name: d.name.trim(),
      type: d.type,
      card,
      balance: Number(d.bal) || 0
    })
    logAct(b, 'حساب جدید: ' + d.name.trim())
  }
  UI.sheet = null
  toast('حساب ذخیره شد')
}
const origSheetAcc = ACT.sheet
ACT.sheet = (d, el) => {
  const b = curB()
  if (d.n === 'accountForm') {
    const a = d.u ? accById(b, d.u) : null
    openSheet(
      'accountForm',
      a
        ? { name: a.name, type: a.type || (a.card ? 'bank' : 'cash'), card: a.card, bal: 0 }
        : { name: '', type: 'bank', card: '', bal: 0 },
      { unitId: d.u }
    )
    return false
  }
  if (d.n === 'payPick') {
    const rows = b.units.filter(u => u.active).map(u => ({ u, open: unitBalance(b, u.id).open }))
    rows.sort((x, y) => y.open - x.open)
    openSheet('payPick', { unit: rows.length ? rows[0].u.id : '' })
    return false
  }
  return origSheetAcc(d, el)
}

/* ---------- dashboard speed dial: record an expense or a charge payment ---------- */
SHEETS.payPick = (s, b) => {
  const opts = b.units
    .filter(u => u.active)
    .map(u => ({ u, open: unitBalance(b, u.id).open, d: chargeDebtor(b, u) }))
    .sort((x, y) => y.open - x.open || x.u.no - y.u.no)
    .map(x => ({
      value: x.u.id,
      label:
        'واحد ' +
        fa(x.u.no) +
        ' · ' +
        (x.d ? x.d.person.name : '—') +
        (x.open > 0 ? ' · بدهی ' + money(x.open) : ' · بدون بدهی')
    }))
  const debtors = b.units.filter(u => unitBalance(b, u.id).open > 0).length
  return {
    title: 'ثبت واریزی شارژ',
    body: `<p class="sub">واحدی را که پرداخت کرده انتخاب کن؛ بدهکارها اول آمده‌اند (${fa(
      debtors
    )} واحد بدهکار). در قدم بعد مبلغ و حساب را می‌زنی.</p>${sel('واحد', 'd.unit', opts, {
      id: 'pp',
      ph: 'انتخاب واحد'
    })}`,
    foot: `<button class="btn" data-a="sheetclose">بستن</button><button class="btn primary" data-a="paypickgo" ${
      s.d.unit ? '' : 'disabled'
    }>ادامه: مبلغ و حساب</button>`
  }
}
ACT.paypickgo = () => {
  const u = UI.sheet.d.unit
  if (!u) return false
  UI.sheet = null
  ACT.payopen({ u })
  return false
}
const origDashFab = BPAGES.dashboard
BPAGES.dashboard = (R, b) => {
  const p = origDashFab(R, b)
  if (b.units.length)
    p.fab = [
      { a: 'sheet', data: 'data-n="expenseForm"', label: 'ثبت هزینه' },
      { a: 'sheet', data: 'data-n="payPick"', label: 'ثبت واریزی شارژ' }
    ]
  return p
}
