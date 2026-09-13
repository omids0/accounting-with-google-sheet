import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { LazyVehicleDetailPage } from './lazyPages'
import { DangCardListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import type { VehicleProfileWithRow } from '../components/vehicles/types'
import { getSettings } from '../services/settings'
import { fetchVehicles } from '../services/vehicleProfiles'
import { handleSheetError } from '../utils/sheetError'

export default function VehicleDetailRoute() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<VehicleProfileWithRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !vehicleId) {
        if (!cancelled) setLoading(false)

        return
      }

      try {
        const items = await fetchVehicles(settings.spreadsheetId)

        if (!cancelled) {
          setVehicle(items.find(item => item.id === vehicleId) ?? null)
          setLoading(false)
        }
      } catch (error) {
        handleSheetError(error)

        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [vehicleId])

  if (loading) {
    return <DangCardListSkeleton filterChips={0} />
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
