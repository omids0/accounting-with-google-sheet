import type { VehicleLinkedCounts } from '../../services/vehicleLinkedCounts'

const ASK = 'از حذف این خودرو مطمئن هستید؟'

function joinParts(parts: string[]): string {
  if (parts.length < 2) return parts.join('')

  return `${parts.slice(0, -1).join('، ')} و ${parts[parts.length - 1]}`
}

/**
 * The question before a vehicle is deleted. Deleting the vehicle does NOT delete what hangs off it
 * (services, deadlines, history, expenses): the rows stay in their tabs and the expenses stay in the
 * records and in the account balances; they are just no longer reachable from a vehicle page.
 */
export function vehicleDeleteMessage(counts: VehicleLinkedCounts | null): string {
  if (!counts) return ASK

  const parts = [
    counts.services > 0 ? `${counts.services.toLocaleString('fa-IR')} سرویس` : '',
    counts.deadlines > 0 ? `${counts.deadlines.toLocaleString('fa-IR')} موعد` : '',
    counts.records > 0 ? `${counts.records.toLocaleString('fa-IR')} ثبت` : ''
  ].filter(Boolean)

  if (!parts.length) return ASK

  return `این خودرو ${joinParts(
    parts
  )} دارد. با حذف خودرو این‌ها پاک نمی‌شوند؛ فقط دیگر در برنامه دیده نمی‌شوند. هزینه‌های ثبت‌شده‌اش در تراکنش‌ها و موجودی حساب‌ها می‌ماند.`
}
