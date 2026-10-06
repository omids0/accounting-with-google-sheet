import { useState } from 'react'

import { formatPersianNumber } from '../../utils/formatMoney'
import type { LoanScheduleRow } from '../../utils/loanCalculator'
import { AccordionCollapse } from '../AccordionCollapse'
import Button from '../ui/Button'
import {
  loanScheduleTableClass,
  loanScheduleTableWrapClass,
  loanScheduleToggleClass
} from '../ui/calculatorStyles'
import Card, { CardTitle } from '../ui/Card'

function formatCell(value: number): string {
  return formatPersianNumber(Math.round(value))
}

export default function LoanScheduleTable({ rows }: { rows: LoanScheduleRow[] }) {
  const [open, setOpen] = useState(false)

  if (rows.length === 0) return null

  return (
    <Card>
      <CardTitle>جدول اقساط</CardTitle>
      <Button
        variant="secondary"
        size="sm"
        className={loanScheduleToggleClass}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {open ? 'پنهان کردن جدول اقساط' : 'نمایش جدول اقساط ماه به ماه'}
      </Button>
      <AccordionCollapse open={open}>
        <div className={loanScheduleTableWrapClass}>
          <table className={loanScheduleTableClass}>
            <thead>
              <tr>
                <th scope="col">ماه</th>
                <th scope="col">قسط</th>
                <th scope="col">سود</th>
                <th scope="col">اصل</th>
                <th scope="col">مانده</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.month}>
                  <td>{formatPersianNumber(row.month)}</td>
                  <td>{formatCell(row.payment)}</td>
                  <td>{formatCell(row.interest)}</td>
                  <td>{formatCell(row.principal)}</td>
                  <td>{formatCell(row.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AccordionCollapse>
    </Card>
  )
}
