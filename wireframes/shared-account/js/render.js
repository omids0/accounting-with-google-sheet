/* eslint-disable -- prototype scripts share globals, not part of the app source */
function offSheet() {
  return sheetWrap(
    'خاموش کردن حساب مشترک',
    '<p>یکی را انتخاب کنید. حساب شخصی شما در هر دو حالت دست‌نخورده می‌ماند.</p>' +
      '<div class="card"><h3>فقط از منوی من پنهان شود</h3><p>فایل و دسترسی شریک می‌ماند. هر وقت خواستید دوباره روشنش می‌کنید.</p><button class="btn ghost block" data-act="off" data-v="hide">پنهان کن</button></div>' +
      '<div class="card"><h3>دسترسی همه قطع شود</h3><p>اشتراک درایو برداشته می‌شود. فایل در درایو شما می‌ماند و خودتان آن را پاک می‌کنید.</p><button class="btn danger block" data-act="off" data-v="revoke">قطع دسترسی‌ها و خاموش کن</button></div>'
  )
}

/* ---------- render ---------- */
function render() {
  var sc = $('screen'),
    top = sc.scrollTop,
    fam = S.screen === 'family'
  var body =
    S.screen === 'spaces'
      ? spaces()
      : S.screen === 'wizard'
      ? wizard()
      : S.screen === 'entry'
      ? entry()
      : S.screen === 'personal'
      ? personal()
      : { home: home, tx: txs, settle: settle, members: members }[S.tab]()
  sc.innerHTML = body
  sc.scrollTop = top
  var tabs = $('tabs')
  tabs.hidden = !fam
  if (fam) {
    tabs.innerHTML = [
      ['home', 'خانه', 'home'],
      ['tx', 'ثبت‌ها', 'list'],
      ['settle', 'تسویه', 'scale'],
      ['members', 'اعضا', 'users']
    ]
      .map(function (t) {
        return (
          '<button data-act="tab" data-v="' +
          t[0] +
          '"' +
          (S.tab === t[0] ? ' aria-current="page"' : '') +
          '>' +
          ic(t[2], 22) +
          t[1] +
          '</button>'
        )
      })
      .join('')
  }
  var fab = $('fab')
  fab.hidden = !(fam && (S.tab === 'home' || S.tab === 'tx') && can('record'))
  fab.innerHTML = ic('plus', 26)
  var host = $('sheetHost'),
    st = host.querySelector('.sh-b'),
    stTop = st ? st.scrollTop : 0,
    had = !!st
  host.innerHTML = sheetHTML()
  var nb = host.querySelector('.sh-b')
  if (nb && had) nb.scrollTop = stTop
  $('toastHost').innerHTML = S.toast ? '<div class="toast">' + S.toast + '</div>' : ''
  rail()
}

function rail() {
  $('asList').innerHTML = S.members
    .map(function (m) {
      return (
        '<button class="rbtn" data-act="as" data-id="' +
        m.id +
        '" aria-pressed="' +
        (S.as === m.id) +
        '"><span class="av sm ' +
        m.id +
        '">' +
        m.name[0] +
        '</span>' +
        m.name +
        '<small>' +
        ROLE[m.role] +
        '</small></button>'
      )
    })
    .join('')
  var J = [
    ['spaces', 'فضاها و فعال‌سازی اختیاری'],
    ['wizard', 'راه‌اندازی در سه قدم'],
    ['home', 'خانه و تراز'],
    ['tx', 'ثبت‌ها'],
    ['settle', 'تسویه'],
    ['members', 'اعضا و دسترسی'],
    ['entry', 'ثبت شخصی با گزینهٔ اشتراک'],
    ['personal', 'ویرایش ثبت شخصی و اعلان تغییر']
  ]
  $('jumps').innerHTML = J.map(function (j, i) {
    var on = (S.screen === 'family' ? S.tab : S.screen) === j[0]
    return (
      '<button class="rbtn' +
      (on ? ' on' : '') +
      '" data-act="jump" data-v="' +
      j[0] +
      '"><span class="step-n">' +
      (i + 1).toLocaleString('fa-IR') +
      '</span>' +
      j[1] +
      '</button>'
    )
  }).join('')
}

function toast(msg) {
  S.toast = msg
  clearTimeout(S.tid)
  S.tid = setTimeout(function () {
    S.toast = ''
    $('toastHost').innerHTML = ''
  }, 2600)
}
