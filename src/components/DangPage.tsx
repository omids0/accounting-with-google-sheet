import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Dang } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { hasStoreData } from '../services/spreadsheetStore';
import {
  createDang,
  deleteDang,
  ensureDangSheet,
  exportDangsCsv,
  exportDangsPdf,
  fetchDangs,
  importDangsCsv,
  sortDangs,
  toggleDangPaid,
  updateDang,
  unpaidDangTotal,
} from '../services/dang';
import AmountInput from './AmountInput';
import { AccordionCollapse } from './AccordionCollapse';
import CardExpandButton from './CardExpandButton';
import CardInlineAmountEdit from './CardInlineAmountEdit';
import JalaliDatePicker from './JalaliDatePicker';
import { CategorySelect } from './form';
import { syncCategoriesFromSheet } from '../services/categories';
import { getDangCategories } from '../services/settings';
import { DangCardListSkeleton } from './skeleton';
import { distributionSparkline } from '../utils/sparklineData';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import PageFilterPanel, { type PaymentStatusFilter } from './PageFilterPanel';
import FilterModal from './FilterModal';
import ActiveFilterChips from './ActiveFilterChips';
import {
  buildCategoryChip,
  buildDateRangeChip,
  buildPaymentStatusChip,
  buildSearchChip,
  compactFilterChips,
} from '../utils/filterChips';
import {
  createAllDateRangeFilter,
  type AppliedDateRangeFilter,
  type DateRangeFilterPreset,
} from './DateRangeFilter';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import StatCard from './StatCard';
import { matchSearch } from '../utils/search';
import {
  formatDateRangeLabel,
  isDateInRange,
  resolveDateRange,
} from '../utils/dateRange';

type DangWithRow = Dang & { rowNumber: number };

export default function DangPage({
  onReauth,
  active = true,
}: {
  onReauth?: () => void;
  active?: boolean;
}) {
  const [items, setItems] = useState<DangWithRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DangWithRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<DangWithRow | null>(null);
  const [loading, setLoading] = useState(() => {
    const settings = getSettings();
    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId));
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const dataRevision = useDataRefresh();
  const [savingAmountId, setSavingAmountId] = useState('');
  const [amountEdits, setAmountEdits] = useState<Record<string, number | ''>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [draftPaymentStatus, setDraftPaymentStatus] =
    useState<PaymentStatusFilter>('all');
  const [draftCategory, setDraftCategory] = useState('all');
  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  );
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createAllDateRangeFilter().customRange
  );
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => createAllDateRangeFilter().preset
  );
  const [customRange, setCustomRange] = useState(
    () => createAllDateRangeFilter().customRange
  );
  const [categories, setCategories] = useState<string[]>(() => getDangCategories());
  const [form, setForm] = useState({
    title: '',
    category: '',
    counterparty: '',
    amount: '' as number | '',
    date: getTodayIso(),
    note: '',
  });

  const loadItems = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureDangSheet(settings.spreadsheetId);
      await syncCategoriesFromSheet(settings.spreadsheetId);
      setCategories(getDangCategories());
      const data = await fetchDangs(settings.spreadsheetId);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری بدهی‌ها';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [onReauth]);

  useEffect(() => {
    if (isConfigured()) loadItems();
  }, [loadItems, dataRevision]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    if (!form.title.trim()) {
      showError('عنوان الزامی است');
      return;
    }
    if (!form.category.trim()) {
      showError('دسته‌بندی الزامی است');
      return;
    }
    if (!form.counterparty.trim()) {
      showError('طرف حساب الزامی است');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید');
      return;
    }
    if (!form.date) {
      showError('تاریخ الزامی است');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingItem) {
        const updated: Dang = {
          ...editingItem,
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim(),
        };
        await updateDang(settings.spreadsheetId, editingItem.rowNumber, updated);
        showSuccess('بدهی ویرایش شد');
      } else {
        await createDang(settings.spreadsheetId, {
          title: form.title.trim(),
          category: form.category.trim(),
          counterparty: form.counterparty.trim(),
          amount: Number(form.amount),
          date: form.date,
          note: form.note.trim(),
        });
        showSuccess('بدهی جدید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش بدهی' : 'خطا در ثبت بدهی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaid = async (item: DangWithRow, paid: boolean) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setTogglingId(item.id);
    try {
      const updated = await toggleDangPaid(settings.spreadsheetId, item, paid);
      setItems((prev) =>
        sortDangs(
          prev.map((d) =>
            d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d
          )
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setTogglingId('');
    }
  };

  const handleAmountChange = (item: DangWithRow, value: number | '') => {
    setAmountEdits((prev) => ({ ...prev, [item.id]: value }));
  };

  const handleAmountBlur = async (item: DangWithRow) => {
    const pending = amountEdits[item.id];
    if (pending === undefined) return;

    setAmountEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    const amount = Number(pending);
    if (!amount || amount <= 0) {
      showError('مبلغ باید بیشتر از صفر باشد');
      return;
    }
    if (amount === item.amount) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setSavingAmountId(item.id);
    try {
      const updated: Dang = { ...item, amount };
      await updateDang(settings.spreadsheetId, item.rowNumber, updated);
      setItems((prev) =>
        sortDangs(
          prev.map((d) =>
            d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d
          )
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در به‌روزرسانی مبلغ';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSavingAmountId('');
    }
  };

  const resetCreateForm = () => {
    setForm({
      title: '',
      category: categories[0] ?? '',
      counterparty: '',
      amount: '',
      date: getTodayIso(),
      note: '',
    });
  };

  const openCreateForm = () => {
    setEditingItem(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (item: DangWithRow) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      category: item.category,
      counterparty: item.counterparty,
      amount: item.amount,
      date: item.date,
      note: item.note,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingItem(null);
    resetCreateForm();
  };

  const openDeleteConfirm = (item: DangWithRow) => {
    setDeletingItem(item);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeletingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setDeleting(true);
    try {
      await deleteDang(settings.spreadsheetId, deletingItem.rowNumber, deletingItem);
      if (expandedId === deletingItem.id) setExpandedId(null);
      setDeletingItem(null);
      showSuccess('بدهی حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف بدهی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const {
    handleExport,
    handleExportPdf,
    handleImport,
    importExportConfirmModal,
  } = useSheetImportExport({
    exportFn: exportDangsCsv,
    exportPdfFn: exportDangsPdf,
    importFn: importDangsCsv,
    onComplete: loadItems,
    onReauth,
  });

  const dateRange = useMemo(
    () =>
      datePreset === 'all' ? null : resolveDateRange(datePreset, customRange),
    [datePreset, customRange]
  );

  const categoryOptions = useMemo(() => {
    const options = new Set<string>(categories);
    for (const item of items) {
      if (item.category) options.add(item.category);
    }
    return [...options];
  }, [categories, items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (
          !matchSearch(
            searchQuery,
            item.title,
            item.category,
            item.counterparty,
            item.note,
            item.amount,
            item.date
          )
        ) {
          return false;
        }

        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false;
        }

        if (dateRange && !isDateInRange(item.date, dateRange)) {
          return false;
        }

        if (paymentStatusFilter === 'paid' && !item.paid) return false;
        if (paymentStatusFilter === 'unpaid' && item.paid) return false;

        return true;
      }),
    [items, searchQuery, categoryFilter, dateRange, paymentStatusFilter]
  );

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery);
    setDraftPaymentStatus(paymentStatusFilter);
    setDraftCategory(categoryFilter);
    setDraftDatePreset(datePreset);
    setDraftCustomRange(customRange);
    setFilterModalOpen(true);
  }, [
    searchQuery,
    paymentStatusFilter,
    categoryFilter,
    datePreset,
    customRange,
  ]);

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات بدهی',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onFilter: openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [openFilterModal, loadItems, loading, handleImport, handleExport, handleExportPdf]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active);

  const resetDateFilter = useCallback(() => {
    const defaults = createAllDateRangeFilter();
    setDatePreset(defaults.preset);
    setCustomRange(defaults.customRange);
  }, []);

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildSearchChip(searchQuery, () => setSearchQuery('')),
        paymentStatusFilter !== 'all' &&
          buildPaymentStatusChip(paymentStatusFilter, () => setPaymentStatusFilter('all')),
        categoryFilter !== 'all' &&
          buildCategoryChip(categoryFilter, () => setCategoryFilter('all')),
        datePreset !== 'all' &&
          dateRange &&
          buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter),
      ]),
    [
      searchQuery,
      paymentStatusFilter,
      categoryFilter,
      datePreset,
      dateRange,
      resetDateFilter,
    ]
  );

  const handleDraftDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDraftDatePreset(filter.preset);
    setDraftCustomRange(filter.customRange);
  };

  const clearDraftFilters = () => {
    const defaults = createAllDateRangeFilter();
    setDraftSearch('');
    setDraftPaymentStatus('all');
    setDraftCategory('all');
    setDraftDatePreset(defaults.preset);
    setDraftCustomRange(defaults.customRange);
  };

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="debt" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalUnpaid = unpaidDangTotal(items);

  return (
    <div>
      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={() => {
          setSearchQuery(draftSearch);
          setPaymentStatusFilter(draftPaymentStatus);
          setCategoryFilter(draftCategory);
          setDatePreset(draftDatePreset);
          setCustomRange(draftCustomRange);
          setFilterModalOpen(false);
        }}
        onClear={clearDraftFilters}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در بدهی‌ها..."
          paymentStatus={draftPaymentStatus}
          onPaymentStatusChange={setDraftPaymentStatus}
          category={draftCategory}
          onCategoryChange={setDraftCategory}
          categoryOptions={categoryOptions}
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={handleDraftDateFilterChange}
          dateIncludeAll
          dateLoading={loading}
        />
      </FilterModal>

      {loading && items.length === 0 ? (
        <DangCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="debt" />
        </div>
          <p>هنوز بدهی ثبت نشده</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <>
          {filteredItems.map((item) => {
            const expanded = expandedId === item.id;
            const rawAmount =
              amountEdits[item.id] !== undefined ? amountEdits[item.id] : item.amount;
            const displayAmount =
              rawAmount === '' ? item.amount : Number(rawAmount);

            return (
              <div
                key={item.id}
                className={`card dang-card interactive-card${item.paid ? ' paid' : ''}${expanded ? ' installment-card--expanded' : ''}`}
              >
                <input
                  type="checkbox"
                  className="dang-checkbox"
                  checked={item.paid}
                  disabled={togglingId === item.id}
                  onChange={(e) => handleTogglePaid(item, e.target.checked)}
                />
                <div className="dang-card-body">
                  <button
                    type="button"
                    className={`dang-card-tap-area${expanded ? ' dang-card-tap-area--expanded' : ''}`}
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                  >
                    <div className="dang-card-header">
                      <span className="dang-card-title">{item.title}</span>
                      <span className="dang-card-amount" dir="ltr">
                        {formatMoney(displayAmount)}
                      </span>
                    </div>
                    <div className="dang-card-meta">
                      {item.category && `${item.category} · `}
                      طرف حساب: {item.counterparty}
                      {item.date && (
                        <span className="dang-card-date">
                          · {formatIsoDatePersian(item.date)}
                        </span>
                      )}
                    </div>
                    {item.note && <p className="dang-card-note">{item.note}</p>}
                    {item.paid && item.paidAt && (
                      <p className="dang-paid-at">
                        در {item.paidAt} پرداخت شده
                      </p>
                    )}
                  </button>

                  <AccordionCollapse open={expanded}>
                    <div className="dang-card-amount-edit">
                      <CardInlineAmountEdit
                        label="مبلغ"
                        value={
                          amountEdits[item.id] !== undefined
                            ? amountEdits[item.id]
                            : item.amount
                        }
                        onChange={(val) => handleAmountChange(item, val)}
                        onBlur={() => handleAmountBlur(item)}
                        saving={savingAmountId === item.id}
                      />
                    </div>
                  </AccordionCollapse>
                </div>
                <div className="card-action-buttons">
                  <CardEditButton
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditForm(item);
                    }}
                  />
                  <CardDeleteButton
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteConfirm(item);
                    }}
                  />
                  <CardExpandButton
                    expanded={expanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedId(expanded ? null : item.id);
                    }}
                    ariaLabel={expanded ? 'بستن جزئیات' : 'ویرایش مبلغ بدهی'}
                  />
                </div>
              </div>
            );
          })}

          {totalUnpaid > 0 && (
            <StatCard
              label="مانده پرداخت نشده"
              amount={totalUnpaid}
              variant="expense"
              wide
              sparklineData={distributionSparkline(
                items.filter((item) => !item.paid).map((item) => item.amount)
              )}
              className="dang-total-footer"
            />
          )}
        </>
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره بدهی'}
      >
        <div className="form-group">
          <label>عنوان <span className="required">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: خرید از فروشگاه"
          />
        </div>

        <div className="form-group">
          <label>دسته‌بندی <span className="required">*</span></label>
          <CategorySelect
            value={form.category}
            onChange={(category) => setForm((f) => ({ ...f, category }))}
            categories={categories}
            categoryScope="dang"
            onCategoriesChange={(next) => {
              setCategories(next);
              if (!next.includes(form.category)) {
                setForm((f) => ({ ...f, category: next[0] ?? '' }));
              }
            }}
            onReauth={onReauth}
            aria-label="دسته‌بندی بدهی"
          />
        </div>

        <div className="form-group">
          <label>طرف حساب <span className="required">*</span></label>
          <input
            type="text"
            value={form.counterparty}
            onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
            placeholder="نام شخص یا گروه"
          />
        </div>

        <div className="form-group">
          <label>مبلغ <span className="required">*</span></label>
          <AmountInput
            value={form.amount}
            onChange={(val) => setForm((f) => ({ ...f, amount: val }))}
          />
        </div>

        <div className="form-group">
          <label>تاریخ <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.date}
            onChange={(date) => setForm((f) => ({ ...f, date }))}
          />
        </div>

        <div className="form-group">
          <label>توضیحات</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="توضیحات اختیاری"
          />
        </div>
      </FormModal>

      <ConfirmActionModal {...importExportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingItem !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
