/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Member sheets: «دعوت عضو» (InviteMembersSheet, kind shared), «قطع دسترسی», «ترک این فضا»,
   the owner's «خاموش کردن حساب مشترک» and «اتصال به حساب مشترک» (ConnectBuildingSheet). */
function withWarning(warning, text) {
  return warning ? `${warning}\n\n${text}` : text
}
/* Partner while the one partner seat is free, else viewer; the owner is never offered. */
function invitable() {
  var taken = S.members.some(function (m) {
    return m.role === 'partner'
  })
  return (taken ? [] : [['partner', 'شریک']]).concat([['viewer', 'ناظر']])
}
function inviteSheet() {
  var inv = S.inv,
    opts = invitable()
  var role = opts.some(function (o) {
    return o[0] === inv.role
  })
    ? inv.role
    : opts[0][0]
  inv.role = role
  var list = S.members
    .map(function (m) {
      var st = m.email === me() ? 'شما' : STATUS[m.st]
      return `<div class="tx" style="min-height:0"><span class="grow"><b class="ltr">${
        m.email
      }</b><br /><span class="meta">${ROLE[m.role]} · ${st}</span></span></div>`
    })
    .join('')
  var body = `${field(
    'ایمیل گوگل',
    input(
      'i-email',
      inv.email,
      'type="email" dir="ltr" placeholder="sara@gmail.com" autocomplete="off"'
    ),
    { id: 'i-email' }
  )}
    ${field('نقش', select('i-role', opts, role, 'data-act="invRole"'), {
      id: 'i-role',
      hint: ROLE_HINT[role]
    })}
    ${inv.err ? `<p class="err" role="alert">${inv.err}</p>` : ''}
    ${btn(
      '+ افزودن',
      'invAdd',
      'sec sm'
    )}<div style="display:flex;flex-direction:column;gap:6px">${list}</div>
    ${btn('کپی متن دعوت', 'copyInvite', 'sec sm')}
    <p class="meta">با «+ افزودن» گوگل برای او ایمیل دعوت می‌فرستد و فایل حساب مشترک با نقش انتخابی‌اش به اشتراک گذاشته می‌شود. اگر ارسال نشد، فایل را خودت در گوگل‌درایو به اشتراک بگذار و «کپی متن دعوت» را برایش بفرست.</p>`
  return sheet('دعوت عضو', body, btn('تمام', 'close') + btn('بستن', 'close', 'sec'))
}
function removeSheet(email) {
  var warn = member(email).role === 'partner' ? balanceWarning() : ''
  var text = `دسترسی ${email} قطع شود؟ او دیگر به حساب مشترک دسترسی ندارد و اشتراک فایل او در گوگل‌درایو هم برداشته می‌شود. ثبت‌هایی که نوشته برای بقیه می‌ماند.`
  return confirmSheet(
    'قطع دسترسی',
    withWarning(warn, text),
    'قطع دسترسی',
    'removeDo',
    'انصراف',
    'close',
    'danger'
  )
}
function leaveSheet() {
  var text =
    'دسترسی شما به فایل حساب مشترک در درایو برداشته می‌شود. حساب شخصی شما دست‌نخورده می‌ماند و ثبت‌های شما برای بقیه می‌ماند.'
  return sheet(
    'ترک این فضا',
    `<p class="msg">${withWarning(balanceWarning(), text)}</p>`,
    btn('ترک فضا', 'leaveDo') + btn('انصراف', 'close', 'sec')
  )
}
function offSheet() {
  var choice = S.offChoice
  var opt = function (v, title, text) {
    return `<button type="button" class="choice" role="radio" aria-checked="${
      choice === v
    }" data-act="offPick" data-v="${v}"><input type="radio" tabindex="-1" ${
      choice === v ? 'checked' : ''
    } /><span><b>${title}</b><br /><span class="meta">${text}</span></span></button>`
  }
  var body = `<p class="msg">${withWarning(
    balanceWarning(nameOut),
    'یکی را انتخاب کنید. حساب شخصی شما در هر دو حالت دست‌نخورده می‌ماند.'
  )}</p>
    <div role="radiogroup" aria-label="روش خاموش کردن" style="display:flex;flex-direction:column;gap:8px">
    ${opt(
      'hide',
      'فقط از منوی من پنهان شود',
      'فایل و دسترسی شریک می‌ماند. هر وقت خواستید دوباره روشنش می‌کنید.'
    )}
    ${opt(
      'revoke',
      'دسترسی همه قطع شود',
      'اشتراک درایو برداشته می‌شود. فایل در درایو شما می‌ماند و خودتان آن را پاک می‌کنید.'
    )}</div>`
  var ok = choice === 'hide' ? 'پنهان کن' : 'قطع دسترسی‌ها و خاموش کن'
  return sheet('خاموش کردن حساب مشترک', body, btn(ok, 'offDo') + btn('انصراف', 'close', 'sec'))
}
function connectSheet() {
  var body = `<p class="note">اگر شریک‌تان حساب مشترک را با ایمیل شما به اشتراک گذاشته، از فهرست انتخابش کنید، لینکش را بچسبانید یا با گوگل بازش کنید.</p>
    <button type="button" class="tx" data-act="connectDo" style="min-height:56px"><b>مشترک ${ACCOUNT}</b></button>
    ${field(
      'لینک شیت',
      input('c-link', '', 'dir="ltr" placeholder="https://docs.google.com/spreadsheets/d/…"'),
      { hint: 'لینک گوگل‌شیت یا شناسهٔ آن را بچسبانید.' }
    )}
    ${btn('باز کردن شیت با گوگل', 'connectDo', 'sec sm')}`
  return sheet(
    'اتصال به حساب مشترک',
    body,
    btn('اتصال', 'connectDo') + btn('انصراف', 'close', 'sec')
  )
}
