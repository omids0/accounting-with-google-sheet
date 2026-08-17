import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomForm } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { fetchRecords } from '../services/sheets';
import { isTokenValid } from '../services/auth';
import { Select } from './form';
import DateRangeFilter, {
  createDefaultDateRangeFilter,
  type AppliedDateRangeFilter,
} from './DateRangeFilter';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian } from '../utils/jalaliDate';
import {
  formatDateRangeLabel,
  isDateInRange,
  resolveDateRange,
  type RecordsDatePreset,
} from '../utils/dateRange';
import { RecordListSkeleton } from './skeleton';
import { showError } from '../utils/toast';

interface RecordItem {
  id: string;
  createdAt: string;
  values: Record<string, string>;
}

function getCategoryOptions(
  form: CustomForm | undefined,
  records: RecordItem[]
): string[] {
  const fromForm = form?.fields.find((f) => f.id === 'category')?.options ?? [];
  const categoryFieldId = form?.fields.find((f) => f.id === 'category')?.id ?? 'category';
  const fromRecords = records
    .map((r) => r.values[categoryFieldId] ?? '')
    .filter(Boolean);
  return [...new Set([...fromForm, ...fromRecords])];
}

export default function RecordsPage({
  onReauth,
  initialFormType,
}: {
  onReauth?: () => void;
  initialFormType?: 'income' | 'expense';
}) {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [activeFormId, setActiveFormId] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date');
  const [customRange, setCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );
  const [categoryFilter, setCategoryFilter] = useState('all');

  const activeForm = forms.find((f) => f.id === activeFormId);
  const dateRange = resolveDateRange(datePreset, customRange);

  const loadRecords = useCallback(async () => {
    const settings = getSettings();
    const form = settings?.forms.find((f) => f.id === activeFormId);
    if (!settings?.spreadsheetId || !form) return;

    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    setLoading(true);
    try {
      const data = await fetchRecords(settings.spreadsheetId, form);
      setRecords(data.reverse());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بارگذاری';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeFormId, onReauth]);

  useEffect(() => {
    const settings = getSettings();
    if (!settings) return;
    setForms(settings.forms);
    if (initialFormType) {
      const form = settings.forms.find((f) => f.type === initialFormType);
      if (form) {
        setActiveFormId(form.id);
        return;
      }
    }
    if (settings.forms.length) setActiveFormId(settings.forms[0].id);
  }, [initialFormType]);

  useEffect(() => {
    if (activeFormId && isConfigured()) loadRecords();
  }, [activeFormId, loadRecords]);

  const amountField = activeForm?.fields.find((f) => f.id === 'amount');
  const dateField = activeForm?.fields.find((f) => f.type === 'date');
  const titleField = activeForm?.fields.find(
    (f) => f.id === 'title' || f.label.includes('عنوان')
  );
  const categoryField = activeForm?.fields.find((f) => f.id === 'category');

  const categoryOptions = useMemo(
    () => getCategoryOptions(activeForm, records),
    [activeForm, records]
  );

  const filteredRecords = useMemo(() => {
    const dateFieldId = dateField?.id ?? 'date';
    const categoryFieldId = categoryField?.id ?? 'category';
    return records.filter((record) => {
      const date = record.values[dateFieldId] ?? '';
      if (!isDateInRange(date, dateRange)) return false;
      if (categoryFilter !== 'all') {
        const category = record.values[categoryFieldId] ?? '';
        if (category !== categoryFilter) return false;
      }
      return true;
    });
  }, [records, dateRange, categoryFilter, dateField, categoryField]);

  const handleFormChange = (formId: string) => {
    setActiveFormId(formId);
    setCategoryFilter('all');
  };

  const handleDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDatePreset(filter.preset);
    setCustomRange(filter.customRange);
  };

  if (!isConfigured()) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    );
  }

  return (
    <div className="records-page">
      <div className="card records-toolbar">
        <div className="records-toolbar-header">
          <div className="records-toolbar-heading">
            <h2 className="records-toolbar-title">تراکنش‌ها</h2>
            <p className="records-toolbar-range">{formatDateRangeLabel(dateRange)}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm records-refresh-btn"
            onClick={loadRecords}
            disabled={loading}
            aria-label="بارگذاری مجدد"
          >
            {loading ? '...' : '↻'}
          </button>
        </div>

        {forms.length > 1 && (
          <div className="records-type-segment" role="tablist" aria-label="نوع تراکنش">
            {forms.map((form) => (
              <button
                key={form.id}
                type="button"
                role="tab"
                aria-selected={activeFormId === form.id}
                className={[
                  activeFormId === form.id ? 'active' : '',
                  form.type === 'income' ? 'income' : '',
                  form.type === 'expense' ? 'expense' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleFormChange(form.id)}
              >
                {form.name}
              </button>
            ))}
          </div>
        )}

        <DateRangeFilter
          preset={datePreset}
          customRange={customRange}
          onChange={handleDateFilterChange}
          loading={loading}
        />

        {categoryField && (
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
                ...categoryOptions.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
        )}
      </div>

      {loading && records.length === 0 ? (
        <RecordListSkeleton />
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>هنوز رکوردی ثبت نشده</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <p>تراکنشی با این فیلتر یافت نشد</p>
        </div>
      ) : (
        <div className="card records-list-card">
          <div className="records-list-header">
            <span className="records-list-count">
              {filteredRecords.length.toLocaleString('fa-IR')} مورد
            </span>
            {forms.length === 1 && activeForm && (
              <span
                className={`records-list-type records-list-type--${activeForm.type}`}
              >
                {activeForm.name}
              </span>
            )}
          </div>
          {filteredRecords.map((record) => {
            const amount = amountField ? record.values[amountField.id] : '';
            const title = titleField
              ? record.values[titleField.id]
              : Object.values(record.values)[0] ?? '';
            const category = categoryField ? record.values[categoryField.id] : '';
            const date = dateField ? record.values[dateField.id] : '';
            const isIncome = activeForm?.type === 'income';

            return (
              <div key={record.id} className="record-item">
                <div>
                  <div className="record-item-title">{title}</div>
                  <div className="record-item-meta">
                    {date ? formatIsoDatePersian(date) : record.createdAt}
                    {category && ` · ${category}`}
                  </div>
                </div>
                {amount && (
                  <div
                    className={isIncome ? 'amount-income' : activeForm?.type === 'expense' ? 'amount-expense' : ''}
                    dir="ltr"
                  >
                    {isIncome ? '+' : activeForm?.type === 'expense' ? '-' : ''}
                    {formatMoney(Number(amount))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
