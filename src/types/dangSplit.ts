/** گروه دنگ: یک سفر، یک شام یا یک دوره هزینه مشترک */
export interface DangSplitGroup {
  id: string
  createdAt: string
  title: string
  description: string
}

/** دسته افراد: خانواده، تیم، اتاق و … */
export interface DangSplitPersonCategory {
  id: string
  groupId: string
  title: string
  createdAt: string
}

export interface DangSplitPerson {
  id: string
  groupId: string
  name: string
  /** شناسه دسته؛ خالی یعنی بدون دسته */
  categoryId: string
  /** ضریب پیش‌فرض سهم این فرد (پیش‌فرض ۱) */
  defaultWeight: number
  /** پولی که اول کار به صندوق گروه واریز کرده */
  deposit: number
  /** مبلغی که این فرد تا حالا پرداخت کرده */
  paidAmount: number
  /** زمان رسیدن مانده به صفر */
  settledAt: string
  note: string
}

export interface DangSplitExpense {
  id: string
  groupId: string
  title: string
  date: string
  amount: number
  note: string
  /** شناسه فردی که پول این قلم را داده؛ خالی یعنی پرداخت‌کننده ثبت نشده */
  payerId: string
  createdAt: string
}

/** تخصیص یک فرد به یک قلم هزینه */
export interface DangSplitAllocation {
  id: string
  groupId: string
  expenseId: string
  personId: string
  /** وزن سهم این فرد از این قلم */
  weight: number
}

export type DangSplitSettlementStatus = 'none' | 'unpaid' | 'partial' | 'settled' | 'creditor'

/** سهم یک فرد از یک قلم هزینه */
export interface DangSplitPersonExpenseShare {
  expenseId: string
  expenseTitle: string
  expenseDate: string
  expenseAmount: number
  /** نام کسی که پول این قلم را داده؛ خالی یعنی ثبت نشده */
  payerName: string
  weight: number
  weightTotal: number
  share: number
}

/** جمع‌بندی یک فرد در یک گروه */
export interface DangSplitPersonSummary {
  personId: string
  name: string
  categoryId: string
  share: number
  /** واریز اولیه به صندوق */
  deposit: number
  /** مبلغ اقلامی که خودش پرداخت کرده */
  expensePaid: number
  /** کل بستانکاری: واریز + اقلام پرداختی */
  credit: number
  /** تسویه نقدی؛ منفی یعنی پولش را پس گرفته */
  paid: number
  /** سهم منهای بستانکاری و تسویه؛ مثبت = بدهکار، منفی = طلبکار */
  balance: number
  status: DangSplitSettlementStatus
  breakdown: DangSplitPersonExpenseShare[]
}

/** جمع‌بندی کل گروه */
export interface DangSplitGroupSummary {
  total: number
  /** کل بستانکاری افراد: واریز به صندوق + اقلامی که خودشان پرداخت کرده‌اند */
  covered: number
  /** جمع واریزهای اولیه به صندوق */
  depositTotal: number
  paid: number
  balance: number
  /** جمع مانده بدهکارها */
  debtTotal: number
  /** جمع مانده طلبکارها */
  creditTotal: number
  /** مبلغ اقلامی که هنوز به کسی تخصیص نخورده‌اند */
  unallocatedTotal: number
  peopleCount: number
  settledCount: number
  expensesCount: number
  people: DangSplitPersonSummary[]
}

export type DangSplitWeightMode = 'equal' | 'manual'
