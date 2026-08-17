import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomForm } from '../types';
import { getSettings, isConfigured } from '../services/settings';
import { fetchRecords, updateRecord } from '../services/sheets';
import { isTokenValid } from '../services/auth';
import { Select, FieldInput, sortFormFields } from './form';
import DateRangeFilter, {
  createDefaultDateRangeFilter,
  type AppliedDateRangeFilter,
} from './DateRangeFilter';
import TransactionTypeSegment, {
  transactionTypeOptionsFromForms,
} from './TransactionTypeSegment';
import { formatMoney } from '../utils/formatMoney';
import { formatIsoDatePersian } from '../utils/jalaliDate';
import {
  formatDateRangeLabel,
  isDateInRange,
  resolveDateRange,
  type RecordsDatePreset,
} from '../utils/dateRange';
import { RecordListSkeleton } from './skeleton';
import { showError, showSuccess } from '../utils/toast';
import FormModal from './FormModal';
import CardEditButton from './CardEditButton';

interface RecordItem {
  id: string;
  createdAt: string;
  rowNumber: number;
  values: Record<string, string>;
}

interface StoredRecord extends RecordItem {
  formId: string;
  formType: CustomForm['type'];
  formName: string;
}

function enrichRecord(record: RecordItem, form: CustomForm): StoredRecord {
  return {
    ...record,
    formId: form.id,
    formType: form.type,
    formName: form.name,
  };
}

function getFormField(
  form: CustomForm,
  kind: 'date' | 'amount' | 'title' | 'category'
) {
  switch (kind) {
    case 'date':
      return form.fields.find((f) => f.type === 'date');
    case 'amount':
      return form.fields.find((f) => f.id === 'amount');
    case 'category':
      return form.fields.find((f) => f.id === 'category');
    case 'title':
      return form.fields.find(
        (f) => f.id === 'title' || f.label.includes('عنوان')
      );
  }
}

function sortRecords(records: StoredRecord[], forms: CustomForm[]): StoredRecord[] {
  const dateFieldFor = (formId: string) =>
    forms.find((f) => f.id === formId)?.fields.find((field) => field.type === 'date')?.id ??
    'date';

  return [...records].sort((a, b) => {
    const aDate = a.values[dateFieldFor(a.formId)] ?? '';
    const bDate = b.values[dateFieldFor(b.formId)] ?? '';
    const byDate = bDate.localeCompare(aDate);
    if (byDate !== 0) return byDate;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
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
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StoredRecord | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});
  const [datePreset, setDatePreset] = useState<RecordsDatePreset>('month-to-date');
  const [customRange, setCustomRange] = useState(
    () => createDefaultDateRangeFilter().customRange
  );
  const [categoryFilter, setCategoryFilter] = useState('all');

  const activeForm = activeFormId === 'all' ? undefined : forms.find((f) => f.id === activeFormId);
  const dateRange = resolveDateRange(datePreset, customRange);
  const isAllForms = activeFormId === 'all';

  const loadRecords = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) return;

    if (!isTokenValid()) {
      onReauth?.();
      return;
    }

    const formsToLoad =
      activeFormId === 'all'
        ? settings.forms
        : settings.forms.filter((f) => f.id === activeFormId);

    if (!formsToLoad.length) return;

    setLoading(true);
    try {
      const batches = await Promise.all(
        formsToLoad.map(async (form) => {
          const data = await fetchRecords(settings.spreadsheetId, form);
          return data.map((record) => enrichRecord(record, form));
        })
      );
      setRecords(sortRecords(batches.flat(), settings.forms));
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
    if (settings.forms.length > 1) {
      setActiveFormId('all');
      return;
    }
    if (settings.forms.length) setActiveFormId(settings.forms[0].id);
  }, [initialFormType]);

  useEffect(() => {
    if (activeFormId && isConfigured()) loadRecords();
  }, [activeFormId, loadRecords]);

  const showCategoryFilter =
    isAllForms
      ? forms.some((form) => getFormField(form, 'category'))
      : !!activeForm && getFormField(activeForm, 'category');

  const categoryOptions = useMemo(() => {
    if (isAllForms) {
      const categories = new Set<string>();
      for (const form of forms) {
        const formRecords = records.filter((record) => record.formId === form.id);
        getCategoryOptions(form, formRecords).forEach((cat) => categories.add(cat));
      }
      return [...categories];
    }
    return getCategoryOptions(activeForm, records);
  }, [isAllForms, forms, activeForm, records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const form = forms.find((f) => f.id === record.formId);
      if (!form) return false;

      const recordDateField = getFormField(form, 'date');
      const recordCategoryField = getFormField(form, 'category');
      const dateFieldId = recordDateField?.id ?? 'date';
      const categoryFieldId = recordCategoryField?.id ?? 'category';
      const date = record.values[dateFieldId] ?? '';

      if (!isDateInRange(date, dateRange)) return false;
      if (categoryFilter !== 'all') {
        const category = record.values[categoryFieldId] ?? '';
        if (category !== categoryFilter) return false;
      }
      return true;
    });
  }, [records, dateRange, categoryFilter, forms]);

  const handleFormChange = (formId: string) => {
    setActiveFormId(formId);
    setCategoryFilter('all');
  };

  const handleDateFilterChange = (filter: AppliedDateRangeFilter) => {
    setDatePreset(filter.preset);
    setCustomRange(filter.customRange);
  };

  const editingForm = editingRecord
    ? forms.find((form) => form.id === editingRecord.formId)
    : undefined;

  const openEditForm = (record: StoredRecord) => {
    const form = forms.find((item) => item.id === record.formId);
    if (!form) return;

    const values: Record<string, string | number> = {};
    form.fields.forEach((field) => {
      const raw = record.values[field.id] ?? '';
      if (field.type === 'number') {
        values[field.id] = raw === '' ? '' : Number(raw);
      } else {
        values[field.id] = raw;
      }
    });

    setEditingRecord(record);
    setFormValues(values);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingRecord(null);
    setFormValues({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editingForm) return;

    if (!isConfigured() || !isTokenValid()) {
      onReauth?.();
      return;
    }

    for (const field of editingForm.fields) {
      if (field.required) {
        const val = formValues[field.id];
        if (val === '' || val === undefined || val === null) {
          showError(`فیلد «${field.label}» الزامی است`);
          return;
        }
      }
    }

    const settings = getSettings()!;
    setSaving(true);
    try {
      await updateRecord(
        settings.spreadsheetId,
        editingForm,
        editingRecord.rowNumber,
        editingRecord.id,
        editingRecord.createdAt,
        formValues
      );
      showSuccess('تراکنش ویرایش شد');
      closeForm();
      await loadRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش تراکنش';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return;
      }
      showError(msg);
    } finally {
      setSaving(false);
    }
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

        <TransactionTypeSegment
          options={transactionTypeOptionsFromForms(forms, { includeAll: true })}
          value={activeFormId}
          onChange={handleFormChange}
        />

        <DateRangeFilter
          preset={datePreset}
          customRange={customRange}
          onChange={handleDateFilterChange}
          loading={loading}
        />

        {showCategoryFilter && (
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
            const form = forms.find((f) => f.id === record.formId);
            if (!form) return null;

            const recordAmountField = getFormField(form, 'amount');
            const recordTitleField = getFormField(form, 'title');
            const recordCategoryField = getFormField(form, 'category');
            const recordDateField = getFormField(form, 'date');

            const amount = recordAmountField
              ? record.values[recordAmountField.id]
              : '';
            const title = recordTitleField
              ? record.values[recordTitleField.id]
              : Object.values(record.values)[0] ?? '';
            const category = recordCategoryField
              ? record.values[recordCategoryField.id]
              : '';
            const date = recordDateField ? record.values[recordDateField.id] : '';
            const isIncome = form.type === 'income';

            return (
              <div key={`${record.formId}-${record.id}`} className="record-item">
                <div className="record-item-main">
                  <div className="record-item-title">{title}</div>
                  <div className="record-item-meta">
                    {isAllForms && `${record.formName} · `}
                    {date ? formatIsoDatePersian(date) : record.createdAt}
                    {category && ` · ${category}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {amount && (
                    <div
                      className={
                        isIncome
                          ? 'amount-income'
                          : form.type === 'expense'
                            ? 'amount-expense'
                            : ''
                      }
                      dir="ltr"
                    >
                      {isIncome ? '+' : form.type === 'expense' ? '-' : ''}
                      {formatMoney(Number(amount))}
                    </div>
                  )}
                  <CardEditButton onClick={() => openEditForm(record)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingForm && (
        <FormModal
          open={showForm}
          title={`ویرایش ${editingForm.name}`}
          onClose={closeForm}
          onSubmit={handleSubmit}
          saving={saving}
          saveLabel="ذخیره تغییرات"
          saveButtonClassName={`btn ${
            editingForm.type === 'expense'
              ? 'btn-outflow'
              : editingForm.type === 'income'
                ? 'btn-inflow'
                : 'btn-primary'
          }`}
        >
          {sortFormFields(editingForm.fields).map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={formValues[field.id] ?? ''}
              onChange={(next) =>
                setFormValues((prev) => ({ ...prev, [field.id]: next }))
              }
              formId={editingForm.id}
              onReauth={onReauth}
            />
          ))}
        </FormModal>
      )}
    </div>
  );
}
