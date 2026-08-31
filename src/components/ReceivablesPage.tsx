import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Receivable } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  addReceivablePayment,
  createReceivable,
  deleteReceivable,
  ensureReceivablesSheet,
  exportReceivablesCsv,
  exportReceivablesPdf,
  fetchReceivables,
  importReceivablesCsv,
  isReceivableComplete,
  paidAmount,
  remainingAmount,
  removeReceivablePayment,
  sortReceivables,
  updateReceivable,
} from '../services/receivables';
import AmountInput from './AmountInput';
import { CategorySelect, Select } from './form';
import { syncCategoriesFromSheet } from '../services/categories';
import { getReceivableCategories } from '../services/settings';
import { InstallmentCardListSkeleton } from './skeleton';
import JalaliDatePicker from './JalaliDatePicker';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import { AccordionCollapse } from './AccordionCollapse';
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import PageHeader from './PageHeader';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import { matchSearch } from '../utils/search';
import {
  formatDateRangeLabel,
  getDateRange,
  isDateInRange,
  RECORDS_DATE_RANGE_PRESETS,
  resolveDateRange,
  type DateRange,
  type RecordsDatePreset,
} from '../utils/dateRange';

type ReceivableWithRow = Receivable & { rowNumber: number };
type PaymentStatusFilter = 'all' | 'paid' | 'unpaid';
type ReceivableDatePreset = 'all' | RecordsDatePreset;

const PAYMENT_STATUS_OPTIONS: { id: PaymentStatusFilter; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'paid', label: 'تسویه شده' },
  { id: 'unpaid', label: 'پرداخت نشده' },
];

export default function ReceivablesPage({ onReauth }: { onReauth?: () => void }) {
  const [items, setItems] = useState<ReceivableWithRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceivableWithRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<ReceivableWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [payingId, setPayingId] = useState('');
  const [togglingPaymentId, setTogglingPaymentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>(() => getReceivableCategories());
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<ReceivableDatePreset>('all');
  const [customRange, setCustomRange] = useState<DateRange>(() =>
    getDateRange('month-to-date')
  );

  const [form, setForm] = useState({
    debtor: '',
    category: '',
    amount: '' as number | '',
    borrowDate: getTodayIso(),
    note: '',
  });
  const [paymentForm, setPaymentForm] = useState<{
    receivableId: string;
    amount: number | '';
    note: string;
  } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadItems = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureReceivablesSheet(settings.spreadsheetId);
      await syncCategoriesFromSheet(settings.spreadsheetId);
      setCategories(getReceivableCategories());
      const data = await fetchReceivables(settings.spreadsheetId);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری طلب‌ها';
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
  }, [loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    if (!form.debtor.trim()) {
      showError('نام شخص یا ارگان الزامی است');
      return;
    }
    if (!form.category.trim()) {
      showError('دسته‌بندی الزامی است');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showError('مبلغ را وارد کنید');
      return;
    }
    if (!form.borrowDate) {
      showError('تاریخ قرض الزامی است');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingItem) {
        const nextAmount = Number(form.amount);
        if (nextAmount < paidAmount(editingItem)) {
          showError('مبلغ نمی‌تواند کمتر از مجموع پرداخت‌ها باشد');
          return;
        }
        const updated = {
          ...editingItem,
          debtor: form.debtor.trim(),
          category: form.category.trim(),
          amount: nextAmount,
          borrowDate: form.borrowDate,
          note: form.note.trim(),
        };
        await updateReceivable(settings.spreadsheetId, editingItem.rowNumber, updated);
        showSuccess('طلب ویرایش شد');
      } else {
        await createReceivable(settings.spreadsheetId, {
          debtor: form.debtor.trim(),
          category: form.category.trim(),
          amount: Number(form.amount),
          borrowDate: form.borrowDate,
          note: form.note.trim(),
        });
        showSuccess('طلب جدید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingItem ? 'خطا در ویرایش طلب' : 'خطا در ثبت طلب';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (receivable: ReceivableWithRow) => {
    if (!paymentForm || paymentForm.receivableId !== receivable.id) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const payAmount = Number(paymentForm.amount);
    if (!payAmount || payAmount <= 0) {
      showError('مبلغ پرداخت را وارد کنید');
      return;
    }

    const remaining = remainingAmount(receivable);
    if (payAmount > remaining) {
      showError(`مبلغ پرداخت نمی‌تواند بیشتر از مانده (${formatMoney(remaining)}) باشد`);
      return;
    }

    setPayingId(receivable.id);
    try {
      const updated = await addReceivablePayment(settings.spreadsheetId, receivable, {
        amount: payAmount,
        note: paymentForm.note.trim(),
      });
      setItems((prev) =>
        sortReceivables(
          prev.map((item) =>
            item.id === receivable.id
              ? { ...updated, rowNumber: receivable.rowNumber }
              : item
          )
        )
      );
      setPaymentForm(null);
      showSuccess('پرداخت ثبت شد');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت پرداخت';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setPayingId('');
    }
  };

  const handleRemovePayment = async (
    receivable: ReceivableWithRow,
    paymentId: string
  ) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setTogglingPaymentId(paymentId);
    try {
      const updated = await removeReceivablePayment(
        settings.spreadsheetId,
        receivable,
        paymentId
      );
      setItems((prev) =>
        sortReceivables(
          prev.map((item) =>
            item.id === receivable.id
              ? { ...updated, rowNumber: receivable.rowNumber }
              : item
          )
        )
      );
      showSuccess('پرداخت و تراکنش درآمد حذف شد');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف پرداخت';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setTogglingPaymentId('');
    }
  };

  const resetCreateForm = () => {
    setForm({
      debtor: '',
      category: categories[0] ?? '',
      amount: '',
      borrowDate: getTodayIso(),
      note: '',
    });
  };

  const openCreateForm = () => {
    setEditingItem(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (item: ReceivableWithRow) => {
    setEditingItem(item);
    setForm({
      debtor: item.debtor,
      category: item.category,
      amount: item.amount,
      borrowDate: item.borrowDate,
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

  const openDeleteConfirm = (item: ReceivableWithRow) => {
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
      await deleteReceivable(settings.spreadsheetId, deletingItem.rowNumber, deletingItem);
      if (expandedId === deletingItem.id) setExpandedId(null);
      setPaymentForm(null);
      setDeletingItem(null);
      showSuccess('طلب حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف طلب';
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
    exportFn: exportReceivablesCsv,
    exportPdfFn: exportReceivablesPdf,
    importFn: importReceivablesCsv,
    onComplete: loadItems,
    onReauth,
  });

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات طلب‌ها',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [loadItems, loading, handleImport, handleExport, handleExportPdf]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

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
            item.debtor,
            item.category,
            item.note,
            item.amount,
            item.borrowDate
          )
        ) {
          return false;
        }

        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false;
        }

        if (dateRange && !isDateInRange(item.borrowDate, dateRange)) {
          return false;
        }

        const complete = isReceivableComplete(item);
        if (paymentStatusFilter === 'paid' && !complete) return false;
        if (paymentStatusFilter === 'unpaid' && complete) return false;

        return true;
      }),
    [
      items,
      searchQuery,
      categoryFilter,
      dateRange,
      paymentStatusFilter,
    ]
  );

  const filteredTotalRemaining = useMemo(
    () => filteredItems.reduce((sum, item) => sum + remainingAmount(item), 0),
    [filteredItems]
  );

  const handleDatePresetClick = (id: ReceivableDatePreset) => {
    if (id === 'all') {
      setDatePreset('all');
      return;
    }
    if (id === 'custom') {
      setDatePreset('custom');
      if (datePreset !== 'custom') {
        setCustomRange(getDateRange('month-to-date'));
      }
      return;
    }
    setDatePreset(id);
    setCustomRange(getDateRange(id));
  };

  const isDatePresetActive = (id: ReceivableDatePreset) => datePreset === id;

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="receivables" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalRemaining = items.reduce((sum, item) => sum + remainingAmount(item), 0);
  const hasFilterActive =
    paymentStatusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    datePreset !== 'all';
  const showFilteredTotal =
    filteredItems.length !== items.length ||
    datePreset !== 'all' ||
    paymentStatusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div>
      <PageHeader
        title="طلب‌ها"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="جستجو در طلب‌ها..."
      />

      {items.length > 0 && (
        <div className="card receivables-filters-card">
          <button
            type="button"
            className={`installment-header receivables-filters-toggle${filtersOpen ? ' installment-header--expanded' : ''}`}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="receivables-filters-panel"
          >
            <div>
              <div className="receivables-filters-title">فیلترها</div>
              {!filtersOpen && hasFilterActive && (
                <p className="records-toolbar-range">فیلتر فعال</p>
              )}
            </div>
            <span className="installment-chevron" aria-hidden="true">▼</span>
          </button>

          <AccordionCollapse open={filtersOpen}>
            <div id="receivables-filters-panel" className="receivables-filters-body">
              <div className="records-filter-section">
                <span className="records-filter-label">وضعیت پرداخت</span>
                <div className="records-date-grid">
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={paymentStatusFilter === option.id ? 'active' : ''}
                      onClick={() => setPaymentStatusFilter(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="records-filter-section records-filter-section--inline">
                <span className="records-filter-label">دسته‌بندی</span>
                <Select
                  className="records-category-select"
                  compact
                  aria-label="دسته‌بندی"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    { value: 'all', label: 'همه' },
                    ...categoryOptions.map((category) => ({
                      value: category,
                      label: category,
                    })),
                  ]}
                />
              </div>

              <div className="records-filter-section">
                <span className="records-filter-label">بازه زمانی (تاریخ قرض)</span>
                <div className="records-date-grid">
                  <button
                    type="button"
                    className={isDatePresetActive('all') ? 'active' : ''}
                    onClick={() => handleDatePresetClick('all')}
                  >
                    همه
                  </button>
                  {RECORDS_DATE_RANGE_PRESETS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={isDatePresetActive(item.id) ? 'active' : ''}
                      onClick={() => handleDatePresetClick(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {datePreset !== 'all' && (
                  <p className="records-toolbar-range receivables-filters-range">
                    {formatDateRangeLabel(dateRange!)}
                  </p>
                )}
              </div>

              {datePreset === 'custom' && (
                <div className="records-custom-range">
                  <div className="records-custom-date">
                    <span className="records-filter-label">از</span>
                    <JalaliDatePicker
                      value={customRange.start}
                      onChange={(start) =>
                        setCustomRange((range) => ({
                          ...range,
                          start,
                          end: start > range.end ? start : range.end,
                        }))
                      }
                    />
                  </div>
                  <div className="records-custom-date">
                    <span className="records-filter-label">تا</span>
                    <JalaliDatePicker
                      value={customRange.end}
                      onChange={(end) =>
                        setCustomRange((range) => ({
                          ...range,
                          end,
                          start: end < range.start ? end : range.start,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionCollapse>
        </div>
      )}

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="receivables" />
        </div>
          <p>هنوز طلبی ثبت نشده</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filteredItems.map((item) => {
          const expanded = expandedId === item.id;
          const paid = paidAmount(item);
          const remaining = remainingAmount(item);
          const complete = isReceivableComplete(item);
          const progress =
            item.amount > 0 ? Math.round((paid / item.amount) * 100) : 0;

          return (
            <div
              key={item.id}
              className={`card installment-card${complete ? ' receivable-complete' : ''}${expanded ? ' installment-card--expanded' : ''}`}
            >
              <div className="card-header-with-edit">
                <button
                  type="button"
                  className={`installment-header${expanded ? ' installment-header--expanded' : ''}`}
                  onClick={() => {
                    setExpandedId(expanded ? null : item.id);
                    setPaymentForm(null);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.debtor}</div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '0.25rem',
                      }}
                    >
                      {item.category && `${item.category} · `}
                      {formatMoney(item.amount)}
                      {complete
                        ? ' · تسویه شده'
                        : ` · مانده: ${formatMoney(remaining)}`}
                    </div>
                    <div className="installment-progress">
                      <div
                        className="installment-progress-bar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="installment-chevron">▼</span>
                </button>
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
                </div>
              </div>

              <AccordionCollapse open={expanded}>
                <div className="installment-payments">
                  {item.note && <p className="installment-note">{item.note}</p>}

                  <div className="receivable-summary">
                    <div>
                      <span className="receivable-summary-label">تاریخ قرض</span>
                      <span>{formatIsoDatePersian(item.borrowDate)}</span>
                    </div>
                    <div>
                      <span className="receivable-summary-label">پرداخت شده</span>
                      <span className="receivable-paid">{formatMoney(paid)}</span>
                    </div>
                    <div>
                      <span className="receivable-summary-label">مانده</span>
                      <span className={complete ? 'receivable-settled' : 'receivable-remaining'}>
                        {formatMoney(remaining)}
                      </span>
                    </div>
                  </div>

                  {item.payments.length > 0 && (
                    <div className="receivable-payment-list">
                      <div className="receivable-payment-list-title">سوابق پرداخت</div>
                      {item.payments.map((payment) => (
                        <div key={payment.id} className="receivable-payment-item">
                          <input
                            type="checkbox"
                            checked
                            disabled={togglingPaymentId === payment.id}
                            onChange={() => handleRemovePayment(item, payment.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <span dir="ltr">{formatMoney(payment.amount)}</span>
                            <span className="installment-due">
                              {formatIsoDatePersian(payment.paidAt)}
                            </span>
                            {payment.note && (
                              <span className="installment-due">{payment.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!complete && (
                    <div className="receivable-add-payment">
                      {paymentForm?.receivableId === item.id ? (
                        <div className="receivable-payment-form">
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>مبلغ پرداخت</label>
                            <AmountInput
                              value={paymentForm.amount}
                              onChange={(val) =>
                                setPaymentForm((f) =>
                                  f ? { ...f, amount: val } : f
                                )
                              }
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>توضیحات</label>
                            <input
                              type="text"
                              value={paymentForm.note}
                              onChange={(e) =>
                                setPaymentForm((f) =>
                                  f ? { ...f, note: e.target.value } : f
                                )
                              }
                              placeholder="اختیاری"
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={payingId === item.id}
                              onClick={() => handleAddPayment(item)}
                            >
                              {payingId === item.id && <span className="spinner" />}
                              ثبت پرداخت
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPaymentForm(null)}
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setPaymentForm({
                              receivableId: item.id,
                              amount: '',
                              note: '',
                            })
                          }
                        >
                          + ثبت پرداخت
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </AccordionCollapse>
            </div>
          );
        })
      )}

      {items.length > 0 && (
        <div className="card receivable-total-card">
          <div className="receivable-total-label">
            {showFilteredTotal ? 'مجموع مانده (فیلتر شده)' : 'مجموع مانده طلب‌ها'}
          </div>
          <div className="receivable-total-amount">
            {formatMoney(showFilteredTotal ? filteredTotalRemaining : totalRemaining)}
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش طلب' : 'ثبت طلب جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طلب'}
      >
        <div className="form-group">
          <label>نام شخص یا ارگان <span className="required">*</span></label>
          <input
            type="text"
            value={form.debtor}
            onChange={(e) => setForm((f) => ({ ...f, debtor: e.target.value }))}
            placeholder="مثلاً: علی محمدی"
          />
        </div>

        <div className="form-group">
          <label>دسته‌بندی <span className="required">*</span></label>
          <CategorySelect
            value={form.category}
            onChange={(category) => setForm((f) => ({ ...f, category }))}
            categories={categories}
            categoryScope="receivable"
            onCategoriesChange={(next) => {
              setCategories(next);
              if (!next.includes(form.category)) {
                setForm((f) => ({ ...f, category: next[0] ?? '' }));
              }
            }}
            onReauth={onReauth}
            aria-label="دسته‌بندی طلب"
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
          <label>تاریخ قرض گرفتن <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.borrowDate}
            onChange={(iso) => setForm((f) => ({ ...f, borrowDate: iso }))}
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
