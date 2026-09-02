import type { MonthlyFlow } from '../types'

export function monthlySparkline(data: MonthlyFlow[], key: 'income' | 'expense' | 'net'): number[] {
  if (!data.length) return []

  return data.map(item => item[key])
}

export function distributionSparkline(values: number[]): number[] {
  return values.filter(value => Number.isFinite(value))
}

export function cumulativeSparkline(values: number[]): number[] {
  let sum = 0

  return values.map(value => {
    sum += value

    return sum
  })
}

export function flowTrendSparkline(opening: number, income: number, expense: number): number[] {
  const mid = opening + income * 0.5 - expense * 0.25

  const end = opening + income - expense

  return [opening, mid, end]
}
