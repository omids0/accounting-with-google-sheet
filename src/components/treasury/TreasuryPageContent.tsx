import { useState } from 'react'

import { useIsDesktop } from '../../hooks/useMediaQuery'
import { isConfigured } from '../../services/settings'
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
import TreasuryBuyFormModal from './TreasuryBuyFormModal'
import TreasuryHoldingCard from './TreasuryHoldingCard'
import TreasuryHoldingTable from './TreasuryHoldingTable'
import TreasuryPriceCard from './TreasuryPriceCard'
import { useTreasuryData } from './useTreasuryData'
import { useTreasuryFilters } from './useTreasuryFilters'
import { useTreasuryForms } from './useTreasuryForms'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listCardsContainerClass, listModulePageClass } from '../ui/featureCardStyles'
import { receivableTotalCardClass, treasuryTotalCardClass } from '../ui/treasuryReceivableStyles'

export default function TreasuryPageContent({ active = true }: { active?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')
  const isDesktop = useIsDesktop()

  const data = useTreasuryData(active, searchQuery)

  const forms = useTreasuryForms(data.loadItems, data.transactions, data.undoableDelete)

  const filters = useTreasuryFilters(
    active,
    data.refreshTreasury,
    data.loading,
    data.priceLoading,
    forms.openCreateForm,
    searchQuery,
    setSearchQuery
  )

  const handleToggleHolding = (assetType: Parameters<typeof data.setExpandedAsset>[0]) => {
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

      {data.prices && (
        <TreasuryPriceCard
          prices={data.prices}
          priceLoading={data.priceLoading}
          onRefresh={data.loadPrices}
        />
      )}

      {data.loading && data.holdings.length === 0 ? (
        <TreasurySkeleton />
      ) : data.holdings.length === 0 ? (
        <EmptyState
          icon="treasury"
          description="پس‌انداز هدف‌دار: طلا، ارز یا پولی که کنار گذاشته‌ای را جدا از حساب‌های روزمره دنبال کن."
          message="هنوز دارایی‌ای ثبت نشده"
          action={{ label: 'افزودن دارایی', onClick: () => forms.openCreateForm() }}
        />
      ) : data.filteredHoldings.length === 0 ? (
        <SearchEmptyState />
      ) : isDesktop ? (
        <TreasuryHoldingTable
          holdings={data.filteredHoldings}
          expandedAsset={data.expandedAsset}
          onToggle={holding => handleToggleHolding(holding.assetType)}
          renderDetail={holding => renderHolding(holding, true)}
        />
      ) : (
        <div className={listCardsContainerClass}>
          {data.filteredHoldings.map(holding => renderHolding(holding))}
        </div>
      )}

      {data.holdings.length > 0 && (
        <StatCard
          label="ارزش کل صندوقچه (بر اساس قیمت روز)"
          amount={data.totalValue}
          variant="balance"
          wide
          sparklineData={distributionSparkline(data.holdings.map(holding => holding.totalValue))}
          className={cn(receivableTotalCardClass, treasuryTotalCardClass)}
        />
      )}

      <TreasuryBuyFormModal
        open={forms.showForm}
        editingTx={forms.editingTx}
        saving={forms.saving}
        onClose={forms.closeForm}
        onSubmit={forms.handleSubmit}
      />

      <ConfirmActionModal {...filters.importExportConfirmModal} />
    </div>
  )
}
