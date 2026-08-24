import { useState, useEffect, useCallback, useMemo } from 'react';
import type { VaultAssetType } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import {
  computeHoldings,
  createVaultTransaction,
  deleteVaultTransaction,
  ensureTreasurySheet,
  exportTreasuryCsv,
  exportTreasuryPdf,
  fetchVaultTransactions,
  importTreasuryCsv,
  updateVaultTransaction,
} from '../services/treasury';
import {
  fetchTgjuPrices,
  getAssetLabel,
  getAssetUnit,
  VAULT_ASSET_OPTIONS,
} from '../services/tgju';
import AmountInput from './AmountInput';
import JalaliDatePicker from './JalaliDatePicker';
import { FormSelect } from './form';
import { TreasurySkeleton } from './skeleton';
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
import PageHeader from './PageHeader';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import { matchSearch } from '../utils/search';

type TransactionWithRow = Awaited<ReturnType<typeof fetchVaultTransactions>>[number];

function formatQuantity(qty: number, assetType: VaultAssetType): string {
  const formatted =
    assetType === 'geram18'
      ? qty.toLocaleString('fa-IR', { maximumFractionDigits: 2 })
      : qty.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
  return `${formatted} ${getAssetUnit(assetType)}`;
}

function parseQuantityInput(value: string, allowDecimal: boolean): number | '' {
  const normalized = value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d.]/g, '');

  if (!normalized) return '';
  const num = allowDecimal ? Number(normalized) : Math.trunc(Number(normalized));
  return Number.isFinite(num) && num > 0 ? num : '';
}

export default function TreasuryPage({ onReauth }: { onReauth?: () => void }) {
  const [transactions, setTransactions] = useState<TransactionWithRow[]>([]);
  const [prices, setPrices] = useState<Record<VaultAssetType, number> | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<VaultAssetType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionWithRow | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionWithRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');



  const [sellForm, setSellForm] = useState<{
    assetType: VaultAssetType;
    quantity: number | '';
    unitPrice: number | '';
    transactionDate: string;
    note: string;
  } | null>(null);
  const [sellingAsset, setSellingAsset] = useState<VaultAssetType | null>(null);
  const [form, setForm] = useState({
    assetType: 'sekeb' as VaultAssetType,
    quantity: '' as number | '',
    unitPrice: '' as number | '',
    transactionDate: getTodayIso(),
    note: '',
  });

  const loadPrices = useCallback(async () => {
    setPriceLoading(true);
    try {
      const data = await fetchTgjuPrices();
      setPrices(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در دریافت قیمت‌ها');
    } finally {
      setPriceLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureTreasurySheet(settings.spreadsheetId);
      const data = await fetchVaultTransactions(settings.spreadsheetId);
      setTransactions(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری صندوقچه';
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
    if (isConfigured()) {
      loadItems();
      loadPrices();
    }
  }, [loadItems, loadPrices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const qty = Number(form.quantity);
    if (!qty || qty <= 0) {
      showError('مقدار را وارد کنید');
      return;
    }
    if (!form.unitPrice || Number(form.unitPrice) <= 0) {
      showError('قیمت واحد را وارد کنید');
      return;
    }
    if (!form.transactionDate) {
      showError('تاریخ الزامی است');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingTx) {
        await updateVaultTransaction(settings.spreadsheetId, editingTx.rowNumber, {
          ...editingTx,
          assetType: form.assetType,
          quantity: qty,
          unitPrice: Number(form.unitPrice),
          transactionDate: form.transactionDate,
          note: form.note.trim(),
        });
        showSuccess('خرید ویرایش شد');
      } else {
        await createVaultTransaction(settings.spreadsheetId, {
          assetType: form.assetType,
          action: 'buy',
          quantity: qty,
          unitPrice: Number(form.unitPrice),
          transactionDate: form.transactionDate,
          note: form.note.trim(),
        });
        showSuccess('خرید ثبت شد');
      }
      closeForm();
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingTx ? 'خطا در ویرایش' : 'خطا در ثبت';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSell = async (assetType: VaultAssetType, available: number) => {
    if (!sellForm || sellForm.assetType !== assetType) return;

    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const qty = Number(sellForm.quantity);
    if (!qty || qty <= 0) {
      showError('مقدار فروش را وارد کنید');
      return;
    }
    if (!sellForm.unitPrice || Number(sellForm.unitPrice) <= 0) {
      showError('قیمت فروش را وارد کنید');
      return;
    }
    if (!sellForm.transactionDate) {
      showError('تاریخ فروش الزامی است');
      return;
    }
    if (qty > available) {
      showError(`موجودی کافی نیست. موجودی فعلی: ${formatQuantity(available, assetType)}`);
      return;
    }

    const settings = getSettings()!;
    setSellingAsset(assetType);
    try {
      await createVaultTransaction(settings.spreadsheetId, {
        assetType,
        action: 'sell',
        quantity: qty,
        unitPrice: Number(sellForm.unitPrice),
        transactionDate: sellForm.transactionDate,
        note: sellForm.note.trim(),
      });
      setSellForm(null);
      showSuccess('فروش ثبت شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت فروش';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSellingAsset(null);
    }
  };

  const selectedAsset = VAULT_ASSET_OPTIONS.find((a) => a.value === form.assetType);
  const allowDecimal = form.assetType === 'geram18';
  const holdings = prices ? computeHoldings(transactions, prices) : [];
  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const filteredHoldings = useMemo(
    () =>
      holdings.filter((holding) =>
        matchSearch(
          searchQuery,
          getAssetLabel(holding.assetType),
          holding.netQuantity,
          holding.currentUnitPrice,
          holding.totalValue,
          ...holding.transactions.flatMap((tx) => [tx.note, tx.quantity, tx.unitPrice])
        )
      ),
    [holdings, searchQuery]
  );

  const resetCreateForm = () => {
    setForm({
      assetType: 'sekeb',
      quantity: '',
      unitPrice: '',
      transactionDate: getTodayIso(),
      note: '',
    });
  };

  const openCreateForm = () => {
    setEditingTx(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (tx: TransactionWithRow) => {
    setEditingTx(tx);
    setForm({
      assetType: tx.assetType,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice,
      transactionDate: tx.transactionDate,
      note: tx.note,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingTx(null);
    resetCreateForm();
  };

  const openDeleteConfirm = (tx: TransactionWithRow) => {
    setDeletingTx(tx);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeletingTx(null);
  };

  const handleDelete = async () => {
    if (!deletingTx) return;

    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const settings = getSettings()!;
    setDeleting(true);
    try {
      await deleteVaultTransaction(settings.spreadsheetId, deletingTx.rowNumber);
      setDeletingTx(null);
      showSuccess('تراکنش حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف تراکنش';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const refreshTreasury = useCallback(() => {
    loadItems();
    loadPrices();
  }, [loadItems, loadPrices]);

  const { handleExport, handleExportPdf, handleImport } = useSheetImportExport({
    exportFn: exportTreasuryCsv,
    exportPdfFn: exportTreasuryPdf,
    importFn: importTreasuryCsv,
    onComplete: refreshTreasury,
    onReauth,
  });

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات صندوقچه',
      actions: createPageSpeedDialActions({
        onAdd: () => openCreateForm(),
        onRefresh: refreshTreasury,
        refreshDisabled: loading || priceLoading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [refreshTreasury, loading, priceLoading, handleImport, handleExport, handleExportPdf]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="treasury" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="صندوقچه"
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="جستجو در دارایی‌ها..."
      />

      {prices && (
        <div className="card treasury-price-card">
          <div className="treasury-price-header">
            <span className="treasury-price-title">قیمت لحظه‌ای (tgju.org)</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadPrices}
              disabled={priceLoading}
              style={{ width: 'auto', padding: '0.35rem 0.6rem' }}
            >
              {priceLoading ? '...' : 'بروزرسانی'}
            </button>
          </div>
          <div className="treasury-price-grid">
            {VAULT_ASSET_OPTIONS.map((opt) => (
              <div key={opt.value} className="treasury-price-item">
                <span>
                  {opt.label}
                  {opt.unit !== 'عدد' && opt.unit !== 'دلار' && ` (${opt.unit})`}
                </span>
                <span dir="ltr">{formatMoney(prices[opt.value])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && holdings.length === 0 ? (
        <TreasurySkeleton />
      ) : holdings.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="treasury" />
        </div>
          <p>هنوز دارایی‌ای ثبت نشده</p>
        </div>
      ) : filteredHoldings.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filteredHoldings.map((holding) => {
          const expanded = expandedAsset === holding.assetType;
          const allowDecimal = holding.assetType === 'geram18';
          return (
            <div key={holding.assetType} className={`card installment-card treasury-holding-card${expanded ? ' installment-card--expanded' : ''}`}>
              <button
                type="button"
                className={`installment-header${expanded ? ' installment-header--expanded' : ''}`}
                onClick={() => {
                  setExpandedAsset(expanded ? null : holding.assetType);
                  setSellForm(null);
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {getAssetLabel(holding.assetType)}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {formatQuantity(holding.netQuantity, holding.assetType)}
                    {' · '}
                    قیمت روز: {formatMoney(holding.currentUnitPrice)}
                  </div>
                  <div className="treasury-holding-value">
                    ارزش کل: {formatMoney(holding.totalValue)}
                  </div>
                </div>
                <span className="installment-chevron">▼</span>
              </button>

              <AccordionCollapse open={expanded}>
                <div className="installment-payments">
                  <div className="receivable-payment-list-title">سوابق خرید و فروش</div>
                  {holding.transactions.map((tx) => {
                    const txWithRow = tx as TransactionWithRow;
                    return (
                    <div key={tx.id} className="treasury-tx-item">
                      {tx.action === 'buy' && 'rowNumber' in tx && (
                        <div className="treasury-tx-edit">
                          <div className="card-action-buttons">
                            <CardEditButton onClick={() => openEditForm(txWithRow)} />
                            <CardDeleteButton onClick={() => openDeleteConfirm(txWithRow)} />
                          </div>
                        </div>
                      )}
                      <div className="treasury-tx-main">
                        <span
                          className={`treasury-tx-badge ${tx.action === 'buy' ? 'buy' : 'sell'}`}
                        >
                          {tx.action === 'buy' ? 'خرید' : 'فروش'}
                        </span>
                        <span>{formatQuantity(tx.quantity, tx.assetType)}</span>
                      </div>
                      <div className="treasury-tx-details">
                        <span dir="ltr">
                          {formatMoney(tx.unitPrice)} / {getAssetUnit(tx.assetType)}
                        </span>
                        <span className="installment-due">
                          {formatIsoDatePersian(tx.transactionDate)}
                        </span>
                        {tx.note && (
                          <span className="installment-due">{tx.note}</span>
                        )}
                      </div>
                    </div>
                    );
                  })}

                  <div className="receivable-add-payment">
                    {sellForm?.assetType === holding.assetType ? (
                      <div className="receivable-payment-form">
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label>
                            مقدار فروش ({getAssetUnit(holding.assetType)})
                          </label>
                          <input
                            type="text"
                            inputMode={allowDecimal ? 'decimal' : 'numeric'}
                            dir="ltr"
                            value={sellForm.quantity === '' ? '' : String(sellForm.quantity)}
                            onChange={(e) =>
                              setSellForm((f) =>
                                f
                                  ? {
                                      ...f,
                                      quantity: parseQuantityInput(
                                        e.target.value,
                                        allowDecimal
                                      ),
                                    }
                                  : f
                              )
                            }
                            placeholder={allowDecimal ? 'مثلاً ۱' : 'مثلاً ۱'}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label>
                            قیمت هر {getAssetUnit(holding.assetType)} (تومان)
                          </label>
                          <AmountInput
                            value={sellForm.unitPrice}
                            onChange={(val) =>
                              setSellForm((f) => (f ? { ...f, unitPrice: val } : f))
                            }
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label>تاریخ فروش</label>
                          <JalaliDatePicker
                            value={sellForm.transactionDate}
                            onChange={(iso) =>
                              setSellForm((f) =>
                                f ? { ...f, transactionDate: iso } : f
                              )
                            }
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label>توضیحات</label>
                          <input
                            type="text"
                            value={sellForm.note}
                            onChange={(e) =>
                              setSellForm((f) =>
                                f ? { ...f, note: e.target.value } : f
                              )
                            }
                            placeholder="اختیاری"
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-outflow btn-sm"
                            disabled={sellingAsset === holding.assetType}
                            onClick={() =>
                              handleSell(holding.assetType, holding.netQuantity)
                            }
                          >
                            {sellingAsset === holding.assetType && (
                              <span className="spinner" />
                            )}
                            ثبت فروش
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSellForm(null)}
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
                          setSellForm({
                            assetType: holding.assetType,
                            quantity: '',
                            unitPrice: '',
                            transactionDate: getTodayIso(),
                            note: '',
                          })
                        }
                      >
                        + ثبت فروش
                      </button>
                    )}
                  </div>
                </div>
              </AccordionCollapse>
            </div>
          );
        })
      )}

      {holdings.length > 0 && (
        <div className="card receivable-total-card treasury-total-card">
          <div className="receivable-total-label">ارزش کل صندوقچه (بر اساس قیمت روز)</div>
          <div className="receivable-total-amount">{formatMoney(totalValue)}</div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editingTx ? 'ویرایش خرید' : 'ثبت خرید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingTx ? 'ذخیره تغییرات' : 'ذخیره خرید'}
        saveButtonClassName="btn btn-outflow"
      >
        <FormSelect
          label="نوع دارایی"
          required
          value={form.assetType}
          onChange={(next) =>
            setForm((f) => ({
              ...f,
              assetType: next as VaultAssetType,
              quantity: '',
            }))
          }
          options={VAULT_ASSET_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          hint={
            selectedAsset?.hint ? (
              <p className="treasury-hint">{selectedAsset.hint}</p>
            ) : undefined
          }
        />

        <div className="form-group">
          <label>
            مقدار ({getAssetUnit(form.assetType)}) <span className="required">*</span>
          </label>
          <input
            type="text"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            dir="ltr"
            value={form.quantity === '' ? '' : String(form.quantity)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                quantity: parseQuantityInput(e.target.value, allowDecimal),
              }))
            }
            placeholder={allowDecimal ? 'مثلاً ۲.۵' : 'مثلاً ۳'}
          />
        </div>

        <div className="form-group">
          <label>
            قیمت هر {getAssetUnit(form.assetType)} (تومان) <span className="required">*</span>
          </label>
          <AmountInput
            value={form.unitPrice}
            onChange={(val) => setForm((f) => ({ ...f, unitPrice: val }))}
          />
        </div>

        <div className="form-group">
          <label>تاریخ خرید <span className="required">*</span></label>
          <JalaliDatePicker
            value={form.transactionDate}
            onChange={(iso) => setForm((f) => ({ ...f, transactionDate: iso }))}
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

      <ConfirmDeleteModal
        open={deletingTx !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
