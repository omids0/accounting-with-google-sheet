import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

export interface PageSpeedDialAction {
  id: string
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
  /** Desktop header: label of the primary pill («+ ثبت چک»); defaults to `label`. */
  headerLabel?: string
}

export interface PageSpeedDialConfig {
  ariaLabel: string
  actions: PageSpeedDialAction[]
}

let activeConfig: PageSpeedDialConfig | null = null

let activeSignature = ''

const listeners = new Set<() => void>()

function buildSignature(config: PageSpeedDialConfig | null): string {
  if (!config) return ''

  return JSON.stringify({
    ariaLabel: config.ariaLabel,
    actions: config.actions.map(({ id, label, headerLabel, disabled, className }) => ({
      id,
      label,
      headerLabel,
      disabled: !!disabled,
      className: className ?? ''
    }))
  })
}

function notifyListeners() {
  listeners.forEach(listener => listener())
}

function publishPageSpeedDialConfig(config: PageSpeedDialConfig | null) {
  activeConfig = config

  const nextSignature = buildSignature(config)

  if (nextSignature === activeSignature) return
  activeSignature = nextSignature
  notifyListeners()
}

export function getPageSpeedDialConfig() {
  return activeConfig
}

/**
 * Runs the active page's «بروزرسانی» action, read at call time so a page's latest
 * loader is used. Returns what the loader returned (a promise for async loaders).
 */
export function runPageRefresh(): unknown {
  const action = activeConfig?.actions.find(item => item.id === 'refresh')

  if (!action || action.disabled) return undefined

  return action.onClick() as unknown
}

export function usePageSpeedDialConfig() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const listener = () => setVersion(version => version + 1)

    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }, [])

  return activeConfig
}

export function useRegisterPageSpeedDial(config: PageSpeedDialConfig | null, active = true) {
  const signature = useMemo(() => buildSignature(config), [config])

  useLayoutEffect(() => {
    if (!active) return
    publishPageSpeedDialConfig(config)
  }, [active, signature, config])

  useLayoutEffect(() => {
    if (!active) return

    return () => {
      activeConfig = null
      activeSignature = ''
      notifyListeners()
    }
  }, [active])
}
