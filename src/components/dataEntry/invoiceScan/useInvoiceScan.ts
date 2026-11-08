import { useCallback, useEffect, useState } from 'react'

import { parseInvoiceText } from '../../../services/invoiceScan/parseInvoiceText'
import { scanInvoiceImage, type ScanStage } from '../../../services/invoiceScan/scanInvoiceImage'
import { getCurrency } from '../../../utils/formatMoney'
import type { LineItem } from '../../../utils/lineItems'
import { showError } from '../../../utils/toast'

export type ScanPhase = 'choose' | 'working' | 'review'

/** An item of the proposal; `amount` is '' while the user has cleared the field. */
export interface ScanRow extends Omit<LineItem, 'amount'> {
  id: number
  amount: number | ''
  /** The numbers of this row did not add up: the review asks to check it against the photo. */
  uncertain?: boolean
}

/**
 * State of one «اسکن فاکتور» run: choose a photo, read it on the phone, review what was read.
 * Nothing leaves the sheet until the user presses «افزودن به فرم».
 */
export function useInvoiceScan(open: boolean) {
  const [phase, setPhase] = useState<ScanPhase>('choose')
  const [stage, setStage] = useState<ScanStage>('preparing')
  const [rows, setRows] = useState<ScanRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    if (!photo) return setPhotoUrl('')

    const url = URL.createObjectURL(photo)

    setPhotoUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [photo])

  useEffect(() => {
    if (open) return

    setPhase('choose')
    setRows([])
    setTotal(null)
    setPhoto(null)
  }, [open])

  const scan = useCallback(async (files: File[]) => {
    const file = files[0]

    if (!file) return

    setPhoto(file)
    setPhase('working')
    setStage('preparing')

    try {
      const lines = await scanInvoiceImage(file, setStage)
      const parsed = parseInvoiceText(lines, getCurrency())

      setRows(parsed.items.map((item, index) => ({ ...item, id: index })))
      setTotal(parsed.total)
      setPhase('review')
    } catch {
      showError('خواندن فاکتور ممکن نشد؛ عکس دیگری بگیر یا اقلام را دستی بنویس.')
      setPhase('choose')
    }
  }, [])

  const editRow = (id: number, patch: Partial<ScanRow>) =>
    setRows(current => current.map(row => (row.id === id ? { ...row, ...patch } : row)))

  const removeRow = (id: number) => setRows(current => current.filter(row => row.id !== id))

  /** Rows the form can take: a name and a positive amount (`parseLineItems` drops the rest). */
  const items: LineItem[] = rows.flatMap(({ id: _id, uncertain: _uncertain, amount, ...rest }) =>
    rest.name.trim() && amount !== '' && amount > 0
      ? [{ ...rest, name: rest.name.trim(), amount }]
      : []
  )

  return {
    phase,
    stage,
    rows,
    items,
    total,
    setTotal,
    photo,
    photoUrl,
    scan,
    editRow,
    removeRow,
    startOver: () => setPhase('choose')
  }
}
