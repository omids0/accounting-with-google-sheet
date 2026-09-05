import { useState, useEffect } from 'react'

import AppIcon from './AppIcon'
import DataEntryForm from './DataEntryForm'
import { FormSkeleton } from './skeleton'
import TransactionTypeSegment, { transactionTypeOptionsFromForms } from './TransactionTypeSegment'
import { getSettings, isConfigured } from '../services/settings'
import type { CustomForm } from '../types'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'
import { dataEntryTypeSegmentClass } from './ui/recordsStyles'

export default function DataEntryPage({
  onCancel,
  initialFormType
}: {
  onCancel?: () => void
  initialFormType?: 'income' | 'expense'
}) {
  const [forms, setForms] = useState<CustomForm[]>([])

  const [activeFormId, setActiveFormId] = useState('')

  const [loading, setLoading] = useState(false)

  const [ready, setReady] = useState(false)

  const activeForm = forms.find(f => f.id === activeFormId)

  useEffect(() => {
    const settings = getSettings()

    if (!settings) {
      setReady(true)

      return
    }
    setForms(settings.forms)

    let selectedForm = settings.forms[0]

    if (initialFormType) {
      const matched = settings.forms.find(f => f.type === initialFormType)

      if (matched) selectedForm = matched
    }
    if (selectedForm) {
      setActiveFormId(selectedForm.id)
    }
    setReady(true)
  }, [initialFormType])

  const refreshForms = () => {
    const settings = getSettings()

    if (settings) setForms(settings.forms)
  }

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="edit" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (!ready) {
    return <FormSkeleton />
  }

  return (
    <div>
      <TransactionTypeSegment
        className={dataEntryTypeSegmentClass}
        options={transactionTypeOptionsFromForms(forms)}
        value={activeFormId}
        onChange={formId => setActiveFormId(formId)}
        ariaLabel="نوع ثبت"
      />

      {activeForm && (
        <DataEntryForm
          key={activeForm.id}
          activeForm={activeForm}
          loading={loading}
          onLoadingChange={setLoading}
          onCancel={onCancel}
          onCategoriesRefresh={refreshForms}
        />
      )}
    </div>
  )
}
