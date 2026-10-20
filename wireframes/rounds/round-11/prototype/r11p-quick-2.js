/* eslint-disable -- prototype scripts share globals, not part of the app source */
ACT.fillskip = () => {
  const b = curB()
  const d = UI.sheet.d
  if (d.i >= b.units.length - 1) UI.sheet = null
  else fillLoad(b, d, d.i + 1)
}
ACT.fillsave = () => {
  const b = curB()
  const d = UI.sheet.d
  const u = b.units[d.i]
  if (!String(d.oName).trim()) return toast('نام مالک را وارد کنید (یا «رد کردن»)'), false
  if (d.status === 'tenant' && !String(d.tName).trim())
    return toast('نام مستأجر را وارد کنید'), false
  const ow = personById(b, u.ownerId)
  Object.assign(ow, { name: d.oName.trim(), phone: d.oPhone, card: d.oCard, placeholder: false })
  Object.assign(u, {
    area: Number(d.area),
    people: Number(d.people),
    parking: Number(d.parking),
    storage: Number(d.storage),
    charge: d.auto && Number(d.charge) === Number(d.base0) ? 0 : Number(d.charge)
  })
  const cur = occupantStay(b, u.id)
  let want = null
  if (d.status === 'owner') want = { personId: ow.id, role: 'owner' }
  if (d.status === 'tenant') {
    const same = cur && cur.role === 'tenant' ? personById(b, cur.personId) : null
    const t = same || addPerson(b, d.tName.trim(), 'resident', { phone: d.tPhone })
    Object.assign(t, { name: d.tName.trim(), phone: d.tPhone })
    want = { personId: t.id, role: 'tenant' }
  }
  if (!(cur && want && cur.personId === want.personId && cur.role === want.role)) {
    if (cur) cur.to = TODAY
    if (want)
      b.stays.push({
        id: uid('s'),
        unitId: u.id,
        personId: want.personId,
        role: want.role,
        from: TODAY,
        to: null
      })
  }
  logAct(b, 'مشخصات واحد ' + fa(u.no) + ' تکمیل شد')
  if (d.i >= b.units.length - 1) {
    UI.sheet = null
    toast('تکمیل شد · ' + fa(incompleteUnits(b).length) + ' واحد هنوز ناقص است')
  } else {
    const nxt = b.units.findIndex((x, k) => k > d.i && isPlaceholder(b, x))
    fillLoad(b, d, nxt < 0 ? d.i + 1 : nxt)
  }
}

/* ---------- auto monthly issue (manager role, first open on/after the issue day) ---------- */
function autoIssue(b) {
  S.autoDone = S.autoDone || {}
  const key = b.id + ':' + TODAY
  if (S.autoDone[key]) return
  S.autoDone[key] = 1
  if (!(ROLE_PERMS[b.myRole || 'manager'] || {}).autoIssue || !b.units.length) return
  dedupeChargeReferences(b)
  const months = missingIssueMonths(b)
  let n = 0
  months.forEach(m => (n += issueCharges(b, m, m + '-' + pad(Number(b.profile.dueDay)), '')))
  if (n) {
    UI.toast =
      'شارژ ' + months.map(monthName).join('، ') + ' خودکار برای ' + fa(n) + ' واحد صادر شد'
    UI.anim.toast = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      UI.toast = null
      render()
    }, 3600)
  }
}
ACT.nextmonth = () => {
  setToday(nextMonth(TODAY.slice(0, 7)) + '-01')
  UI.sheet = null
  refreshSide && refreshSide()
}
