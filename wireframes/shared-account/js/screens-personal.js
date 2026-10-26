/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* The personal side: the entry form and the edit sheet with the «حساب مشترک» switch (SharedTick),
   and the personal records list with its «در حساب مشترک» / «در انتظار ارسال» badges. */
function sharedCatFor(e) {
  var list = e.type === 'income' ? INC_CATS : EXP_CATS
  return e.sharedCat || (list.indexOf(e.cat) >= 0 ? e.cat : 'سایر')
}
function tickBlock(e) {
  var editing = e.mode === 'edit'
  if (space() !== 'on') return ''
  if (!S.grant) {
    return field(
      'حساب مشترک',
      `<p class="note">این دستگاه هنوز به فایل حساب مشترک وصل نیست؛ ثبت شخصی شما عادی ذخیره می‌شود.</p>${btn(
        `اتصال این دستگاه به «${ACCOUNT}»`,
        'connectRow',
        'sec block'
      )}`
    )
  }
  if (!can('record')) return ''
  var label = `در «${ACCOUNT}» هم ثبت شود`
  var h = field(
    'حساب مشترک',
    `<div class="row"><span class="grow note">${label}</span>${sw('tick', e.on, label)}</div>`
  )
  if (e.on) {
    var cats = e.type === 'income' ? INC_CATS : EXP_CATS
    h += field(
      'دسته در حساب مشترک',
      select('t-cat', cats, sharedCatFor(e), 'aria-label="دسته در حساب مشترک"')
    )
  }
  if (e.on && e.type === 'expense') {
    var p = pair(),
      other = otherOf(me())
    h += field(
      'چه کسی پرداخت کرد؟',
      select(
        't-payer',
        p.map(function (x) {
          return [x, nameOut(x)]
        }),
        e.payer || me()
      )
    )
    h += field(
      'برای چه کسی است؟',
      seg(
        'tSplit',
        [
          ['equal', 'نصف‌نصف'],
          ['only:' + me(), 'فقط من'],
          ['only:' + other, 'فقط ' + local(other)]
        ],
        e.split,
        'برای چه کسی است؟'
      )
    )
    h += alertBox(`<span id="t-prev">${preview(e.amount, e.split, e.payer, nameOut)}</span>`)
  }
  if (e.on && e.type === 'income') {
    h += alertBox(
      'مبلغ را شریک هم می‌بیند؛ درآمد روی تراز اثری ندارد و فقط در گزارش‌های حساب مشترک می‌آید.'
    )
  }
  if (editing && e.linked !== e.on) {
    h += e.linked
      ? alertBox('با ذخیره، نسخهٔ حساب مشترک حذف می‌شود', 'warn')
      : alertBox(`با ذخیره، یک نسخه در «${ACCOUNT}» ساخته می‌شود`)
  }
  var notice =
    editing &&
    e.linked &&
    myNotices().filter(function (n) {
      return n.ref === e.id
    })[0]
  if (notice) {
    var words =
      notice.kind === 'delete'
        ? 'شریک نسخهٔ این ثبت را از حساب مشترک حذف کرده؛ با ذخیره، این ثبت دیگر به حساب مشترک وصل نیست'
        : 'شریک این ثبت را در حساب مشترک تغییر داده؛ ذخیره، تغییر او را جایگزین می‌کند'
    h += alertBox(
      words + ' ',
      'warn',
      btn('دیدن تغییر', 'notice', 'sec sm', `data-v="${notice.id}" data-form="1"`)
    )
  }
  if (e.failed) {
    h += alertBox(
      'نسخهٔ حساب مشترک این ثبت فرستاده نشد: دسترسی ندارید ',
      'bad',
      btn('لغو ارسال', 'cancelSend', 'sec sm')
    )
  }
  return h
}
function entryFields(e) {
  return `${moneyField('e-amount', 'مبلغ (تومان)', e.amount, true)}
    ${field(
      'عنوان',
      input(
        'e-title',
        e.title,
        `placeholder="${e.type === 'income' ? 'مثلاً حقوق' : 'مثلاً میوه و سبزی'}"`
      ),
      { id: 'e-title' }
    )}
    ${field('دسته', select('e-cat', PERSONAL_CATS, e.cat), { id: 'e-cat', req: true })}`
}
function entry() {
  var e = S.ent
  var save = btn('ذخیره', 'entrySave', e.type === 'income' ? 'inc block' : 'exp block')
  return `${header('ثبت جدید', { back: 'plist' })}<div class="page"><div class="card">
    ${seg(
      'eType',
      [
        ['expense', 'هزینه'],
        ['income', 'درآمد']
      ],
      e.type,
      'نوع ثبت'
    )}
    ${entryFields(e)}
    ${field('تاریخ', input('e-date', '۴ آبان ۱۴۰۵'))}
    ${field('توضیحات', input('e-note', '', 'placeholder="توضیحات اضافه..."'), {
      hint: 'یادداشت، پیوست و ریز اقلام هیچ‌وقت به حساب مشترک نمی‌رود.'
    })}
    ${tickBlock(
      e
    )}<hr style="border:0;border-top:1px solid var(--border);width:100%" />${save}${btn(
    'انصراف',
    'plist',
    'sec block'
  )}</div></div>`
}
/* «ویرایش هزینه» opens as a sheet over the personal list, like the app's edit form. */
function editSheet() {
  var e = S.ent
  return sheet(
    e.type === 'income' ? 'ویرایش درآمد' : 'ویرایش هزینه',
    entryFields(e) + tickBlock(e),
    btn('ذخیرهٔ تغییرات', 'editSave', e.type === 'income' ? 'inc' : 'exp') +
      btn('انصراف', 'close', 'sec')
  )
}
function plist() {
  var rows = S.pers
    .map(function (r) {
      var badge =
        r.link === 'none'
          ? ''
          : `<span class="tag">${r.link === 'pending' ? 'در انتظار ارسال' : 'در حساب مشترک'}</span>`
      return `<div class="prow"><span class="grow"><span class="row" style="gap:6px;flex-wrap:wrap"><b>${
        r.title
      }</b>${space() === 'on' ? badge : ''}</span><span class="meta">${r.date} · ${r.cat}</span></span><span class="amt exp" style="align-self:center">-${money(r.amount)} تومان</span>
        <span class="acts"><button type="button" data-act="pedit" data-v="${
          r.id
        }" aria-label="ویرایش ${r.title}">${ic('pencil', 18)}</button><button type="button" data-act="pdel" data-v="${r.id}" aria-label="حذف ${r.title}">${ic('trash', 18)}</button></span></div>`
    })
    .join('')
  var notices = space() === 'on' ? noticeCards(nameOut) : ''
  return `${header('رکوردها', { back: 'hub' })}<div class="page">${notices}
    <div class="card"><h3>تراکنش‌ها</h3>${seg(
      'noop',
      [
        ['all', 'همه'],
        ['income', 'درآمد'],
        ['expense', 'هزینه']
      ],
      'expense',
      'نوع'
    )}</div>
    <div class="card" style="gap:0"><p class="meta">${fa(S.pers.length)} مورد</p>${
    rows || '<p class="meta">ثبتی نیست</p>'
  }</div></div>`
}
