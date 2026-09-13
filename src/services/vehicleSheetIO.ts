import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import {
  VEHICLES_HEADERS,
  VEHICLES_SHEET,
  fetchVehicles,
  vehicleRowFromImportCells
} from './vehicleProfiles'
import { getMileageReminderLabel } from '../components/vehicles/constants'
import { formatIranPlateLabel } from '../components/vehicles/iranPlateUtils'
import { downloadTablePdf } from '../utils/pdf'

export async function exportVehiclesCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, VEHICLES_SHEET, VEHICLES_HEADERS, 'خودرو.csv')
}

export async function exportVehiclesPdf(spreadsheetId: string): Promise<void> {
  const items = await fetchVehicles(spreadsheetId)

  await downloadTablePdf({
    title: 'گزارش خودروها',
    headers: [
      'عنوان',
      'کارکرد (km)',
      'VIN',
      'سال ساخت',
      'ظرفیت',
      'پلاک',
      'یادآوری کارکرد',
      'وضعیت'
    ],
    rows: items.map(item => [
      item.title || '—',
      item.mileage.toLocaleString('fa-IR'),
      item.vin || '—',
      item.buildYear || '—',
      item.capacity || '—',
      item.plate ? formatIranPlateLabel(item.plate) : '—',
      getMileageReminderLabel(item.mileageReminderInterval),
      item.active ? 'فعال' : 'غیرفعال'
    ]),
    filename: 'خودرو.pdf'
  })
}

export async function importVehiclesCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(spreadsheetId, VEHICLES_SHEET, VEHICLES_HEADERS, csvContent, cells => {
    const row = vehicleRowFromImportCells(cells)

    if (!row) return null

    return [
      newImportId(row[0] ?? ''),
      newImportTimestamp(row[1] ?? ''),
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10]
    ]
  })
}
