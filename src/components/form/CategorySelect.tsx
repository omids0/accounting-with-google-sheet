import { useEffect, useRef, useState } from 'react';
import { isTokenValid } from '../../services/auth';
import { saveDangCategoriesToSheet, saveFormCategoriesToSheet } from '../../services/categories';
import type { CategoryType } from '../../services/categories';
import { getSettings } from '../../services/settings';
import { showError, showSuccess } from '../../utils/toast';
import AppIcon from '../AppIcon';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  formId?: string;
  categoryScope?: CategoryType;
  onCategoriesChange?: (categories: string[]) => void;
  onReauth?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export default function CategorySelect({
  value,
  onChange,
  categories,
  formId,
  categoryScope,
  onCategoriesChange,
  onReauth,
  disabled = false,
  'aria-label': ariaLabel = 'دسته‌بندی',
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const displayLabel = value || 'انتخاب کنید';

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => addInputRef.current?.focus(), 0);

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setEditingCategory(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setEditingCategory(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const persistCategories = async (next: string[]): Promise<boolean> => {
    const settings = getSettings();
    if (!settings?.spreadsheetId) {
      showError('ابتدا شیت فعال را انتخاب کنید');
      return false;
    }
    if (!isTokenValid()) {
      onReauth?.();
      return false;
    }
    if (!next.length) {
      showError('حداقل یک دسته‌بندی لازم است');
      return false;
    }

    setSaving(true);
    try {
      if (categoryScope === 'dang') {
        await saveDangCategoriesToSheet(settings.spreadsheetId, next);
      } else {
        if (!formId) {
          showError('فرم دسته‌بندی معتبر نیست');
          return false;
        }
        await saveFormCategoriesToSheet(settings.spreadsheetId, formId, next);
      }
      onCategoriesChange?.(next);
      showSuccess('دسته‌بندی‌ها ذخیره شد');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ذخیره دسته‌بندی‌ها';
      if (msg.includes('منقضی') || msg.includes('401')) {
        onReauth?.();
        return false;
      }
      showError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (category: string) => {
    setEditingCategory(category);
    setEditText(category);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditText('');
  };

  const handleSaveEdit = async (oldName: string) => {
    const name = editText.trim();
    if (!name) {
      showError('نام دسته‌بندی خالی است');
      return;
    }
    if (name === oldName) {
      cancelEdit();
      return;
    }
    if (categories.includes(name)) {
      showError('این دسته‌بندی قبلاً وجود دارد');
      return;
    }

    const next = categories.map((item) => (item === oldName ? name : item));
    if (await persistCategories(next)) {
      if (value === oldName) onChange(name);
      cancelEdit();
    }
  };

  const handleDelete = async (category: string) => {
    if (categories.length <= 1) {
      showError('حداقل یک دسته‌بندی باید بماند');
      return;
    }

    const next = categories.filter((item) => item !== category);
    if (await persistCategories(next)) {
      if (value === category) onChange(next[0] ?? '');
    }
  };

  const handleAdd = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.includes(name)) {
      showError('این دسته‌بندی قبلاً وجود دارد');
      return;
    }

    const next = [...categories, name];
    if (await persistCategories(next)) {
      setNewCategory('');
      onChange(name);
    }
  };

  const handleSelect = (category: string) => {
    if (saving || editingCategory) return;
    onChange(category);
    setOpen(false);
  };

  const rootClass = [
    'custom-select',
    'category-select',
    open && 'custom-select--open',
    disabled && 'custom-select--disabled',
    saving && 'category-select--saving',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && !saving && setOpen((isOpen) => !isOpen)}
        disabled={disabled || saving}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="custom-select-value">{displayLabel}</span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="category-select-panel">
          <div className="category-select-add">
            <span className="category-select-add-label">افزودن دسته جدید</span>
            <div className="category-select-add-row">
              <input
                ref={addInputRef}
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="نام دسته را بنویسید..."
                disabled={saving}
                aria-label="دسته‌بندی جدید"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAdd}
                disabled={saving || !newCategory.trim()}
              >
                افزودن
              </button>
            </div>
          </div>

          <ul className="category-select-list" role="listbox" aria-label={ariaLabel}>
            {categories.map((category) => (
              <li key={category} className="category-select-item">
                {editingCategory === category ? (
                  <div className="category-select-edit">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(category);
                        }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      disabled={saving}
                      aria-label="ویرایش دسته‌بندی"
                    />
                    <button
                      type="button"
                      className="category-select-icon-btn category-select-icon-btn--save"
                      onClick={() => handleSaveEdit(category)}
                      disabled={saving}
                      aria-label="تایید"
                    >
                      <AppIcon name="check" size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="category-select-icon-btn"
                      onClick={cancelEdit}
                      disabled={saving}
                      aria-label="انصراف"
                    >
                      <AppIcon name="close" size={14} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === category}
                      className={[
                        'category-select-option',
                        value === category && 'is-selected',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelect(category)}
                      disabled={saving}
                    >
                      {category}
                    </button>
                    <div className="category-select-actions">
                      <button
                        type="button"
                        className="category-select-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(category);
                        }}
                        disabled={saving}
                        aria-label={`ویرایش ${category}`}
                      >
                        <AppIcon name="edit" size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="category-select-icon-btn category-select-icon-btn--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(category);
                        }}
                        disabled={saving || categories.length <= 1}
                        aria-label={`حذف ${category}`}
                      >
                        <AppIcon name="close" size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
