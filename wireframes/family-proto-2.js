/* eslint-disable -- prototype scripts share globals, not part of the app source */
function wizard() {
  var st = S.step,
    w = S.wiz,
    h =
      appbar('راه‌اندازی حساب مشترک', { back: 'wizBack' }) +
      '<div class="prog">' +
      [1, 2, 3]
        .map(function (i) {
          return '<i class="' + (i <= st ? 'on' : '') + '"></i>'
        })
        .join('') +
      '</div><div class="pad" style="margin-top:12px">'
  if (st === 1) {
    h +=
      '<h3 style="margin:0">چه چیزی مشترک می‌شود؟</h3><div class="two"><div class="card"><h3>مشترک</h3><ul><li>هزینه و درآمد خانه</li><li>دسته‌ها و بودجهٔ خانه</li><li>تسویه بین شما</li></ul></div><div class="card"><h3>خصوصی می‌ماند</h3><ul><li>حساب شخصی شما</li><li>کیف پول، چک و مطالبات شخصی</li><li>پیامک‌های بانکی شما</li></ul></div></div>' +
      '<div class="notice info">' +
      ic('file', 18) +
      '<span>یک شیت تازه در درایو خودتان ساخته می‌شود و فقط با ایمیلی که وارد می‌کنید به اشتراک می‌رسد.</span></div>' +
      '<button class="btn block" data-act="wizNext">ادامه</button>'
  } else if (st === 2) {
    h +=
      '<h3 style="margin:0">شریک‌تان را دعوت کنید</h3>' +
      '<div class="field"><label for="w-name">نام فضا</label><input id="w-name" value="' +
      w.name +
      '"></div>' +
      '<div class="field"><label for="w-email">ایمیل حساب گوگل شریک</label><input id="w-email" dir="ltr" inputmode="email" value="' +
      w.email +
      '"></div>' +
      '<div class="field"><label>نقش</label><div class="seg"><button data-act="wrole" data-v="partner" aria-pressed="' +
      (w.role === 'partner') +
      '">شریک</button><button data-act="wrole" data-v="viewer" aria-pressed="' +
      (w.role === 'viewer') +
      '">ناظر</button></div><span class="small muted">' +
      ROLE_HINT[w.role] +
      '</span></div>' +
      '<div class="notice info"><span>گوگل برای شریک‌تان ایمیل دعوت می‌فرستد. باید یک حساب گوگل باشد.</span></div>' +
      '<button class="btn block" data-act="wizNext">ادامه</button>'
  } else {
    h +=
      '<h3 style="margin:0">قاعدهٔ پیش‌فرض تقسیم</h3>' +
      '<div class="seg"><button data-act="wsplit" data-v="equal" aria-pressed="' +
      (w.split === 'equal') +
      '">نصف‌نصف</button><button data-act="wsplit" data-v="ratio" aria-pressed="' +
      (w.split === 'ratio') +
      '">به نسبت درآمد</button></div>' +
      '<p class="small muted">هر هزینه را هنگام ثبت می‌توانید عوض کنید. این فقط مقدار پیش‌فرض است.</p>' +
      '<div class="notice info"><span>هیچ ثبتی خودکار به حساب مشترک نمی‌رود، حتی پیامک بانکی. روی هر ثبت شخصی خودتان تیک «مشترک» را می‌زنید.</span></div>' +
      '<button class="btn block" data-act="wizDone">ساخت فضا و ارسال دعوت</button>'
  }
  return h + '</div>'
}

function entry() {
  var e = S.ent,
    fam = S.familyOn && can('record'),
    p = S.as === 'B' ? 'B' : 'A',
    o = p === 'A' ? 'B' : 'A',
    exp = e.type === 'exp'
  var h =
    appbar(e.id ? 'ویرایش ثبت شخصی' : 'ثبت در حساب شخصی', { back: e.id ? 'plist' : 'spaces' }) +
    '<div class="pad">' +
    '<div class="seg"><button data-act="etype" data-v="exp" aria-pressed="' +
    exp +
    '">هزینه</button><button data-act="etype" data-v="inc" aria-pressed="' +
    !exp +
    '">درآمد</button></div>' +
    '<div class="field"><label for="e-amount">مبلغ (تومان)</label><input id="e-amount" inputmode="numeric" value="' +
    (e.a ? fmt(e.a) : '') +
    '" placeholder="مثلاً ۸۵۰٬۰۰۰"></div>' +
    '<div class="field"><label for="e-title">بابت</label><input id="e-title" value="' +
    e.t +
    '" placeholder="' +
    (exp ? 'مثلاً میوه و سبزی' : 'مثلاً حقوق') +
    '"></div>' +
    '<div class="field"><label for="e-cat">دسته</label><select id="e-cat">' +
    CATS.map(function (c) {
      return '<option' + (c === e.cat ? ' selected' : '') + '>' + c + '</option>'
    }).join('') +
    '</select></div>'
  if (fam) {
    h +=
      '<label class="card check"><input type="checkbox" id="e-share" data-act="eshare"' +
      (e.share ? ' checked' : '') +
      '><span class="grow"><b>در «' +
      S.wiz.name +
      '» هم ثبت شود</b><br><span class="small muted">' +
      (exp
        ? 'یک نسخه از این هزینه در حساب مشترک هم نوشته می‌شود و در تراز حساب می‌شود.'
        : 'مبلغ درآمد را شریک هم می‌بیند. به‌صورت پیش‌فرض خاموش است.') +
      '</span></span></label>'
    if (e.share && exp) {
      h +=
        '<div class="card"><div class="field"><label>این هزینه برای چه کسی است؟</label><div class="seg"><button data-act="esplit" data-v="equal" aria-pressed="' +
        (e.sp === 'equal') +
        '">نصف‌نصف</button><button data-act="esplit" data-v="' +
        p +
        '" aria-pressed="' +
        (e.sp === p) +
        '">فقط من</button><button data-act="esplit" data-v="' +
        o +
        '" aria-pressed="' +
        (e.sp === o) +
        '">فقط ' +
        mem(o).name +
        '</button></div></div><div class="notice info"><span id="e-prev">' +
        prev({ a: e.a, sp: e.sp }) +
        '</span></div></div>'
    } else if (e.share) {
      h +=
        '<div class="notice info"><span>درآمد در تراز و تسویه اثری ندارد و فقط در گزارش حساب مشترک دیده می‌شود.</span></div>'
    }
  }
  if (e.id && fam) {
    if (e.wasShared && !e.share)
      h += '<div class="notice"><span>با ذخیره، نسخهٔ حساب مشترک این ثبت حذف می‌شود.</span></div>'
    else if (!e.wasShared && e.share)
      h +=
        '<div class="notice info"><span>با ذخیره، یک نسخه در «' +
        S.wiz.name +
        '» ساخته می‌شود.</span></div>'
  }
  h += '<button class="btn block" data-act="esave">' + (e.id ? 'ذخیرهٔ تغییر' : 'ثبت') + '</button>'
  if (e.id)
    h += '<button class="btn danger block" data-act="pdelAsk" data-id="' + e.id + '">حذف</button>'
  return h + '</div>'
}

function personal() {
  return (
    appbar('ثبت‌های شخصی', {
      back: 'spaces',
      right: '<button class="chip" data-act="entry">+ ثبت</button>'
    }) +
    '<div class="pad">' +
    notices() +
    '<div class="card"><div class="list">' +
    S.pers
      .map(function (r) {
        return (
          '<button class="item" data-act="pedit" data-id="' +
          r.id +
          '"><span class="grow"><b>' +
          r.t +
          '</b><br><span class="small muted">' +
          r.cat +
          (r.type === 'inc' ? ' · درآمد' : '') +
          '</span></span>' +
          (r.sh && S.familyOn ? '<span class="pill">در حساب مشترک</span>' : '') +
          '<span class="amt num">' +
          fmt(r.a) +
          '</span></button>'
        )
      })
      .join('') +
    '</div></div></div>'
  )
}

function notices() {
  return S.notices
    .filter(function (n) {
      return n.to === S.as
    })
    .map(function (n) {
      return (
        '<div class="notice"><span class="grow">' +
        (mem(n.by) ? mem(n.by).name : '؟') +
        ' مبلغ «' +
        n.title +
        '» را در حساب مشترک عوض کرد: از ' +
        fmt(n.old) +
        ' به ' +
        fmt(n.new) +
        '</span><button class="chip" data-act="notice" data-id="' +
        n.id +
        '">بررسی</button></div>'
      )
    })
    .join('')
}

function txEdit(t) {
  var cross = t.src && t.by !== S.as
  return (
    '<div class="field"><label for="t-amount">ویرایش مبلغ (تومان)</label><input id="t-amount" inputmode="numeric" value="' +
    fmt(t.a) +
    '"></div>' +
    (cross
      ? '<div class="notice info"><span>این ثبت از حساب شخصی ' +
        nm(t.by) +
        ' آمده. تغییر شما به او اطلاع داده می‌شود و خودش تصمیم می‌گیرد در ثبت شخصی‌اش اعمال کند یا نه.</span></div>'
      : '') +
    '<button class="btn block" data-act="editTx" data-id="' +
    t.id +
    '">ذخیرهٔ تغییر</button><button class="btn danger block" data-act="delTx" data-id="' +
    t.id +
    '">حذف این ثبت</button>'
  )
}

function pdelSheet(id) {
  var r = pers(id)
  if (!r) return ''
  if (r.sh && S.familyOn)
    return sheetWrap(
      'حذف ثبت',
      '<p>«' +
        r.t +
        '» در «' +
        S.wiz.name +
        '» هم هست. کدام حذف شود؟</p><button class="btn danger block" data-act="pdel" data-v="both">از هر دو حذف شود</button><button class="btn ghost block" data-act="pdel" data-v="one">فقط از حساب شخصی</button><p class="small muted">اگر فقط از شخصی حذف شود، نسخهٔ حساب مشترک می‌ماند و دیگر به این ثبت وصل نیست.</p>'
    )
  return sheetWrap(
    'حذف ثبت',
    '<p>«' +
      r.t +
      '» حذف شود؟</p><button class="btn danger block" data-act="pdel" data-v="one">حذف</button><button class="btn ghost block" data-act="close">انصراف</button>'
  )
}

function noticeSheet(id) {
  var n = S.notices.filter(function (x) {
    return x.id === id
  })[0]
  if (!n) return ''
  return sheetWrap(
    'تغییر در ثبت مشترک',
    '<div class="card"><p>' +
      (mem(n.by) ? mem(n.by).name : '؟') +
      ' مبلغ «' +
      n.title +
      '» را در «' +
      S.wiz.name +
      '» عوض کرد.</p><div class="row"><span class="grow">قبل</span><b class="num">' +
      fmt(n.old) +
      '</b></div><div class="row"><span class="grow">بعد</span><b class="num">' +
      fmt(n.new) +
      '</b></div></div>' +
      '<button class="btn block" data-act="nApply">اعمال در ثبت شخصی من</button><button class="btn ghost block" data-act="nSkip">نادیده بگیر</button><p class="small muted">در هر دو حالت نسخهٔ حساب مشترک همان‌طور که ویرایش شده می‌ماند. فقط ثبت شخصی شما به تصمیم شما بستگی دارد.</p>'
  )
}
