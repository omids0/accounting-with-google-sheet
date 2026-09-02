import { useCallback, useEffect, useMemo, useState } from 'react'

import { isTokenValid } from '../services/auth'
import { applyNetAvailableConfig, loadDashboardData } from '../services/dashboard'
import {
  getSettings,
  getNetAvailableConfig,
  isConfigured,
  updateNetAvailableConfig
} from '../services/settings'
import type { FinancialSummary, NetAvailableConfig } from '../types'
import MoneyDisplay from './MoneyDisplay'
import ToggleChipGroup from './ToggleChipGroup'
import { getDateRange, getInstallmentDueRange } from '../utils/dateRange'
import { handleSheetError } from '../utils/sheetError'

const ASSET_OPTIONS = [
  { id: 'wallet', label: 'کیف پول' },
  { id: 'treasury', label: 'صندوقچه' },
  { id: 'receivables', label: 'طلب‌ها' }
] as const

const LIABILITY_OPTIONS = [
  { id: 'installments', label: 'اقساط' },
  { id: 'dangs', label: 'بدهی‌ها' },
  { id: 'checks', label: 'چک‌ها' }
] as const

function toAssetSelected(config: NetAvailableConfig): Record<string, boolean> {
  return { ...config.assets }
}

function toLiabilitySelected(config: NetAvailableConfig): Record<string, boolean> {
  return { ...config.liabilities }
}

export default function NetAvailableSettingsPage({ onReauth }: { onReauth?: () => void }) {
  const [config, setConfig] = useState<NetAvailableConfig>(() => getNetAvailableConfig())

  const [financial, setFinancial] = useState<Omit<
    FinancialSummary,
    'totalAssets' | 'totalLiabilities' | 'netAvailable'
  > | null>(null)

  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.()

      return
    }

    const settings = getSettings()

    if (!settings) return

    setLoading(true)
    try {
      const range = getDateRange('month-to-date')

      const dash = await loadDashboardData(
        settings,
        range,
        getInstallmentDueRange('month-to-date'),
        undefined,
        getNetAvailableConfig()
      )

      const { totalAssets: _, totalLiabilities: __, netAvailable: ___, ...raw } = dash.financial

      setFinancial(raw)
    } catch (err) {
      if (handleSheetError(err, { onReauth, fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [onReauth])

  useEffect(() => {
    load()
  }, [load])

  const preview = useMemo(() => {
    if (!financial) return null

    return applyNetAvailableConfig(financial, config)
  }, [financial, config])

  const persistConfig = (next: NetAvailableConfig) => {
    setConfig(next)
    updateNetAvailableConfig(next)
  }

  const toggleAsset = (id: string) => {
    const key = id as keyof NetAvailableConfig['assets']

    persistConfig({
      ...config,
      assets: { ...config.assets, [key]: !config.assets[key] }
    })
  }

  const toggleLiability = (id: string) => {
    const key = id as keyof NetAvailableConfig['liabilities']

    persistConfig({
      ...config,
      liabilities: { ...config.liabilities, [key]: !config.liabilities[key] }
    })
  }

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className="net-available-settings-page">
      <div className="card dashboard-hero-card net-available-preview-card">
        <div className="dashboard-hero-label">پیش‌نمایش دارایی قابل اتکا</div>
        <MoneyDisplay amount={preview?.netAvailable ?? 0} size="hero" tone="hero" />
        <p className="dashboard-hero-hint">بر اساس انتخاب‌های فعلی و وضعیت کنونی حساب</p>
      </div>

      <div className="card">
        <h3 className="chart-title">دارایی‌ها</h3>
        <p className="net-available-section-hint">مواردی که در مجموع دارایی‌ها لحاظ شوند</p>
        <ToggleChipGroup
          options={[...ASSET_OPTIONS]}
          selected={toAssetSelected(config)}
          onToggle={toggleAsset}
          ariaLabel="انتخاب دارایی‌ها"
        />
      </div>

      <div className="card">
        <h3 className="chart-title">بدهی‌ها</h3>
        <p className="net-available-section-hint">مواردی که از دارایی قابل اتکا کسر شوند</p>
        <ToggleChipGroup
          options={[...LIABILITY_OPTIONS]}
          selected={toLiabilitySelected(config)}
          onToggle={toggleLiability}
          ariaLabel="انتخاب بدهی‌ها"
        />
      </div>

      {loading && !financial && <p className="empty-text">در حال بارگذاری...</p>}
    </div>
  )
}
