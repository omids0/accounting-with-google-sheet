import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Timesheet, TimesheetEntry } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { isTokenValid } from '../services/auth';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { hasStoreData } from '../services/spreadsheetStore';
import {
  createTimesheetEntry,
  deleteTimesheetEntry,
  ensureTimesheetEntriesSheet,
  exportTimesheetEntriesCsv,
  exportTimesheetEntriesPdf,
  fetchTimesheetEntries,
  importTimesheetEntriesCsv,
  totalDurationMinutes,
  updateTimesheetEntry,
} from '../services/timesheet';
import {
  calcDurationMinutes,
  formatDateTimePersian,
  formatDurationFa,
  formatJiraTimesheetHours,
  getNowDateTimeIso,
  addMinutesToDateTime,
  syncEndDateTimeFromStart,
  clampDateTimeToMin,
} from '../utils/datetime';
import { InstallmentCardListSkeleton } from './skeleton';
import { showError, showSuccess } from '../utils/toast';
import { useRegisterPageSpeedDial } from '../hooks/usePageSpeedDial';
import { createPageSpeedDialActions } from '../hooks/pageSpeedDialActions';
import { useSheetImportExport } from '../hooks/useSheetImportExport';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';
import CardDeleteButton from './CardDeleteButton';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmActionModal from './ConfirmActionModal';
import FilterModal from './FilterModal';
import ActiveFilterChips from './ActiveFilterChips';
import { buildDateRangeChip, buildSearchChip, compactFilterChips } from '../utils/filterChips';
import SearchEmptyState from './SearchEmptyState';
import AppIcon from './AppIcon';
import FormField from './form/FormField';
import JalaliDateTimePicker from './JalaliDateTimePicker';
import {
  createDefaultDateRangeFilter,
  type DateRangeFilterPreset,
} from './DateRangeFilter';
import PageFilterPanel from './PageFilterPanel';
import { matchSearch } from '../utils/search';
import {
  formatDateRangeLabel,
  isDateInRange,
  resolveDateRange,
} from '../utils/dateRange';

type TimesheetEntryWithRow = TimesheetEntry & { rowNumber: number };

export default function TimesheetDetailPage({
  timesheet,
  onReauth,
  active = true,
}: {
  timesheet: Timesheet;
  onReauth?: () => void;
  active?: boolean;
}) {
  const [items, setItems] = useState<TimesheetEntryWithRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TimesheetEntryWithRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<TimesheetEntryWithRow | null>(null);
  const [loading, setLoading] = useState(() => {
    const settings = getSettings();
    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId));
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingCheckId, setTogglingCheckId] = useState('');
  const [endPickerOpenToken, setEndPickerOpenToken] = useState(0);
  const dataRevision = useDataRefresh();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [draftDatePreset, setDraftDatePreset] = useState<DateRangeFilterPreset>(
    () => createDefaultDateRangeFilter().preset
  );
  const [draftCustomRange, setDraftCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );
  const [datePreset, setDatePreset] = useState<DateRangeFilterPreset>(
    () => createDefaultDateRangeFilter().preset
  );
  const [customRange, setCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );

  const [form, setForm] = useState({
    title: '',
    startAt: getNowDateTimeIso(),
    endAt: getNowDateTimeIso(),
    description: '',
  });

  const durationMinutes = useMemo(
    () => calcDurationMinutes(form.startAt, form.endAt),
    [form.startAt, form.endAt]
  );

  const loadItems = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;
    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      await ensureTimesheetEntriesSheet(settings.spreadsheetId);
      const data = await fetchTimesheetEntries(settings.spreadsheetId, timesheet.id);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری رکوردها';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [onReauth, timesheet.id]);

  useEffect(() => {
    if (isConfigured()) loadItems();
  }, [loadItems, dataRevision]);

  const openCreateForm = useCallback(() => {
    const now = getNowDateTimeIso();
    setEditingItem(null);
    setForm({
      title: '',
      startAt: now,
      endAt: addMinutesToDateTime(now, 60),
      description: '',
    });
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((item: TimesheetEntryWithRow) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      startAt: item.startAt,
      endAt: item.endAt,
      description: item.description,
    });
    setShowForm(true);
  }, []);

  const openFilterModal = useCallback(() => {
    setDraftSearch(searchQuery);
    setDraftDatePreset(datePreset);
    setDraftCustomRange(customRange);
    setFilterModalOpen(true);
  }, [searchQuery, datePreset, customRange]);

  const { handleExport, handleExportPdf, handleImport, importExportConfirmModal } =
    useSheetImportExport({
      exportFn: (spreadsheetId) =>
        exportTimesheetEntriesCsv(spreadsheetId, timesheet.id, `${timesheet.title}.csv`),
      exportPdfFn: (spreadsheetId) =>
        exportTimesheetEntriesPdf(spreadsheetId, timesheet.id, timesheet.title),
      importFn: (spreadsheetId, csvContent) =>
        importTimesheetEntriesCsv(spreadsheetId, timesheet.id, csvContent),
      onComplete: loadItems,
      onReauth,
    });

  const dateRange = useMemo(
    () => (datePreset === 'all' ? null : resolveDateRange(datePreset, customRange)),
    [datePreset, customRange]
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim();
    return items.filter((item) => {
      if (query && !matchSearch(query, item.title, item.description)) return false;
      if (dateRange) {
        const date = item.startAt.slice(0, 10);
        if (!isDateInRange(date, dateRange)) return false;
      }
      return true;
    });
  }, [items, searchQuery, dateRange]);

  const totalMinutes = useMemo(
    () => totalDurationMinutes(filteredItems),
    [filteredItems]
  );

  const resetDateFilter = useCallback(() => {
    const defaults = createDefaultDateRangeFilter();
    setDatePreset(defaults.preset);
    setCustomRange(defaults.customRange);
  }, []);

  const filterChips = useMemo(
    () =>
      compactFilterChips([
        buildSearchChip(searchQuery, () => setSearchQuery('')),
        datePreset !== 'all' && dateRange
          ? buildDateRangeChip(formatDateRangeLabel(dateRange), resetDateFilter)
          : null,
      ]),
    [searchQuery, datePreset, dateRange, resetDateFilter]
  );

  const handleStartChange = (startAt: string) => {
    setForm((prev) => ({
      ...prev,
      startAt,
      endAt: syncEndDateTimeFromStart(startAt, prev.endAt, prev.startAt),
    }));
    setEndPickerOpenToken((token) => token + 1);
  };

  const handleEndChange = (endAt: string) => {
    setForm((prev) => ({
      ...prev,
      endAt: clampDateTimeToMin(endAt, prev.startAt),
    }));
  };

  const handleToggleChecked = async (item: TimesheetEntryWithRow, checked: boolean) => {
    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    const settings = getSettings()!;
    setTogglingCheckId(item.id);
    try {
      await updateTimesheetEntry(settings.spreadsheetId, item.rowNumber, {
        ...item,
        checked,
      });
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, checked } : entry))
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی');
    } finally {
      setTogglingCheckId('');
    }
  };

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
    if (!form.startAt || !form.endAt) {
      showError('زمان شروع و پایان الزامی است');
      return;
    }
    if (durationMinutes <= 0) {
      showError('زمان پایان باید بعد از زمان شروع باشد');
      return;
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      if (editingItem) {
        await updateTimesheetEntry(settings.spreadsheetId, editingItem.rowNumber, {
          ...editingItem,
          title: form.title.trim(),
          startAt: form.startAt,
          endAt: form.endAt,
          durationMinutes,
          description: form.description.trim(),
        });
        showSuccess('رکورد ویرایش شد');
      } else {
        await createTimesheetEntry(settings.spreadsheetId, {
          timesheetId: timesheet.id,
          title: form.title.trim(),
          startAt: form.startAt,
          endAt: form.endAt,
          description: form.description.trim(),
        });
        showSuccess('رکورد ثبت شد');
      }
      setShowForm(false);
      await loadItems();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem || !isConfigured() || !isTokenValid()) return;
    const settings = getSettings()!;
    setDeleting(true);
    try {
      await deleteTimesheetEntry(settings.spreadsheetId, deletingItem.rowNumber);
      showSuccess('رکورد حذف شد');
      setDeletingItem(null);
      await loadItems();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در حذف');
    } finally {
      setDeleting(false);
    }
  };

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: `عملیات ${timesheet.title}`,
      actions: createPageSpeedDialActions({
        onAdd: openCreateForm,
        onFilter: openFilterModal,
        onRefresh: loadItems,
        refreshDisabled: loading,
        onImport: handleImport,
        onExport: handleExport,
        onExportPdf: handleExportPdf,
      }),
    }),
    [
      timesheet.title,
      openCreateForm,
      openFilterModal,
      loadItems,
      loading,
      handleImport,
      handleExport,
      handleExportPdf,
    ]
  );

  useRegisterPageSpeedDial(isConfigured() ? pageSpeedDialConfig : null, active);

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">
          <AppIcon name="clock" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div className="timesheet-detail-page">
      <div className="stat-grid dashboard-stat-grid timesheet-detail-stats">
        <div className="stat-card">
          <span className="stat-label">مجموع کارکرد</span>
          <div className="timesheet-stat-value">
            {formatDurationFa(totalMinutes)}
            {totalMinutes > 0 && (
              <span className="timesheet-jira-hours" dir="ltr">
                {' '}
                ({formatJiraTimesheetHours(totalMinutes)})
              </span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">تعداد رکورد</span>
          <div className="timesheet-stat-value">
            {filteredItems.length.toLocaleString('fa-IR')}
          </div>
        </div>
      </div>

      <ActiveFilterChips chips={filterChips} onChipClick={openFilterModal} />

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={() => {
          setSearchQuery(draftSearch);
          setDatePreset(draftDatePreset);
          setCustomRange(draftCustomRange);
          setFilterModalOpen(false);
        }}
        onClear={() => {
          const defaults = createDefaultDateRangeFilter();
          setDraftSearch('');
          setDraftDatePreset(defaults.preset);
          setDraftCustomRange(defaults.customRange);
        }}
      >
        <PageFilterPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          searchPlaceholder="جستجو در رکوردها..."
          datePreset={draftDatePreset}
          customRange={draftCustomRange}
          onDateFilterChange={(filter) => {
            setDraftDatePreset(filter.preset);
            setDraftCustomRange(filter.customRange);
          }}
          dateIncludeAll
          dateLabel="بازه زمانی (تاریخ شروع)"
          dateLoading={loading}
        />
      </FilterModal>

      {loading && items.length === 0 ? (
        <InstallmentCardListSkeleton footerStats={0} />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <AppIcon name="clock" />
          </div>
          <p>هنوز رکوردی ثبت نشده</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreateForm}>
            افزودن رکورد
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <SearchEmptyState />
      ) : (
        filteredItems.map((item) => (
          <div
            key={item.id}
            className={`card installment-card timesheet-entry-card${item.checked ? ' timesheet-entry-card--checked' : ''}`}
          >
            <input
              type="checkbox"
              className="timesheet-entry-checkbox"
              checked={item.checked}
              disabled={togglingCheckId === item.id}
              onChange={(event) => handleToggleChecked(item, event.target.checked)}
              aria-label={`تایید ${item.title}`}
            />
            <div className="timesheet-entry-body">
              <div className="card-header-with-edit">
                <div className="installment-header timesheet-entry-header">
                  <div>
                    <div className="list-card-title">{item.title}</div>
                    <div className="list-card-subtitle">
                      {formatDateTimePersian(item.startAt)}
                      <span className="timesheet-entry-separator"> · </span>
                      {formatDateTimePersian(item.endAt)}
                    </div>
                    <div className="list-card-subtitle">
                      <span className="list-card-amount-pill">
                        {formatDurationFa(item.durationMinutes)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="installment-note">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="card-action-buttons">
                  <CardEditButton onClick={() => openEditForm(item)} />
                  <CardDeleteButton onClick={() => setDeletingItem(item)} />
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      <FormModal
        open={showForm}
        title={editingItem ? 'ویرایش رکورد' : 'رکورد جدید'}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        saving={saving}
        saveLabel={editingItem ? 'ذخیره' : 'ثبت'}
      >
        <FormField label="عنوان" required>
          <input
            type="text"
            className="form-control"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="مثلاً: جلسه با مشتری"
            autoFocus
          />
        </FormField>

        <FormField label="از ساعت" required>
          <JalaliDateTimePicker value={form.startAt} onChange={handleStartChange} />
        </FormField>

        <FormField label="تا ساعت" required>
          <JalaliDateTimePicker
            value={form.endAt}
            onChange={handleEndChange}
            minDateTime={form.startAt}
            openRequestToken={endPickerOpenToken}
          />
        </FormField>

        <FormField label="بازه زمان">
          <input
            type="text"
            className="form-control"
            value={formatDurationFa(durationMinutes)}
            disabled
            readOnly
          />
        </FormField>

        <FormField label="توضیحات" className="form-field-note">
          <textarea
            className="form-control form-note-textarea"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="توضیحات اضافه..."
          />
        </FormField>
      </FormModal>

      <ConfirmDeleteModal
        open={deletingItem !== null}
        title="حذف رکورد"
        message={`آیا از حذف «${deletingItem?.title ?? ''}» اطمینان دارید؟`}
        deleting={deleting}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
      />

      <ConfirmActionModal {...importExportConfirmModal} />
    </div>
  );
}
