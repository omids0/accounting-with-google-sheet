import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WalletAccount } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { hasStoreData } from '../services/spreadsheetStore';
import {
  createWalletAccount,
  deleteWalletAccount,
  ensureWalletSheet,
  exportWalletAccountsCsv,
  exportWalletAccountsPdf,
  fetchWalletAccounts,
  importWalletAccountsCsv,
  loadWalletPeriodFlow,
  updateWalletAccount,
  type WalletPeriodFlow,
} from '../services/wallet';
import {
  ensureAutoOpeningBalanceForCurrentMonth,
  setOpeningBalance,
} from '../services/monthlyBalance';
import AmountInput from './AmountInput';
import CardInlineAmountEdit from './CardInlineAmountEdit';
import { formatMoney } from '../utils/formatMoney';
import { distributionSparkline, flowTrendSparkline } from '../utils/sparklineData';
import { WalletPageSkeleton } from './skeleton';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import CardDeleteButton from './CardDeleteButton';
import CardExpandButton from './CardExpandButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import { AccordionCollapse } from './AccordionCollapse';
import PageFilterPanel from './PageFilterPanel';
import FilterModal from './FilterModal';
import ActiveFilterChips from './ActiveFilterChips';
import { buildSearchChip, compactFilterChips } from '../utils/filterChips';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import StatCard from './StatCard';
import { matchSearch } from '../utils/search';

type WalletAccountWithRow = WalletAccount & { rowNumber: number };

export default function WalletPage({
  onReauth,
  onOpenOpeningBalances,
  active = true,
}: {
  onReauth?: () => void;
  onOpenOpeningBalances?: () => void;
  active?: boolean;
}) {
  const [items, setItems] = useState<WalletAccountWithRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number | ''>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openingExpanded, setOpeningExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<WalletAccountWithRow | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<WalletAccountWithRow | null>(null);
  const [loading, setLoading] = useState(() => {
    const settings = getSettings();
    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId));
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingId, setSavingId] = useState('');
  const dataRevision = useDataRefresh();

  const [form, setForm] = useState({
    title: '',
    balance: '' as number | '',
    note: '',
  });
  const [periodFlow, setPeriodFlow] = useState<WalletPeriodFlow | null>(null);
  const [openingInput, setOpeningInput] = useState<number | ''>('');
  const [savingOpening, setSavingOpening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');

  const syncBalances = useCallback((accounts: WalletAccountWithRow[]) => {
    const next: Record<string, number | ''> = {};
    for (const account of accounts) {
      next[account.id] = account.balance;
    }
    setBalances(next);
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
      await ensureWalletSheet(settings.spreadsheetId);
      const data = await fetchWalletAccounts(settings.spreadsheetId);
      const walletTotal = data.reduce((sum, item) => sum + item.balance, 0);
      await ensureAutoOpeningBalanceForCurrentMonth(
        settings.spreadsheetId,
        walletTotal
      );
      const flow = await loadWalletPeriodFlow(settings);
      setItems(data);
      syncBalances(data);
      setPeriodFlow(flow);
      setOpeningInput(flow.openingBalance || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری کیف پول';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [onReauth, syncBalances]);

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
    if (form.balance === '' || Number(form.balance) < 0) {
      showError('موجودی را وارد کنید');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingAccount) {
        await updateWalletAccount(settings.spreadsheetId, {
          ...editingAccount,
          title: form.title.trim(),
          balance: Number(form.balance),
          note: form.note.trim(),
        });
        showSuccess('حساب ویرایش شد');
        await loadItems();
      } else {
        await createWalletAccount(settings.spreadsheetId, {
          title: form.title.trim(),
          balance: Number(form.balance),
          note: form.note.trim(),
        });
        showSuccess('حساب جدید اضافه شد');
        await loadItems();
      }
      closeForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : editingAccount ? 'خطا در ویرایش حساب' : 'خطا در ثبت حساب';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBalanceSave = async (account: WalletAccountWithRow) => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const nextBalance = balances[account.id];
    if (nextBalance === '' || nextBalance < 0) {
      showError('موجودی نامعتبر است');
      syncBalances([account]);
      return;
    }
    if (nextBalance === account.balance) return;

    setSavingId(account.id);
    try {
      const updated = await updateWalletAccount(settings.spreadsheetId, {
        ...account,
        balance: nextBalance,
      });
      setItems((prev) =>
        prev
          .map((item) =>
            item.id === account.id ? { ...updated, rowNumber: account.rowNumber } : item
          )
          .sort((a, b) => b.balance - a.balance)
      );
      showSuccess(`موجودی «${account.title}» ذخیره شد`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره موجودی';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
      syncBalances([account]);
    } finally {
      setSavingId('');
    }
  };

  const handleSaveOpeningBalance = async () => {
    if (!periodFlow) return;
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setSavingOpening(true);
    try {
      const amount = openingInput === '' ? 0 : Number(openingInput);
      await setOpeningBalance(settings.spreadsheetId, periodFlow.monthKey, amount);
      const flow = await loadWalletPeriodFlow(settings);
      setPeriodFlow(flow);
      setOpeningInput(flow.openingBalance || '');
      showSuccess('موجودی اول دوره ذخیره شد');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره موجودی اول';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSavingOpening(false);
    }
  };

  const resetCreateForm = () => {
    setForm({ title: '', balance: '', note: '' });
  };

  const openCreateForm = () => {
    setEditingAccount(null);
    resetCreateForm();
    setShowForm(true);
  };

  const openEditForm = (account: WalletAccountWithRow) => {
    setEditingAccount(account);
    setForm({
      title: account.title,
      balance: account.balance,
      note: account.note,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingAccount(null);
    resetCreateForm();
  };

  const openDeleteConfirm = (account: WalletAccountWithRow) => {
    setDeletingAccount(account);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeletingAccount(null);
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;

    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    setDeleting(true);
    try {
      await deleteWalletAccount(settings.spreadsheetId, deletingAccount.rowNumber);
      if (expandedId === deletingAccount.id) setExpandedId(null);
      setDeletingAccount(null);
      showSuccess('حساب حذف شد');
      await loadItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در حذف حساب';
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
    exportFn: exportWalletAccountsCsv,
    exportPdfFn: exportWalletAccountsPdf,
    importFn: importWalletAccountsCsv,
    onComplete: loadItems,
    onReauth,
  });

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery);
    setFilterModalOpen(true);
  }, [searchQuery]);

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: 'عملیات کیف پول',
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

  const filteredItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.balance - a.balance);
    if (!searchQuery.trim()) return sorted;
    return sorted.filter((item) =>
      matchSearch(searchQuery, item.title, item.note, item.balance)
    );
  }, [items, searchQuery]);

  const filterChips = useMemo(
    () => compactFilterChips([buildSearchChip(searchQuery, () => setSearchQuery(''))]),
    [searchQuery]
  );

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="wallet" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  const totalBalance = items.reduce((sum, item) => {
    const value = balances[item.id];
    return sum + (value === '' ? item.balance : Number(value));
  }, 0);

  const periodBalance =
    periodFlow != null
      ? periodFlow.openingBalance + periodFlow.totalIncome - periodFlow.totalExpense
      : 0;
  const reconciliationDiff = totalBalance - periodBalance;
  const hasReconciliationGap = periodFlow != null && Math.abs(reconciliationDiff) > 0;
  const displayOpeningBalance =
    openingInput === '' ? periodFlow?.openingBalance ?? 0 : Number(openingInput);


  return (
    <div>
      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={() => {
          setSearchQuery(draftSearch);
          setFilterModalOpen(false);
        }}
        onClear={() => setDraftSearch('')}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در حساب‌ها..."
        />
      </FilterModal>

      {periodFlow && (
        <div className={`card installment-card interactive-card dashboard-opening-card wallet-item-card${openingExpanded ? ' installment-card--expanded' : ''}`}>
          <button
            type="button"
            className={`installment-header wallet-item-header${openingExpanded ? ' installment-header--expanded' : ''}`}
            onClick={() => setOpeningExpanded((v) => !v)}
          >
            <div className="wallet-item-info">
              <div className="wallet-item-title-row">
                <div className="list-card-title">موجودی اول دوره</div>
                <div className="wallet-item-amount list-card-amount-pill" dir="ltr">
                  {formatMoney(displayOpeningBalance)}
                </div>
              </div>
              <div className="wallet-item-note list-card-subtitle">ابتدای {periodFlow.monthLabel}</div>
            </div>
            <span className="installment-chevron">▼</span>
          </button>

          <AccordionCollapse open={openingExpanded}>
            <div className="installment-payments dashboard-opening-body">
              <p className="dashboard-opening-hint">
                موجودی کیف پول در ابتدای {periodFlow.monthLabel} را وارد کنید.
                با خالص دوره (درآمد − هزینه) جمع می‌شود تا با کیف پول فعلی تطبیق دهید.
              </p>
              <div className="dashboard-opening-form">
                <div className="dashboard-opening-input-wrap">
                  <AmountInput value={openingInput} onChange={setOpeningInput} />
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveOpeningBalance}
                  disabled={savingOpening || loading}
                >
                  {savingOpening ? '...' : 'ذخیره'}
                </button>
              </div>
              {onOpenOpeningBalances && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm wallet-opening-more-btn"
                  onClick={onOpenOpeningBalances}
                >
                  گزینه‌های بیشتر
                </button>
              )}
            </div>
          </AccordionCollapse>
        </div>
      )}

      {loading && items.length === 0 ? (
        <WalletPageSkeleton />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
          <AppIcon name="wallet" />
        </div>
          <p>هنوز حسابی ثبت نشده</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filteredItems.map((account) => {
          const expanded = expandedId === account.id;
          const rawBalance = balances[account.id] ?? account.balance;
          const displayBalance = rawBalance === '' ? account.balance : Number(rawBalance);

          return (
            <div key={account.id} className={`card installment-card interactive-card wallet-item-card${expanded ? ' installment-card--expanded' : ''}`}>
              <div className="card-header-with-edit">
                <button
                  type="button"
                  className={`installment-header wallet-item-header${expanded ? ' installment-header--expanded' : ''}`}
                  onClick={() => setExpandedId(expanded ? null : account.id)}
                >
                  <div className="wallet-item-info">
                    <div className="wallet-item-title-row">
                      <div className="list-card-title">{account.title}</div>
                      <div className="wallet-item-amount list-card-amount-pill" dir="ltr">
                        {formatMoney(displayBalance)}
                      </div>
                    </div>
                    {account.note && (
                      <div className="wallet-item-note list-card-subtitle">{account.note}</div>
                    )}
                  </div>
                </button>
                <div className="card-action-buttons">
                  <CardEditButton
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditForm(account);
                    }}
                  />
                  <CardDeleteButton
                    onClick={(event) => {
                      event.stopPropagation();
                      openDeleteConfirm(account);
                    }}
                  />
                  <CardExpandButton
                    expanded={expanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedId(expanded ? null : account.id);
                    }}
                    ariaLabel={expanded ? 'بستن جزئیات' : 'نمایش جزئیات حساب'}
                  />
                </div>
              </div>

              <AccordionCollapse open={expanded}>
                <div className="installment-payments wallet-item-edit">
                  <CardInlineAmountEdit
                    label="موجودی"
                    value={balances[account.id] ?? account.balance}
                    onChange={(val) =>
                      setBalances((prev) => ({ ...prev, [account.id]: val }))
                    }
                    onBlur={() => handleBalanceSave(account)}
                    onClose={() => setExpandedId(null)}
                    saving={savingId === account.id}
                  />
                </div>
              </AccordionCollapse>
            </div>
          );
        })
      )}

      {items.length > 0 && (
        <StatCard
          label="مجموع کل حساب‌ها"
          amount={totalBalance}
          variant="balance"
          wide
          sparklineData={
            periodFlow
              ? flowTrendSparkline(
                  periodFlow.openingBalance,
                  periodFlow.totalIncome,
                  periodFlow.totalExpense
                )
              : distributionSparkline(items.map((item) => item.balance))
          }
          className="receivable-total-card"
        />
      )}

      {hasReconciliationGap && (
        <div
          className={`alert ${
            Math.abs(reconciliationDiff) > 10000 ? 'alert-warning' : 'alert-info'
          } dashboard-reconcile-alert`}
        >
          <strong>تطبیق کیف پول</strong>
          <p>
            کیف پول فعلی ({formatMoney(totalBalance)}) با مانده محاسبه‌شده (
            {formatMoney(periodBalance)}) {reconciliationDiff > 0 ? 'بیشتر' : 'کمتر'} است.
          </p>
          <p dir="ltr" className="reconcile-diff">
            اختلاف: {formatMoney(Math.abs(reconciliationDiff))}
            {reconciliationDiff > 0 ? ' +' : ' −'}
          </p>
          <p className="dashboard-reconcile-formula">
            موجودی اول + درآمد − هزینه = مانده محاسبه‌شده
          </p>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editingAccount ? 'ویرایش حساب' : 'حساب جدید'}
        onClose={closeForm}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingAccount ? 'ذخیره تغییرات' : 'ذخیره حساب'}
      >
        <div className="form-group">
          <label>عنوان <span className="required">*</span></label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="مثلاً: بانک ملت، نقدی، ..."
          />
        </div>

        <div className="form-group">
          <label>موجودی <span className="required">*</span></label>
          <AmountInput
            value={form.balance}
            onChange={(val) => setForm((f) => ({ ...f, balance: val }))}
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
        open={deletingAccount !== null}
        message="از حذف این مورد مطمئن هستید؟"
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
