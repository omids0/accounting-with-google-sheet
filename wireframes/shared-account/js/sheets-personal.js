/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* Personal-side sheets: «تغییر در ثبت مشترک» (SharedNoticeSheet), «حذف ثبت» with the two
   choices (SharedDeleteChoiceSheet) and the «رفتن به «فضاهای من»؟» confirmation of SharedTick. */
function notice(id) {
  return S.notices.filter(function (n) {
    return n.id === id
  })[0]
}
function noticeSheet(id, inForm) {
  var n = notice(id)
  if (!n) return ''
  var who = isSharedScreen() ? nameIn : nameOut
  var plain = n.kind === 'delete'
  var change = plain
    ? 'ثبت شخصی شما می‌ماند و دیگر به حساب مشترک وصل نیست.'
    : `قبل: ${noticeValue(n, n.old)}\nبعد: ${noticeValue(n, n.new)}`
  var tail = inForm
    ? 'برای اعمال، همین فرم را عوض کنید و ذخیره کنید.'
    : 'در هر دو حالت نسخهٔ حساب مشترک همان‌طور که ویرایش شده می‌ماند.'
  var msg = `${noticeSentence(n, who(n.by))}.\n${change}\n${tail}`
  var ok = inForm || plain ? 'باشه' : 'اعمال در ثبت شخصی من'
  var okAct = inForm ? 'nFormOk' : plain ? 'nAck' : 'nApply'
  var cancel = plain && !inForm ? 'بعداً' : 'نادیده بگیر'
  return confirmSheet(
    'تغییر در ثبت مشترک',
    msg,
    ok,
    okAct,
    cancel,
    plain && !inForm ? 'close' : 'nSkip'
  )
}
function deleteChoiceSheet(id) {
  var r = pers(id)
  if (r.link === 'none' || space() !== 'on') {
    return confirmSheet(
      'حذف ثبت',
      `«${r.title}» حذف شود؟`,
      'حذف',
      'pdelOne',
      'انصراف',
      'close',
      'danger'
    )
  }
  var msg = `«${r.title}» در «${ACCOUNT}» هم هست. کدام حذف شود؟\nاگر فقط از حساب شخصی حذف شود، نسخهٔ حساب مشترک می‌ماند و دیگر به این ثبت وصل نیست.`
  return confirmSheet('حذف ثبت', msg, 'از هر دو حذف شود', 'pdelBoth', 'فقط از حساب شخصی', 'pdelOne')
}
function connectLeaveSheet() {
  return confirmSheet(
    'رفتن به «فضاهای من»؟',
    'آنچه در این فرم نوشته‌اید ذخیره نمی‌شود. اول ذخیره کنید یا بعداً وصل شوید.',
    'برو',
    'connectGo',
    'بمان'
  )
}
/* `S.sheet`, and `S.sheet2` on top of it (the notice sheet opened from the edit form). */
function sheetHTML(s) {
  if (!s) return ''
  var map = {
    rec: function () {
      return recordSheet(s.id)
    },
    add: addSheet,
    settle: settleSheet,
    invite: inviteSheet,
    remove: function () {
      return removeSheet(s.id)
    },
    leave: leaveSheet,
    off: offSheet,
    connect: connectSheet,
    notice: function () {
      return noticeSheet(s.id, s.inForm)
    },
    pdel: function () {
      return deleteChoiceSheet(s.id)
    },
    edit: editSheet,
    connectLeave: connectLeaveSheet
  }
  return map[s.kind] ? map[s.kind]() : ''
}
