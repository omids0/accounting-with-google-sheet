import { useCallback, useMemo, useState } from 'react'

import { buildKindChip } from '../utils/filterChips'

export type KindFilterOption<K extends string> = { value: K; label: string }

/** Props `PageFilterPanel` takes for the kind section; draft values, applied with the sheet. */
export type KindFilterPanelProps = {
  kind: string
  onKindChange: (value: string) => void
  kindOptions: KindFilterOption<string>[]
  kindLabel: string
}

/**
 * «همه / پرداختی / دریافتی»-style filter on one fixed property of a row, built like
 * `useMineFilter`: it has a draft for the filter sheet, a chip once applied, and `set` for a
 * quick control outside the sheet that changes the applied value at once.
 */
export function useKindFilter<T, K extends string>({
  getKind,
  options,
  label
}: {
  getKind: (item: T) => K
  options: KindFilterOption<K>[]
  /** Name of the property: «نوع چک». */
  label: string
}) {
  const [kind, setKind] = useState<'all' | K>('all')
  const [draft, setDraft] = useState<'all' | K>('all')

  const optionsWithAll = useMemo<KindFilterOption<'all' | K>[]>(
    () => [{ value: 'all', label: 'همه' }, ...options],
    [options]
  )

  const matches = useCallback(
    (item: T) => kind === 'all' || getKind(item) === kind,
    [getKind, kind]
  )

  const optionLabel = optionsWithAll.find(option => option.value === kind)?.label ?? ''

  const chip = useMemo(
    () => (kind === 'all' ? null : buildKindChip(`${label}: ${optionLabel}`, () => setKind('all'))),
    [kind, label, optionLabel]
  )

  const panelProps: KindFilterPanelProps = {
    kind: draft,
    onKindChange: value => setDraft(value as 'all' | K),
    kindOptions: optionsWithAll,
    kindLabel: label
  }

  return {
    kind,
    /** The active option's label, '' while «همه». */
    activeLabel: kind === 'all' ? '' : optionLabel,
    options: optionsWithAll,
    matches,
    chip,
    panelProps,
    set: useCallback((value: 'all' | K) => {
      setKind(value)
      setDraft(value)
    }, []),
    startDraft: useCallback(() => setDraft(kind), [kind]),
    applyDraft: useCallback(() => setKind(draft), [draft]),
    clearDraft: useCallback(() => setDraft('all'), []),
    clearAll: useCallback(() => setKind('all'), [])
  }
}
