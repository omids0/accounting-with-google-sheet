import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { getDateFieldId } from '../../services/dashboardAggregation'
import {
  collectTemplateGroups,
  getEntryTemplatePrefs,
  pickEntryTemplates,
  setEntryTemplatePrefs,
  type EntryTemplate,
  type EntryTemplatePrefs
} from '../../services/entryTemplates'
import { getSettings } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import { fetchWalletAccounts } from '../../services/wallet'
import type { CustomForm } from '../../types'
import { getTodayIso } from '../../utils/jalaliDate'

/**
 * «پرتکرار» chips of the income/expense entry form, derived from the form's own
 * records (no sheet tab). `enabled` is off when the form opened already filled.
 */
export function useEntryTemplates(form: CustomForm | undefined, enabled: boolean) {
  const spreadsheetId = getSettings()?.spreadsheetId
  const [groups, setGroups] = useState<EntryTemplate[]>([])
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map())
  const [prefs, setPrefs] = useState(() => getEntryTemplatePrefs(spreadsheetId))
  const revision = useDataRefresh()
  const active = enabled && !!spreadsheetId && (form?.type === 'income' || form?.type === 'expense')

  useEffect(() => {
    if (!active || !form || !spreadsheetId) {
      setGroups([])

      return
    }

    let live = true

    void Promise.all([
      fetchRecords(spreadsheetId, form),
      fetchWalletAccounts(spreadsheetId).catch(() => [])
    ])
      .then(([records, walletAccounts]) => {
        if (!live) return
        setGroups(collectTemplateGroups(records, getTodayIso(), getDateFieldId(form)))
        setAccounts(new Map(walletAccounts.map(account => [account.id, account.title])))
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [active, form, spreadsheetId, revision])

  const chips = useMemo(() => pickEntryTemplates(groups, prefs), [groups, prefs])

  const savePrefs = useCallback(
    (next: EntryTemplatePrefs) => {
      if (spreadsheetId) setEntryTemplatePrefs(spreadsheetId, next)
      setPrefs(next)
    },
    [spreadsheetId]
  )

  const accountTitle = useCallback((id: string) => accounts.get(id) ?? '', [accounts])

  return { chips, groups, prefs, savePrefs, accountTitle }
}
