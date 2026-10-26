/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Rendering, the rail (who is looking, theme, jump list) and the event wiring. */
var SCREENS = {
  hub: hub,
  wizard: wizard,
  home: home,
  records: records,
  settle: settlePage,
  members: members,
  entry: entry,
  plist: plist
}
var SHARED_SCREENS = ['home', 'records', 'settle', 'members']
var AS = [
  ['owner', 'نیما', 'مالک'],
  ['partner', 'مینا', 'شریک'],
  ['viewer', 'سارا', 'ناظر']
]
function isSharedScreen() {
  return SHARED_SCREENS.indexOf(S.screen) >= 0
}
var lastSheet = ''
function render() {
  document.documentElement.dataset.theme = S.theme
  var scr = $('screen'),
    top = scr.scrollTop,
    was = scr.dataset.screen
  scr.innerHTML = SCREENS[S.screen]()
  scr.dataset.screen = S.screen
  scr.scrollTop = was === S.screen ? top : 0
  var shared = isSharedScreen()
  $('nav').className = shared ? 'nav' : 'nav personal'
  $('nav').innerHTML = shared ? sharedNav(S.screen) : personalNav()
  var fab = ''
  if ((S.screen === 'home' || S.screen === 'records') && can('record')) fab = 'add'
  if (S.screen === 'plist') fab = 'newEntry'
  $('fabHost').innerHTML = fab
    ? `<button type="button" class="fab" data-act="${fab}" aria-label="${
        fab === 'add' ? 'ثبت در حساب مشترک' : 'ثبت جدید'
      }">${ic('plus', 24)}</button>`
    : ''
  var host = $('sheetHost'),
    body = host.querySelector('.sh-b'),
    keep = body ? body.scrollTop : 0
  var key = JSON.stringify([S.sheet, S.sheet2])
  host.innerHTML = sheetHTML(S.sheet) + sheetHTML(S.sheet2)
  // A re-render of the same sheet must not replay its opening motion (no jump).
  if (key === lastSheet) {
    host.querySelectorAll('.sheet').forEach(function (el) {
      el.classList.add('still')
    })
    if (host.querySelector('.sh-b')) host.querySelector('.sh-b').scrollTop = keep
  } else if (S.sheet2 && host.querySelectorAll('.sheet')[0])
    host.querySelectorAll('.sheet')[0].classList.add('still')
  lastSheet = key
  $('toastHost').innerHTML = S.toast
    ? `<div class="toast" role="status"><span>${S.toast.text}</span>${
        S.toast.action
          ? `<button type="button" data-act="${S.toast.action}">بازگردانی</button>`
          : ''
      }</div>`
    : ''
  $('busyHost').innerHTML = busyBox()
  rail()
}

function rail() {
  $('asList').innerHTML = AS.map(function (a) {
    return `<button type="button" class="rbtn" data-act="as" data-v="${
      a[0]
    }" aria-pressed="${S.as === a[0]}">${a[1]}<small>${a[2]}</small></button>`
  }).join('')
  $('themeList').innerHTML = [
    ['light', 'روشن'],
    ['dark', 'تیره']
  ]
    .map(function (t) {
      return `<button type="button" class="rbtn" data-act="theme" data-v="${
        t[0]
      }" aria-pressed="${S.theme === t[0]}">${t[1]}</button>`
    })
    .join('')
  if ($('jumps').childElementCount) return
  $('jumps').innerHTML = JUMPS.map(function (g, gi) {
    var items = g[1]
      .map(function (j, ji) {
        return `<button type="button" class="rbtn" data-act="jump" data-v="${gi}.${ji}">${j[0]}</button>`
      })
      .join('')
    return `<details ${
      gi === 0 ? 'open' : ''
    }><summary>${g[0]}</summary><div class="group">${items}</div></details>`
  }).join('')
}
Object.assign(A, {
  as: function (el) {
    S.as = el.dataset.v
    S.sheet = null
    S.sheet2 = null
    S.expanded = ''
  },
  theme: function (el) {
    S.theme = el.dataset.v
  },
  jump: function (el) {
    var at = el.dataset.v.split('.')
    jumpTo(JUMPS[at[0]][1][at[1]][1])
  }
})

/* Live inputs: typing never re-renders (focus stays); money fields reformat and update words. */
var MONEY = {
  'e-amount': function (v) {
    S.ent.amount = v
    if ($('t-prev')) $('t-prev').textContent = preview(v, S.ent.split, S.ent.payer, nameOut)
  },
  'a-amount': function (v) {
    S.add.amount = v
    if ($('a-prev')) $('a-prev').textContent = preview(v, S.add.split, S.add.payer, nameIn)
  },
  's-amount': function (v) {
    S.settleDraft.amount = v
  },
  'r-amount': function (v) {
    var r = rec(S.sheet.id)
    $('r-save').disabled = !v || v === r.amount
  }
}
var TEXT = {
  'w-name': ['wiz', 'name'],
  'w-email': ['wiz', 'email'],
  'e-title': ['ent', 'title'],
  'a-title': ['add', 'title'],
  'i-email': ['inv', 'email']
}
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]')
  if (!el || el.tagName === 'SELECT' || el.disabled) return
  var act = A[el.dataset.act]
  if (!act) return
  act(el)
  render()
})
document.addEventListener('change', function (ev) {
  var el = ev.target,
    fn = ON_CHANGE[el.dataset.act] || ON_CHANGE[el.id]
  if (fn) {
    fn(el)
    render()
  } else if (el.id === 's-amount') render()
})
document.addEventListener('input', function (ev) {
  var el = ev.target
  if (MONEY[el.id]) {
    var v = digits(el.value)
    el.value = v ? money(v) : ''
    if ($(el.id + '-w')) $(el.id + '-w').textContent = v ? words(v) : '—'
    MONEY[el.id](v)
  } else if (TEXT[el.id]) {
    S[TEXT[el.id][0]][TEXT[el.id][1]] = el.value
  }
})
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && (S.sheet || S.sheet2)) {
    A.close()
    render()
  }
})

if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) S.theme = 'dark'
render()
