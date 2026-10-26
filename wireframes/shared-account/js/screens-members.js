/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* «اعضا»: own role card, the building's MemberCard with the shared registry (expands inline),
   «+ دعوت», the data-safety card with the weekly backup switch and «ترک این فضا». */
var OWNER_LOCKED = 'مالک فایل است. نقش و دسترسی مالک تغییر نمی‌کند.'
var MEMBERS_INTRO =
  'مالک نقش هر عضو را تعیین می‌کند و در صورت نیاز دسترسی‌های او را کم یا زیاد می‌کند. با تغییر نقش، دسترسی‌های تغییر داده‌شده به حالت معمول آن نقش برمی‌گردد. حساب مشترک یک شریک دارد و هر تعداد ناظر.'
var MEMBERS_INTRO_RO = 'اعضا و نقش‌هایشان را اینجا می‌بینید؛ فقط مالک می‌تواند آن‌ها را عوض کند.'
var HONEST =
  'دسترسی واقعی همان اشتراک گوگل‌درایو است؛ برنامه فقط صفحه‌ها و دکمه‌ها را محدود می‌کند و هر کس در درایو «ویرایش» داشته باشد می‌تواند فایل را مستقیم تغییر بدهد.'
var RAISED =
  'چون کار نوشتن به این عضو داده شده، دسترسی او در گوگل‌درایو هم به «ویرایش» بالا می‌رود.'

function viewerCanWrite(m) {
  return m.role === 'viewer' && driveWriter(m)
}
function memberCard(m) {
  var isMe = m.email === me(),
    fixedOwner = m.role === 'owner',
    readOnly = !can('members')
  var changeable = !isMe && !readOnly && !fixedOwner,
    locked = isMe || readOnly || fixedOwner,
    open = S.expanded === m.email
  var meta = `${ROLE[m.role]}${custom(m) ? ' · دسترسی تغییر داده‌شده' : ''} · ${
    STATUS[m.st]
  } · ${driveLine(m)}`
  var head = `<div class="row" style="align-items:flex-start">${avatar(
    m.email
  )}<span class="grow"><b class="ltr">${m.email}</b>${
    isMe ? ' <span class="meta">(شما)</span>' : ''
  }<br /><span class="meta">${meta}</span></span></div>`
  var role =
    fixedOwner || readOnly
      ? `<p class="note">${fixedOwner ? OWNER_LOCKED : ROLE_HINT[m.role]}</p>`
      : field(
          'نقش',
          select(
            'role-' + m.email,
            [
              ['partner', 'شریک'],
              ['viewer', 'ناظر']
            ],
            m.role,
            `data-act="role" data-v="${m.email}"`
          ),
          { hint: ROLE_HINT[m.role] }
        )
  var toggle = btn(
    open ? 'بستن تنظیم دقیق دسترسی‌ها' : 'تنظیم دقیق دسترسی‌ها ▾',
    'expand',
    'sec sm',
    `data-v="${m.email}" aria-expanded="${open}"`
  )
  var perms = ''
  if (open) {
    perms = PERMS.map(function (p) {
      var changed = p[0] in m.ov ? '<br /><span class="hint">تغییر داده‌شده</span>' : ''
      return `<div class="setrow"><span class="grow"><b>${
        p[1]
      }</b>${changed}</span>${sw('perm', can(p[0], m), p[1], { v: m.email + '|' + p[0], disabled: locked })}</div>`
    }).join('')
    if (custom(m) && changeable)
      perms += btn('برگرداندن به حالت معمول این نقش', 'resetPerms', 'sec sm', `data-v="${m.email}"`)
    if (viewerCanWrite(m)) perms += `<p class="note">${RAISED}</p>`
    perms += `<p class="meta">${HONEST}</p>`
  }
  var rest = ''
  if (m.st === 'invited' && changeable) {
    rest += btn('این عضو وارد شده است', 'markActive', 'sec sm', `data-v="${m.email}"`)
    rest += btn('ارسال دوبارهٔ دعوت', 'resend', 'sec sm', `data-v="${m.email}"`)
  }
  var remove = changeable ? btn('قطع دسترسی', 'removeAsk', 'danger sm', `data-v="${m.email}"`) : ''
  var actions = open
    ? `${toggle}${perms}<div class="btns">${rest}${remove}</div>`
    : `<div class="btns">${toggle}${rest}${remove}</div>`
  return `<div class="card">${head}${role}${actions}</div>`
}
function safetyCard() {
  var owner = S.members.filter(function (m) {
    return m.role === 'owner'
  })[0]
  var editors = S.members
    .filter(function (m) {
      return m.role !== 'owner' && driveWriter(m)
    })
    .map(function (m) {
      return nameIn(m.email)
    })
  var editorsLine =
    myRole() === 'owner' && editors.length
      ? `<p class="meta">ویرایش در درایو: ${editors.join('، ')}</p>`
      : ''
  var backup = can('export')
    ? `<div class="setrow" style="border:0;border-top:1px solid var(--border)"><span class="grow"><b>پشتیبان خودکار هفتگی در درایو شما</b><br /><span class="hint">زیپ کامل در پوشهٔ «پشتیبان» درایو خودتان؛ سه نسخهٔ آخر می‌ماند</span></span>${sw(
        'backup',
        S.backup[me()],
        'پشتیبان خودکار هفتگی در درایو شما'
      )}</div>`
    : ''
  return `<div class="card"><h3>ایمنی داده</h3><p class="meta">فایل در درایو ${nameIn(
    owner.email
  )} است. اگر مالک فایل را پاک کند، همه دسترسی را از دست می‌دهند.</p>${editorsLine}${backup}</div>`
}
function members() {
  var role = myRole()
  var own = `<div class="card"><div class="row" style="align-items:flex-start">${avatar(
    me()
  )}<span class="grow"><b>نقش شما: ${ROLE[role]}</b><br /><span class="meta">${
    ROLE_HINT[role]
  }</span></span></div></div>`
  var intro = `<p class="note">${can('members') ? MEMBERS_INTRO : MEMBERS_INTRO_RO}</p>`
  var invite = can('members') ? btn('+ دعوت', 'invite', 'block') : ''
  var leave = role === 'owner' ? '' : btn('ترک این فضا', 'leaveAsk', 'danger block')
  return `${header('اعضا')}<div class="page">${own}${intro}${invite}${S.members
    .map(memberCard)
    .join('')}${safetyCard()}${leave}</div>`
}
