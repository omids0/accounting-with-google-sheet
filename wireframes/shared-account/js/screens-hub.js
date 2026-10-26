/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* «فضاهای من» (the retitled building hub, «بیشتر › فضاهای من») and the setup wizard. */
function space() {
  return S.space[S.as]
}
function buildingCard() {
  return `<div class="card"><div><h3>ساختمان برج آبی</h3><p class="meta">۸ واحد · شما + ۲ عضو</p><p class="meta">فایل: حسابداری · ساختمان برج آبی</p></div>
    <div class="tile">بدهکار ۲ واحد<br /><b>۴,۸۰۰,۰۰۰ تومان</b></div>
    <div class="tile warn">شارژ آبان صادر نشده<br /><b>روز ۴</b></div>
    <div class="tile">صندوق ۲ حساب<br /><b>۱۲,۵۰۰,۰۰۰ تومان</b></div>
    ${btn('ورود', 'noop', 'block')}</div>
    ${btn('+ ساختمان جدید', 'noop', 'sec block')}${btn('اتصال به شیت موجود', 'noop', 'sec block')}`
}
function sharedCard() {
  if (space() !== 'on') {
    var actions =
      space() === 'hidden'
        ? btn('روشن کردن دوباره', 'showAgain', 'block')
        : btn('راه‌اندازی', 'wizStart', 'block') +
          btn('اتصال به حساب مشترک', 'connectSheet', 'sec block')
    return `<div class="card dashed"><div><h3>حساب مشترک</h3><p class="meta">هزینه‌های مشترک شما و شریک‌تان در یک فایل جدا</p></div>
      <ul class="pts"><li>حساب شخصی شما همان‌طور که هست می‌ماند.</li><li>شریک‌تان فقط فایل حساب مشترک را می‌بیند.</li><li>هر لحظه می‌توانید خاموشش کنید.</li></ul>${actions}</div>
      <p class="meta">این قابلیت اختیاری است. تا روشنش نکنید، در شیت و منوی شما هیچ چیز اضافه نمی‌شود.</p>`
  }
  var avs = S.members
    .map(function (m) {
      return avatar(m.email)
    })
    .join('')
  return `<div class="card"><div class="row"><div class="grow"><h3>${ACCOUNT}</h3><p class="meta">نقش شما: ${
    ROLE[myRole()]
  }</p></div><div class="row" role="group" aria-label="اعضا" style="gap:4px">${avs}</div></div>
    ${btn('باز کردن', 'open', 'block')}${
    myRole() === 'owner' ? btn('خاموش کردن قابلیت', 'offSheet', 'sec block') : ''
  }</div>`
}
function hub() {
  var notices = space() === 'on' ? noticeCards(nameOut) : ''
  return `${header('فضاهای من')}<div class="page">${notices}${buildingCard()}${sharedCard()}</div>`
}

var WIZ_STEPS = ['مشترک و خصوصی', 'شریک', 'تقسیم']
function stepper(step, back) {
  var bars = [1, 2, 3]
    .map(function (i) {
      return `<i class="${i < step ? 'done' : i === step ? 'now' : ''}"></i>`
    })
    .join('')
  return `<div class="stepper"><div class="row"><b class="grow">قدم ${fa(
    step
  )} از ۳</b><span class="tag">${
    WIZ_STEPS[step - 1]
  }</span><span class="grow" style="text-align:end">${
    back ? '<button type="button" class="link" data-act="wizBack">قبلی</button>' : ''
  }</span></div><div class="bars">${bars}</div></div>`
}
function wizIntro() {
  return `<h3>چه چیزی مشترک می‌شود؟</h3><div class="two">
    <div class="card"><b>مشترک</b><ul class="pts"><li>هزینه و درآمد خانه</li><li>دسته‌ها و بودجهٔ خانه</li><li>تسویه بین شما</li></ul></div>
    <div class="card"><b>خصوصی می‌ماند</b><ul class="pts"><li>حساب شخصی شما</li><li>کیف پول، چک و مطالبات شخصی</li><li>پیامک‌های بانکی شما</li></ul></div></div>
    ${alertBox(
      'یک شیت تازه در درایو خودتان ساخته می‌شود و فقط با ایمیلی که وارد می‌کنید به اشتراک می‌رسد.'
    )}`
}
function wizInvite() {
  var w = S.wiz
  return `<h3>شریک‌تان را دعوت کنید</h3>
    ${field('نام حساب مشترک', input('w-name', w.name, 'placeholder="مثلاً خانهٔ ما"'), {
      id: 'w-name',
      req: true
    })}
    ${field(
      'ایمیل حساب گوگل شریک',
      input('w-email', w.email, 'dir="ltr" inputmode="email" placeholder="name@gmail.com"'),
      { id: 'w-email', req: true }
    )}
    ${field(
      'نقش',
      seg(
        'wizRole',
        [
          ['partner', 'شریک'],
          ['viewer', 'ناظر']
        ],
        w.role,
        'نقش'
      ),
      { hint: ROLE_HINT[w.role] }
    )}
    ${alertBox('گوگل برای شریک‌تان ایمیل دعوت می‌فرستد. باید یک حساب گوگل باشد.')}`
}
function wizSplit() {
  return `<h3>قاعدهٔ پیش‌فرض تقسیم</h3><div class="row"><b class="grow">تقسیم هر هزینه</b><span class="tag">نصف‌نصف</span></div>
    <p class="note">هر هزینه را هنگام ثبت می‌توانید عوض کنید. این فقط مقدار پیش‌فرض است.</p>
    ${alertBox('هیچ ثبتی خودکار به حساب مشترک نمی‌رود، حتی پیامک بانکی.')}`
}
function wizard() {
  var w = S.wiz,
    body
  if (w.taken) {
    body = `${alertBox(
      'شما از قبل یک حساب مشترک دارید؛ اگر خاموشش کرده‌اید، از «فضاهای من» دوباره روشنش کنید'
    )}${btn('بازگشت به «فضاهای من»', 'hub', 'sec block')}`
  } else {
    var main = w.step === 3 ? (w.kept ? 'باز کردن «اعضا»' : 'ساخت فضا و ارسال دعوت') : 'ادامه'
    body = `<h3>راه‌اندازی حساب مشترک</h3>${stepper(w.step, w.step > 1 && !w.kept)}
      ${[wizIntro, wizInvite, wizSplit][w.step - 1]()}
      ${w.err ? `<p class="err" role="alert">${w.err}</p>` : ''}
      ${btn(main, w.step === 3 ? (w.kept ? 'wizMembers' : 'wizCreate') : 'wizNext', 'block')}
      ${w.step === 1 ? btn('انصراف', 'hub', 'sec block') : ''}`
  }
  return `${header('فضاهای من')}<div class="page"><div class="card">${body}</div></div>`
}
/* The creeping busy overlay of the create step (useCreepingBusy). */
function busyBox() {
  if (!S.busy) return ''
  return `<div class="busy" role="alertdialog" aria-label="${S.busy.text}"><div class="box"><span class="spin"></span><b>${S.busy.text}</b><div class="bar" style="width:100%"><i style="width:${S.busy.pct}%;background:var(--primary)"></i></div><p class="hint">ممکن است چند ثانیه طول بکشد.</p></div></div>`
}
