import { useState } from 'react'

import { isConfigured } from '../../services/settings'
import { distributionSparkline } from '../../utils/sparklineData'
import ActiveFilterChips from '../ActiveFilterChips'
import AppIcon from '../AppIcon'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import FilterModal from '../FilterModal'
import PageFilterPanel from '../PageFilterPanel'
import SearchEmptyState from '../SearchEmptyState'
import { TreasurySkeleton } from '../skeleton'
import StatCard from '../StatCard'
import TreasuryBuyFormModal from './TreasuryBuyFormModal'
import TreasuryHoldingCard from './TreasuryHoldingCard'
import TreasuryPriceCard from './TreasuryPriceCard'
import { useTreasuryData } from './useTreasuryData'
import { useTreasuryFilters } from './useTreasuryFilters'
import { useTreasuryForms } from './useTreasuryForms'

export default function TreasuryPageContent({ active = true }: { active?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')

  const data = useTreasuryData(active, searchQuery)

  const forms = useTreasuryForms(data.loadItems)

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

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="treasury" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div>
      <ActiveFilterChips chips={filters.filterChips} onChipClick={filters.openFilterModal} />

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
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="treasury" />
          </div>
          <p>هنوز دارایی‌ای ثبت نشده</p>
        </div>
      ) : data.filteredHoldings.length === 0 ? (
        <SearchEmptyState />
      ) : (
        data.filteredHoldings.map(holding => (
          <TreasuryHoldingCard
            key={holding.assetType}
            holding={holding}
            expanded={data.expandedAsset === holding.assetType}
            activeSellAsset={forms.activeSellAsset}
            sellingAsset={forms.sellingAsset}
            onToggle={() => handleToggleHolding(holding.assetType)}
            onEdit={forms.openEditForm}
            onDelete={forms.openDeleteConfirm}
            onOpenSellForm={forms.openSellForm}
            onCloseSellForm={forms.closeSellForm}
            onSell={forms.handleSell}
          />
        ))
      )}

      {data.holdings.length > 0 && (
        <StatCard
          label="ارزش کل صندوقچه (بر اساس قیمت روز)"
          amount={data.totalValue}
          variant="balance"
          wide
          sparklineData={distributionSparkline(data.holdings.map(holding => holding.totalValue))}
          className="receivable-total-card treasury-total-card"
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

      <ConfirmDeleteModal
        open={forms.deletingTx !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={forms.closeDeleteConfirm}
        onConfirm={forms.handleDelete}
        deleting={forms.deleting}
      />
    </div>
  )
}
