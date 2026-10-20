/* eslint-disable -- prototype scripts share globals, not part of the app source */
function seedState() {
  return {
    theme: 'light',
    buildings: [seedNarges(), seedAftab()],
    pb: {
      accounts: [{ id: 'pa1', name: 'ملی · شخصی', card: '۶۰۳۷۹۹۱۲۳۴۵۶۱۲۳۴', balance: 8500000 }],
      recs: [
        {
          id: 'pc1',
          type: 'expense',
          title: 'خرید هفتگی',
          amount: 640000,
          cat: 'خوراک',
          date: '1405-07-29'
        },
        {
          id: 'pc2',
          type: 'income',
          title: 'حقوق مهر',
          amount: 28000000,
          cat: 'حقوق',
          date: '1405-07-30'
        }
      ],
      receivables: [],
      sms: [
        { id: 'ps1', text: 'برداشت ۲۲۰٬۰۰۰ از کارت ۶۰۳۷…۱۲۳۴ (کافه)', card: '۶۰۳۷۹۹۱۲۳۴۵۶۱۲۳۴' }
      ]
    },
    in: null,
    lastBuilding: null
  }
}
let S = seedState()
const STORE = 'r11p_v2'
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ S, _id }))
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORE)
    if (raw) {
      const o = JSON.parse(raw)
      S = o.S
      if (S.today) TODAY = S.today
      S.buildings.forEach(b =>
        (b.members || []).forEach(m => (m.roleKey = m.roleKey || (m.me ? 'manager' : 'board')))
      )
      _id = o._id
    }
  } catch (e) {}
}
function resetAll() {
  try {
    localStorage.removeItem(STORE)
  } catch (e) {}
  const theme = S.theme
  _id = 1000
  TODAY = '1405-08-01'
  S = seedState()
  S.theme = theme
}
