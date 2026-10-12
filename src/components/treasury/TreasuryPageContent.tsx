import { useCallback, useMemo, useState } from 'react'

import { useIsDesktop } from '../../hooks/useMediaQuery'
import { isConfigured } from '../../services/settings'
import { isBuiltinAsset } from '../../services/treasuryCatalog'
import type { VaultAsset } from '../../types'
import { cn } from '../../utils/cn'
import { distributionSparkline } from '../../utils/sparklineData'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import EmptyState from '../EmptyState'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { TreasurySkeleton } from '../skeleton'
import StatCard from '../StatCard'
import SavingsGoalsSection from './SavingsGoalsSection'
import TreasuryAssetFormModal from './TreasuryAssetFormModal'
import TreasuryBuyFormModal from './TreasuryBuyFormModal'
import TreasuryClassChips from './TreasuryClassChips'
import TreasuryHoldingCard from './TreasuryHoldingCard'
import TreasuryHoldingList from './TreasuryHoldingList'
import TreasuryHoldingTable from './TreasuryHoldingTable'
import TreasuryPriceCard from './TreasuryPriceCard'
import { useSavingsGoals } from './useSavingsGoals'
import { useTreasuryClassFilter } from './useTreasuryClassFilter'
import { useTreasuryData } from './useTreasuryData'
import { useTreasuryFilters } from './useTreasuryFilters'
import { useTreasuryForms } from './useTreasuryForms'
import { useTreasuryHighlight } from './useTreasuryHighlight'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'
import { receivableTotalCardClass, treasuryTotalCardClass } from '../ui/treasuryReceivableStyles'

export default function TreasuryPageContent({ active = true }: { active?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingAsset, setEditingAsset] = useState<VaultAsset | null>(null)
  const isDesktop = useIsDesktop()

  const data = useTreasuryData(active, searchQuery)

  const classFilter = useTreasuryClassFilter(data.holdings, data.searchedHoldings)

  const goals = useSavingsGoals(active)
  const { setEditing: setEditingGoal } = goals
  const openGoalForm = useCallback(() => setEditingGoal('new'), [setEditingGoal])

  useTreasuryHighlight({
    holdings: data.holdings,
    goals: goals.goals,
    selected: classFilter.selected,
    select: classFilter.select,
    expandHolding: data.setExpandedAsset
  })

  const forms = useTreasuryForms(
    data.loadItems,
    data.transactions,
    data.undoableDelete,
    data.reloadCatalog
  )

  const filters = useTreasuryFilters(
    active,
    data.refreshTreasury,
    data.loading,
    data.priceLoading,
    forms.openCreateForm,
    searchQuery,
    setSearchQuery,
    openGoalForm
  )

  // tgju quotes for the class: the original seven plus any asset the user holds.
  const priceAssets = useMemo(() => {
    const held = new Set(data.holdings.map(holding => holding.assetType))

    return data.catalog.filter(
      asset =>
        asset.priceSource === 'tgju' &&
        (!classFilter.assetClass || asset.assetClass === classFilter.assetClass) &&
        ((isBuiltinAsset(asset.id) && asset.assetClass === 'gold') ||
          asset.id === 'usd' ||
          held.has(asset.id))
    )
  }, [data.catalog, data.holdings, classFilter.assetClass])

  const handleToggleHolding = (assetType: string) => {
    const expanded = data.expandedAsset === assetType

    data.setExpandedAsset(expanded ? null : assetType)
    forms.closeSellForm()
  }

  const renderHolding = (holding: (typeof data.holdings)[number], bodyOnly = false) => (
    <TreasuryHoldingCard
      key={holding.assetType}
      holding={holding}
      expanded={bodyOnly || data.expandedAsset === holding.assetType}
      bodyOnly={bodyOnly}
      activeSellAsset={forms.activeSellAsset}
      sellingAsset={forms.sellingAsset}
      onToggle={() => handleToggleHolding(holding.assetType)}
      onEdit={forms.openEditForm}
      onDelete={forms.requestDelete}
      onOpenSellForm={forms.openSellForm}
      onCloseSellForm={forms.closeSellForm}
      onSell={forms.handleSell}
      onEditAsset={setEditingAsset}
    />
  )

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="treasury" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  const { visibleHoldings } = classFilter
  const hasGoals = goals.visibleGoals.length > 0
  // The «هدف‌ها» chip disappears with the last open goal; «همه» takes over then.
  const goalsOnly = classFilter.selected === 'goals' && hasGoals
  const chipValue = classFilter.selected === 'goals' && !hasGoals ? 'all' : classFilter.selected
  const inAll = !goalsOnly && classFilter.assetClass == null
  const hasAnything = data.holdings.length > 0 || hasGoals
  const total = goalsOnly
    ? {
        label: 'جمع هدف‌ها',
        amount: goals.total,
        parts: goals.visibleGoals.map(goal => goal.balance)
      }
    : {
        label: classFilter.totalLabel,
        amount: classFilter.classTotal + (inAll ? goals.total : 0),
        parts: classFilter.classHoldings.map(holding => holding.totalValue)
      }

  return (
    <div className={listModulePageClass}>
      <ActiveFilterChips
        chips={filters.filterChips}
        onOpenFilters={filters.openFilterModal}
        onClearAll={filters.clearAllFilters}
        inHeader
      />

      <FilterModal
        open={filters.filterModalOpen}
        onClose={() => filters.setFilterModalOpen(false)}
        onApply={() => {
          setSearchQuery(filters.draftSearch)
          filters.setFilterModalOpen(false)
        }}
        onClear={() => filters.setDraftSearch('')}
      >
        <PageFilterPanel
          search={filters.draftSearch}
          onSearchChange={filters.setDraftSearch}
          searchPlaceholder="جستجو در دارایی‌ها..."
        />
      </FilterModal>

      {hasAnything && (
        <TreasuryClassChips
          counts={classFilter.counts}
          goalsCount={goals.visibleGoals.length}
          value={chipValue}
          onChange={classFilter.select}
        />
      )}

      {data.prices && !goalsOnly && (
        <TreasuryPriceCard
          prices={data.prices}
          assets={priceAssets}
          priceLoading={data.priceLoading}
          onRefresh={data.loadPrices}
        />
      )}

      {(inAll || goalsOnly) && <SavingsGoalsSection goals={goals} goalsOnly={goalsOnly} />}

      {goalsOnly ? null : data.loading && data.holdings.length === 0 ? (
        <TreasurySkeleton />
      ) : data.holdings.length === 0 ? (
        hasGoals ? null : (
          <EmptyState
            icon="treasury"
            description="پس‌انداز هدف‌دار: طلا، ارز، سهام، رمزارز یا هر دارایی دیگری را جدا از حساب‌های روزمره دنبال کن."
            message="هنوز دارایی‌ای ثبت نشده"
            action={{ label: 'افزودن دارایی', onClick: () => forms.openCreateForm() }}
          />
        )
      ) : visibleHoldings.length === 0 ? (
        <SearchEmptyState />
      ) : isDesktop ? (
        <TreasuryHoldingTable
          holdings={visibleHoldings}
          expandedAsset={data.expandedAsset}
          onToggle={holding => handleToggleHolding(holding.assetType)}
          renderDetail={holding => renderHolding(holding, true)}
          counts={classFilter.counts}
          classFilter={classFilter.selected}
          onClassFilterChange={classFilter.select}
        />
      ) : (
        <TreasuryHoldingList
          groups={classFilter.groups}
          grouped={classFilter.assetClass == null}
          renderHolding={holding => renderHolding(holding)}
        />
      )}

      {hasAnything && (
        <StatCard
          label={total.label}
          amount={total.amount}
          variant="balance"
          wide
          sparklineData={distributionSparkline(total.parts)}
          className={cn(receivableTotalCardClass, treasuryTotalCardClass)}
        />
      )}

      <TreasuryBuyFormModal
        open={forms.showForm}
        editingTx={forms.editingTx}
        catalog={data.catalog}
        defaultClass={classFilter.assetClass ?? 'gold'}
        saving={forms.saving}
        onClose={forms.closeForm}
        onSubmit={forms.handleSubmit}
      />

      <TreasuryAssetFormModal
        asset={editingAsset}
        onClose={() => setEditingAsset(null)}
        onSaved={data.reloadCatalog}
      />

      <ConfirmActionModal {...filters.importExportConfirmModal} />
    </div>
  )
}
