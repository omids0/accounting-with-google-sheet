import type { UpdateBackupKind } from './autoBackupPlan'
import { exportFileName } from '../utils/saveFile'

/** Spreadsheet names longer than this are cut, so the whole file name stays well inside Drive's limit. */
export const MAX_NAME_LABEL_CHARS = 40

const MAX_VERSION_CHARS = 20

const NAME_BASE = 'پشتیبان به‌روزرسانی'

/** The develop app and the production app each write (and prune) only their own kind. */
export function updateBackupKindFor(isDevEnv: boolean): UpdateBackupKind {
  return isDevEnv ? 'update-dev' : 'update-prod'
}

/** The ASCII environment tag in the file name. */
export function updateBackupEnvTag(kind: UpdateBackupKind): 'dev' | 'prod' {
  return kind === 'update-dev' ? 'dev' : 'prod'
}

/** Control characters out, runs of spaces folded, at most `max` characters (not UTF-16 units). */
function cleanText(value: string, max: number): string {
  return [...value.replace(/[\p{C}\s]+/gu, ' ').trim()].slice(0, max).join('').trim()
}

/** «2.17.0-dev»: letters, digits and `. _ + -` only. */
function cleanVersion(value: string | undefined): string {
  return cleanText((value ?? '').replace(/[^0-9A-Za-z._+-]/g, ''), MAX_VERSION_CHARS)
}

export interface UpdateBackupNameInput {
  spreadsheetLabel: string
  kind: UpdateBackupKind
  /** The version the user is updating from (`APP_VERSION_LABEL`). */
  fromVersion: string
  /** The version being installed, when the update announces one. */
  toVersion?: string
  at: Date
}

/**
 * «حساب شخصی · پشتیبان به‌روزرسانی · prod · 2.17.0 to 2.18.0 ۱۴۰۵-۰۸-۱۰ ۱۸-۴۰.zip».
 * Spreadsheet name, environment, versions and the Jalali date and time are all in the name, so the
 * Drive folder reads right without opening anything; the date and time make names sort by age.
 */
export function updateBackupName({
  spreadsheetLabel,
  kind,
  fromVersion,
  toVersion,
  at
}: UpdateBackupNameInput): string {
  const from = cleanVersion(fromVersion)
  const to = cleanVersion(toVersion)

  const parts = [
    cleanText(spreadsheetLabel, MAX_NAME_LABEL_CHARS),
    NAME_BASE,
    updateBackupEnvTag(kind),
    from && to && from !== to ? `${from} to ${to}` : from
  ].filter(Boolean)

  return exportFileName(`${parts.join(' · ')}.zip`, at, true)
}
