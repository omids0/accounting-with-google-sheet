import { useNavigate, useParams } from 'react-router'

import { LazyVehicleDetailPage } from './lazyPages'
import { DangCardListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import type { VehicleProfileWithRow } from '../components/vehicles/types'
import { useRouteRecord } from '../hooks/useRouteRecord'

async function fetchAllVehicles(spreadsheetId: string): Promise<VehicleProfileWithRow[]> {
  const { fetchVehicles } = await import('../services/vehicleProfiles')

  return fetchVehicles(spreadsheetId)
}

export default function VehicleDetailRoute() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const navigate = useNavigate()
  const { record: vehicle, loading } = useRouteRecord(vehicleId, fetchAllVehicles)

  if (loading) {
    return <DangCardListSkeleton filterBar />
  }

  if (!vehicle) {
    return (
      <div className={emptyStateClass}>
        <p>خودرو یافت نشد</p>
        <Button type="button" variant="primary" size="sm" onClick={() => navigate('/vehicles')}>
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return <LazyVehicleDetailPage vehicle={vehicle} />
}
