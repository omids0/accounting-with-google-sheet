/* eslint-disable -- prototype scripts share globals, not part of the app source */
ACT.sheet = d => {
  const n = d.n
  const init = {
    unitForm: {
      no: Math.max(0, ...(curB()?.units || []).map(u => u.no)) + 1,
      floor: 1,
      area: 95,
      people: 3,
      parking: 1,
      storage: 0,
      charge: curB() ? baseChargeFor(curB(), 95, 3) : 0,
      base0: curB() ? baseChargeFor(curB(), 95, 3) : 0,
      auto: true,
      ownerId: '',
      occId: '',
      occRole: 'owner'
    },
    issue: {
      month:
        d.m ||
        (curB()
          ? missingIssueMonths(curB())[0] || nextMonth(latestMonth(curB()) || '1405-07')
          : ''),
      dueDay: curB() ? String(curB().profile.dueDay) : '10',
      note: ''
    },
    quick: {
      total: curB()?.plannedUnits || 12,
      floors: curB()?.floors || 4,
      area: 95,
      phase: 1,
      ends: [],
      areas: {}
    },
    connect: { link: '' },
    invite: { name: '', role: 'accountant' },
    expenseForm: null,
    incomeForm: { cat: 'پارکینگ مهمان', amount: 0, title: '', acc: curB()?.accounts[0]?.id },
    personForm: { name: '', phone: '', card: '', kind: 'resident', me: false },
    checkForm: { payee: '', amount: 0, due: '1405-08-20', acc: curB()?.accounts[0]?.id, note: '' }
  }
  const bb = curB()
  init.addRes = {
    unitId: (bb?.units.find(u => !occupantStay(bb, u.id)) || bb?.units[0] || {}).id,
    personId: '',
    name: '',
    phone: '',
    role: 'tenant',
    from: TODAY,
    debt: 'keep'
  }
  let dd = init[n] || {}
  if (n === 'expenseForm') dd = expenseDraft(curB())
  if (n === 'unitForm' && d.u) {
    const u = unitById(bb, d.u)
    const st = occupantStay(bb, u.id)
    dd = {
      no: u.no,
      floor: u.floor,
      area: u.area,
      people: u.people,
      parking: u.parking,
      storage: u.storage,
      charge: u.charge || baseChargeFor(bb, u.area, u.people),
      base0: u.charge || baseChargeFor(bb, u.area, u.people),
      auto: !u.charge,
      ownerId: u.ownerId,
      occId: st ? st.personId : '',
      occRole: st ? st.role : 'owner'
    }
  }
  openSheet(n, dd, { unitId: d.u })
  return false
}

function fillCardHTML(b) {
  const inc = incompleteUnits(b).length
  if (!inc) return ''
  return `<div class="guide"><b>${fa(
    inc
  )} واحد هنوز بدون نام مالک است</b>نام مالک، ساکن و مشخصات را یکی‌یکی کامل کن.<div class="btns" style="margin-top:8px"><button class="btn primary sm" data-a="fillopen">ادامهٔ تکمیل واحدها</button></div></div>`
}
