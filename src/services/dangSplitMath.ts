import type {
  DangSplitAllocation,
  DangSplitExpense,
  DangSplitGroupSummary,
  DangSplitPerson,
  DangSplitPersonExpenseShare,
  DangSplitPersonSummary,
  DangSplitSettlementStatus
} from '../types/dangSplit'

export type DangSplitWeight = {
  personId: string
  weight: number
}

function normalizeWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function safeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0
}

/** ضریب پیش‌فرض فرد؛ مقدار نامعتبر یا صفر یعنی ۱ */
export function personDefaultWeight(person: Pick<DangSplitPerson, 'defaultWeight'>): number {
  const weight = normalizeWeight(person.defaultWeight)

  return weight > 0 ? weight : 1
}

/**
 * سهم هر فرد از یک قلم هزینه.
 *
 * سهم‌ها به عدد صحیح رو به پایین گرد می‌شوند و باقیمانده به بزرگ‌ترین سهم اضافه
 * می‌شود، پس جمع سهم‌ها همیشه دقیقاً برابر مبلغ قلم است.
 */
export function splitExpenseShares(
  amount: number,
  weights: DangSplitWeight[]
): Map<string, number> {
  const shares = new Map<string, number>()

  if (weights.length === 0) return shares

  const normalized = weights.map(item => ({
    personId: item.personId,
    weight: normalizeWeight(item.weight)
  }))
  const weightTotal = normalized.reduce((sum, item) => sum + item.weight, 0)
  const effective = weightTotal > 0 ? normalized : normalized.map(item => ({ ...item, weight: 1 }))
  const effectiveTotal = effective.reduce((sum, item) => sum + item.weight, 0)
  const safeAmount = Number.isFinite(amount) ? amount : 0

  let assigned = 0
  let largestIndex = 0

  effective.forEach((item, index) => {
    const share = Math.floor((safeAmount * item.weight) / effectiveTotal)

    shares.set(item.personId, share)
    assigned += share

    if (item.weight > effective[largestIndex].weight) {
      largestIndex = index
    }
  })

  const remainder = safeAmount - assigned

  if (remainder !== 0) {
    const largestId = effective[largestIndex].personId

    shares.set(largestId, (shares.get(largestId) ?? 0) + remainder)
  }

  return shares
}

/** حالت مساوی: وزن هر فرد، ضریب پیش‌فرض خودش است */
export function resolveEqualWeights(people: DangSplitPerson[]): DangSplitWeight[] {
  return people.map(item => ({ personId: item.id, weight: personDefaultWeight(item) }))
}

/**
 * حالت سهم دستی: درصد افرادی که دستی وارد شده ثابت می‌ماند و باقی درصد به تناسب
 * ضریب پیش‌فرض بین بقیه پخش می‌شود.
 */
export function resolveManualWeights(
  people: DangSplitPerson[],
  manualPercents: Record<string, number>
): DangSplitWeight[] {
  const manual = new Map<string, number>()

  for (const item of people) {
    const percent = manualPercents[item.id]

    if (typeof percent === 'number' && Number.isFinite(percent) && percent > 0) {
      manual.set(item.id, percent)
    }
  }

  if (manual.size === 0) return resolveEqualWeights(people)

  const manualTotal = [...manual.values()].reduce((sum, value) => sum + value, 0)
  const rest = people.filter(item => !manual.has(item.id))
  const restWeightTotal = rest.reduce((sum, item) => sum + personDefaultWeight(item), 0)
  const remainingPercent = Math.max(0, 100 - manualTotal)

  return people.map(item => {
    const manualPercent = manual.get(item.id)

    if (manualPercent !== undefined) {
      return { personId: item.id, weight: manualPercent }
    }

    if (restWeightTotal <= 0 || remainingPercent <= 0) {
      return { personId: item.id, weight: 0 }
    }

    return {
      personId: item.id,
      weight: (remainingPercent * personDefaultWeight(item)) / restWeightTotal
    }
  })
}

/**
 * وضعیت یک فرد از روی سهم، بستانکاری (اقلامی که خودش پرداخت کرده) و تسویه نقدی.
 * مانده مثبت یعنی بدهکار، منفی یعنی طلبکار.
 */
export function settlementStatus({
  share,
  credit,
  paid,
  balance
}: {
  share: number
  credit: number
  paid: number
  balance: number
}): DangSplitSettlementStatus {
  if (share <= 0 && credit <= 0 && paid === 0) return 'none'
  if (balance === 0) return 'settled'
  if (balance < 0) return 'creditor'
  if (paid !== 0 || credit > 0) return 'partial'

  return 'unpaid'
}

/** جمع‌بندی گروه: سهم، پرداختی و مانده هر فرد به‌همراه ریز اقلام */
export function buildGroupSummary({
  people,
  expenses,
  allocations
}: {
  people: DangSplitPerson[]
  expenses: DangSplitExpense[]
  allocations: DangSplitAllocation[]
}): DangSplitGroupSummary {
  const knownPeople = new Set(people.map(item => item.id))
  const nameById = new Map(people.map(item => [item.id, item.name]))
  const breakdowns = new Map<string, DangSplitPersonExpenseShare[]>()

  // پرداخت‌کننده‌ی این اقلام از گروه حذف شده و کسی برای دریافت طلبش نمانده؛ اگر سهم‌ها
  // حساب شوند، بدهی بدون طلبکار می‌ماند و جمع مانده‌ها صفر نمی‌شود.
  const activeExpenses = expenses.filter(item => !item.payerId || knownPeople.has(item.payerId))

  for (const expense of activeExpenses) {
    const expenseAllocations = allocations.filter(
      item => item.expenseId === expense.id && knownPeople.has(item.personId)
    )

    if (expenseAllocations.length === 0) continue

    const weights = expenseAllocations.map(item => ({
      personId: item.personId,
      weight: item.weight
    }))
    const weightTotal = weights.reduce((sum, item) => sum + normalizeWeight(item.weight), 0)
    const shares = splitExpenseShares(expense.amount, weights)

    for (const item of expenseAllocations) {
      const list = breakdowns.get(item.personId) ?? []

      list.push({
        expenseId: expense.id,
        expenseTitle: expense.title,
        expenseDate: expense.date,
        expenseAmount: expense.amount,
        payerName: nameById.get(expense.payerId) ?? '',
        weight: normalizeWeight(item.weight),
        weightTotal: weightTotal > 0 ? weightTotal : expenseAllocations.length,
        share: shares.get(item.personId) ?? 0
      })
      breakdowns.set(item.personId, list)
    }
  }

  const expensePaidByPerson = new Map<string, number>()

  for (const expense of activeExpenses) {
    if (!expense.payerId) continue

    expensePaidByPerson.set(
      expense.payerId,
      (expensePaidByPerson.get(expense.payerId) ?? 0) + safeAmount(expense.amount)
    )
  }

  const summaries: DangSplitPersonSummary[] = people.map(item => {
    const breakdown = breakdowns.get(item.id) ?? []
    const share = breakdown.reduce((sum, entry) => sum + entry.share, 0)
    const deposit = safeAmount(item.deposit)
    const expensePaid = expensePaidByPerson.get(item.id) ?? 0
    const credit = deposit + expensePaid
    const paid = Number.isFinite(item.paidAmount) ? item.paidAmount : 0
    const balance = share - credit - paid

    return {
      personId: item.id,
      name: item.name,
      categoryId: item.categoryId,
      share,
      deposit,
      expensePaid,
      credit,
      paid,
      balance,
      status: settlementStatus({ share, credit, paid, balance }),
      breakdown
    }
  })

  const allocatedExpenseIds = new Set(allocations.map(item => item.expenseId))

  return {
    total: activeExpenses.reduce((sum, item) => sum + safeAmount(item.amount), 0),
    covered: summaries.reduce((sum, item) => sum + item.credit, 0),
    depositTotal: summaries.reduce((sum, item) => sum + item.deposit, 0),
    paid: summaries.reduce((sum, item) => sum + item.paid, 0),
    balance: summaries.reduce((sum, item) => sum + item.balance, 0),
    debtTotal: summaries.reduce((sum, item) => sum + Math.max(0, item.balance), 0),
    creditTotal: summaries.reduce((sum, item) => sum + Math.max(0, -item.balance), 0),
    unallocatedTotal: activeExpenses.reduce(
      (sum, item) => sum + (allocatedExpenseIds.has(item.id) ? 0 : safeAmount(item.amount)),
      0
    ),
    peopleCount: people.length,
    settledCount: summaries.filter(item => item.status === 'settled').length,
    expensesCount: expenses.length,
    people: summaries
  }
}
