/* eslint-disable -- prototype scripts share globals, not part of the app source */
ACT.savecheck = () => {
  const d = UI.sheet.d
  if (!d.payee || !(Number(d.amount) > 0)) return toast('در وجه و مبلغ را وارد کنید'), false
  curB().checks.push({
    id: uid('c'),
    payee: d.payee,
    amount: Number(d.amount),
    due: d.due,
    status: 'pending',
    acc: d.acc,
    note: d.note
  })
  UI.sheet = null
  toast('چک ثبت شد')
}
SHEETS.settleDang = (s, b) => {
  const d = b.dang.find(x => x.id === s.p.unitId)
  if (!s.d.init) {
    s.d.init = 1
    s.d.dangId = d.id
    s.d.acc = b.accounts[0].id
    s.d.pacc = S.pb.accounts[0].id
    s.d.bridged = d.bridged
  }
  return {
    title: 'تسویه از صندوق',
    body: `<div class="card" style="margin-bottom:10px"><b>${esc(
      d.title
    )}</b><span class="sub">${esc(d.cp)} · ${money(d.amount)}</span></div>${sel(
      'از حساب صندوق',
      'd.acc',
      accOptions(b),
      { id: 'sacc' }
    )}
    ${
      d.bridged
        ? sel(
            'دریافت در حساب شخصی',
            'd.pacc',
            S.pb.accounts.map(a => ({ value: a.id, label: a.name })),
            { id: 'spacc', up: true, hint: 'طلب شخصی شما هم با همین مبلغ دریافت می‌شود' }
          )
        : ''
    }
    <p class="note">در ساختمان یک «انتقال» ثبت می‌شود (نه هزینهٔ دوم) و بدهی بسته می‌شود.</p>`,
    foot: `${closeBtn}<button class="btn primary" data-a="dosettle">تسویه</button>`
  }
}
SHEETS.lists = (s, b) => {
  const tab = s.d.tab || 'kinds'
  const L = tab === 'kinds' ? 'expenseKinds' : 'payers'
  return {
    title: 'مدیریت فهرست‌ها',
    full: true,
    body: `<div class="seg" style="margin-bottom:10px"><button class="${
      tab === 'kinds' ? 'on' : ''
    }" data-a="listtab" data-t="kinds">نوع هزینه</button><button class="${
      tab === 'payers' ? 'on' : ''
    }" data-a="listtab" data-t="payers">پرداخت‌کننده</button></div>
    <p class="note">نام را اینجا عوض کن یا مورد را مخفی کن (مورد استفاده‌شده هرگز حذف نمی‌شود). هر نوع هزینه مشخص می‌کند سهم واحدها به مالک برسد یا ساکن.</p>
    ${b.lists[L].map(
      (it, i) =>
        `<div class="card" style="margin-bottom:8px;${it.hidden ? 'opacity:.55' : ''}">${txt(
          '',
          'b.lists.' + L + '.' + i + '.label'
        )}${
          tab === 'kinds'
            ? sel('سهم واحدها به', 'b.lists.expenseKinds.' + i + '.chargeTo', CHARGE_TO, {
                id: 'ct' + i
              })
            : ''
        }${tog('مخفی', 'b.lists.' + L + '.' + i + '.hidden')}</div>`
    ).join('')}
    <div class="card">${txt('افزودن مورد جدید', 'd.newName', {
      ph: tab === 'kinds' ? 'مثلاً اضطراری' : 'مثلاً عضو هیئت مدیره'
    })}${
      tab === 'kinds' ? sel('سهم واحدها به', 'd.newTo', CHARGE_TO, { id: 'nt', up: true }) : ''
    }<button class="btn block" data-a="addlist" data-l="${L}">+ افزودن</button></div>`,
    foot: closeBtn
  }
}
ACT.listtab = d => {
  UI.sheet.d.tab = d.t
}
SHEETS.removeB = (s, b) => ({
  title: 'حذف اتصال',
  body: `<div class="guide"><b>اتصال «${esc(
    b.name
  )}» از این اپ برداشته شود؟</b>شیت در درایو می‌ماند و بعداً می‌توانی دوباره وصلش کنی. چیزی از حساب شخصی تغییر نمی‌کند.</div>`,
  foot: `${closeBtn}<button class="btn danger" data-a="removeb">حذف اتصال</button>`
})
