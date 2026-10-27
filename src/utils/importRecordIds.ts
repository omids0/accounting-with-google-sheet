/**
 * The ids of the records a file's payments point at belong to the spreadsheet the file came from.
 * An imported payment keeps its amount and date but no record id (two copies of one workbook must
 * not both point at the same record, and deleting it must not reopen both).
 */
export function withoutRecordIds<T extends { transactionRecordId?: string }>(
  payments: readonly T[]
): Omit<T, 'transactionRecordId'>[] {
  return payments.map(({ transactionRecordId: _foreign, ...payment }) => payment)
}
