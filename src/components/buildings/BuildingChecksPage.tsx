import BuildingReadOnly from './BuildingReadOnly'
import ChecksPage from '../checks/ChecksPage'

/**
 * «چک‌ها» of a building: the app's checks page as it is (due dates, passing a check from a fund
 * account in the settle sheet, the cheque photo), read-only for a role without `record`.
 */
export default function BuildingChecksPage({ active = true }: { active?: boolean }) {
  return (
    <BuildingReadOnly permission="record">
      <ChecksPage active={active} />
    </BuildingReadOnly>
  )
}
