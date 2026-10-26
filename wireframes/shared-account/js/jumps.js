/* eslint-disable -- prototype scripts share globals, not part of the app source */
/* The rail's jump list: each jump resets the sample data and opens one shipped state. */
function jumpTo(o) {
  var keepTheme = S.theme
  $('screen').dataset.screen = ''
  Object.assign(S, seed(), {
    as: o.as || 'owner',
    screen: o.screen || 'hub',
    filter: 'all',
    sheet: null,
    sheet2: null,
    toast: null,
    busy: null,
    expanded: '',
    wiz: freshWizard(),
    ent: blankEntry(),
    theme: keepTheme
  })
  if (o.prep) o.prep()
}
function wizAt(step, extra) {
  return function () {
    S.space.owner = 'none'
    Object.assign(
      S.wiz,
      { step: step, name: step > 1 ? 'خانهٔ ما' : '', email: step > 1 ? 'mina@example.com' : '' },
      extra || {}
    )
  }
}
function edit(id, on) {
  return function () {
    A.pedit({ dataset: { v: id } })
    if (on !== undefined) S.ent.on = on
  }
}
var JUMPS = [
  [
    '۱ · فضاهای من',
    [
      [
        'هنوز راه‌اندازی نشده',
        {
          prep: function () {
            S.space = { owner: 'none', partner: 'none', viewer: 'none' }
          }
        }
      ],
      ['حساب مشترک روشن، با خبرها', {}],
      [
        'پنهان‌شده: «روشن کردن دوباره»',
        {
          prep: function () {
            S.space.owner = 'hidden'
          }
        }
      ],
      [
        'خاموش کردن قابلیت (مالک)',
        {
          prep: function () {
            A.offSheet()
          }
        }
      ]
    ]
  ],
  [
    '۲ · راه‌اندازی',
    [
      ['قدم ۱ · مشترک و خصوصی', { screen: 'wizard', prep: wizAt(1) }],
      [
        'قدم ۲ · خطای «نام»',
        { screen: 'wizard', prep: wizAt(2, { name: '', err: 'نام حساب مشترک را بنویسید' }) }
      ],
      ['قدم ۳ · تقسیم', { screen: 'wizard', prep: wizAt(3) }],
      [
        'در حال ساخت (پوشش)',
        {
          screen: 'wizard',
          prep: function () {
            wizAt(3)()
            S.busy = { text: 'در حال ساخت فایل حساب مشترک در Google Drive…', pct: 18 }
          }
        }
      ],
      ['گوگل اشتراک را رد کرد', { screen: 'wizard', prep: wizAt(3, { fail: true }) }],
      [
        'وقتی حساب مشترک دارید',
        {
          screen: 'wizard',
          prep: function () {
            S.wiz.taken = true
          }
        }
      ]
    ]
  ],
  [
    '۳ · داخل حساب مشترک',
    [
      ['خانه', { screen: 'home' }],
      ['ثبت‌ها و فیلتر', { screen: 'records' }],
      [
        'برگهٔ ثبت خودم (ویرایش مبلغ، حذف)',
        {
          screen: 'records',
          prep: function () {
            S.sheet = { kind: 'rec', id: 'r3' }
          }
        }
      ],
      [
        'ثبت دیگری، شریک بدون دسترسی',
        {
          as: 'partner',
          screen: 'records',
          prep: function () {
            S.sheet = { kind: 'rec', id: 'r3' }
          }
        }
      ],
      [
        'برگهٔ ثبت برای ناظر',
        {
          as: 'viewer',
          screen: 'records',
          prep: function () {
            S.sheet = { kind: 'rec', id: 'r2' }
          }
        }
      ],
      [
        'ثبت هزینه',
        {
          screen: 'home',
          prep: function () {
            A.add()
            Object.assign(S.add, {
              amount: 300000,
              title: 'نان و پنیر',
              cat: 'خوراک',
              payer: PARTNER,
              split: 'only:' + PARTNER
            })
          }
        }
      ],
      [
        'ثبت تسویه',
        {
          screen: 'home',
          prep: function () {
            A.settleSheet()
          }
        }
      ],
      ['تسویه و تاریخچه', { screen: 'settle' }]
    ]
  ],
  [
    '۴ · اعضا',
    [
      ['اعضا (مالک)', { screen: 'members' }],
      [
        'کارت عضو باز (شریک)',
        {
          screen: 'members',
          prep: function () {
            S.expanded = PARTNER
          }
        }
      ],
      [
        'ناظر با کلید نوشتن → «ویرایش»',
        {
          screen: 'members',
          prep: function () {
            S.members[2].ov = { record: 1 }
            S.expanded = VIEWER
          }
        }
      ],
      [
        'دعوت عضو',
        {
          screen: 'members',
          prep: function () {
            A.invite()
          }
        }
      ],
      [
        'ترک این فضا (شریک)',
        {
          as: 'partner',
          screen: 'members',
          prep: function () {
            A.leaveAsk()
          }
        }
      ],
      [
        'ترک · گوگل اجازه نداد',
        {
          as: 'partner',
          screen: 'members',
          prep: function () {
            S.leaveFallback = true
            A.leaveAsk()
          }
        }
      ]
    ]
  ],
  [
    '۵ · فرم شخصی و کلید',
    [
      ['ثبت جدید · کلید خاموش', { screen: 'entry' }],
      [
        'کلید روشن · هزینه',
        {
          screen: 'entry',
          prep: function () {
            Object.assign(S.ent, { on: true, amount: 2400000, title: 'سوپرمارکت' })
          }
        }
      ],
      [
        'کلید روشن · درآمد',
        {
          screen: 'entry',
          prep: function () {
            S.ent = Object.assign(blankEntry('income'), { on: true, amount: 5000000 })
          }
        }
      ],
      [
        'این دستگاه وصل نیست',
        {
          screen: 'entry',
          prep: function () {
            S.grant = false
          }
        }
      ],
      ['ویرایش · برداشتن کلید + خبر', { screen: 'plist', prep: edit('p1', false) }],
      ['ویرایش · روشن کردن کلید', { screen: 'plist', prep: edit('p2', true) }],
      [
        'در انتظار ارسال · ناموفق',
        {
          screen: 'plist',
          prep: function () {
            S.failed = 'p3'
            edit('p3')()
          }
        }
      ],
      ['فهرست شخصی و نشان‌ها', { screen: 'plist' }],
      [
        'حذف ثبتِ در حساب مشترک',
        {
          screen: 'plist',
          prep: function () {
            A.pdel({ dataset: { v: 'p1' } })
          }
        }
      ]
    ]
  ],
  [
    '۶ · خبر تغییر',
    [
      ['کارت خبر در «رکوردها»', { screen: 'plist' }],
      [
        'برگهٔ خبر · مبلغ',
        {
          screen: 'plist',
          prep: function () {
            S.sheet = { kind: 'notice', id: 'n1' }
          }
        }
      ],
      [
        'برگهٔ خبر · حذف («باشه»)',
        {
          screen: 'plist',
          prep: function () {
            S.sheet = { kind: 'notice', id: 'n3' }
          }
        }
      ],
      ['هشدار در فرم ویرایش', { screen: 'plist', prep: edit('p1') }],
      ['کارت خبر در خانهٔ حساب', { screen: 'home' }]
    ]
  ]
]
