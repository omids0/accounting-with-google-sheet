import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import SharedSplitFields from './SharedSplitFields'
import { personName, sharedPair } from './sharedViewModel'
import { getPathForTab } from '../../routes/paths'
import { getUserEmail } from '../../services/auth'
import { memberHasPermission, parseMembers } from '../../services/buildingRoles'
import { rowsToGroups } from '../../services/categoryGroups'
import { getSettings, getSpreadsheets } from '../../services/settings'
import {
  cancelSharedLink,
  clearSharedLinkFailures,
  failedSharedLink,
  type RecordType,
  type SharedChoice
} from '../../services/sharedLinkPrefs'
import { sharedCategory } from '../../services/sharedLinkRows'
import { sharedNameOf } from '../../services/sharedWorkspace'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from '../../services/sheetNames'
import { isSpreadsheetAccessDeniedError } from '../../services/sheetsApi'
import { batchFetchSheetRangesFromApi } from '../../services/sheetsRows'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import { isSharedEntry } from '../../services/workspace'
import { parseNumeric } from '../../utils/parseNumeric'
import { SETTLEMENT_CATEGORY } from '../../utils/protectedCategories'
import ConfirmActionModal from '../ConfirmActionModal'
import { FormField, Select, ToggleSwitch } from '../form'
import { alertClassName } from '../ui/Alert'
import { journeyNoteClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import { sharedAlertClass } from '../ui/sharedStyles'

interface Context {
  name: string
  me: string
  /** Owner and partner; just me while nobody has joined. */
  people: string[]
  canRecord: boolean
  /** The shared account's lists; null while unread (offline): the copy then picks on sending. */
  categories: Record<RecordType, string[]> | null
  /** This device has no access to the file (no Picker grant here). */
  connect: boolean
}

const TTL_MS = 5 * 60_000

let cached: { at: number; id: string; value: Context } | null = null

/** Who may record, the pair and the categories, from ONE direct read of the shared sheet. */
async function loadContext(sharedId: string, name: string): Promise<Context> {
  if (cached?.id === sharedId && Date.now() - cached.at < TTL_MS) return cached.value

  const me = (getUserEmail() ?? '').trim().toLowerCase()
  const base = { name, me, people: [me], canRecord: true, categories: null, connect: false }

  try {
    const read = await batchFetchSheetRangesFromApi(sharedId, [
      PERIOD_SETTINGS_SHEET,
      CATEGORIES_SHEET
    ])
    const members = parseMembers((read.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1), 'shared')
    const value: Context = {
      ...base,
      people: sharedPair(members) ?? [me],
      canRecord: memberHasPermission(members, me, 'record', 'shared'),
      categories: rowsToGroups(read.get(CATEGORIES_SHEET) ?? [])
    }

    cached = { at: Date.now(), id: sharedId, value }
    // The file is readable from this device again: copies that failed for access may go now.
    clearSharedLinkFailures()

    return value
  } catch (err) {
    // Offline: the tick still works; the runner reads the sheet and checks `record` before writing.
    return isSpreadsheetAccessDeniedError(err) ? { ...base, connect: true } : base
  }
}

interface SharedTickProps {
  type: RecordType
  values: Record<string, string | number>
  /** The record had a copy when the form opened. */
  linked: boolean
  editing: boolean
  recordId?: string
  choice: SharedChoice
  onChange: (patch: Partial<SharedChoice>) => void
}

/**
 * «در «<name>» هم ثبت شود» (spec «Linking»): a controlled switch, off unless the record already
 * has a copy, with the shared category, who it is for and each share (expense) or the income note.
 * On a device without access to the file it offers «اتصال این دستگاه» instead.
 */
export default function SharedTick({
  type,
  values,
  linked,
  editing,
  recordId,
  choice,
  onChange
}: SharedTickProps) {
  const account = getSpreadsheets().find(isSharedEntry)
  const [context, setContext] = useState<Context | null>(null)
  const navigate = useNavigate()
  const [failed, setFailed] = useState(() => (recordId ? failedSharedLink(recordId) : undefined))
  const [cancelled, setCancelled] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // The copy's own split, payer and category fill the panel unless the user changed it first.
  const touched = useRef(false)
  const change = (patch: Partial<SharedChoice>) => {
    touched.current = true
    onChange(patch)
  }

  const id = account?.id ?? ''
  const name = account ? sharedNameOf(getSpreadsheetLabel(account.name)) : ''
  const personalId = getSettings()?.spreadsheetId ?? ''

  useEffect(() => {
    let live = true

    if (id) void loadContext(id, name).then(value => live && setContext(value))
    if (id && linked && recordId) {
      void import('../../services/sharedLink')
        .then(({ readCopyChoice }) => readCopyChoice(id, type, `share:${personalId}:${recordId}`))
        .then(seed => live && seed && !touched.current && onChange(seed))
        .catch(() => undefined)
    }

    return () => {
      live = false
    }
    // `onChange` is a new function every render; the read depends on the record only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, name, linked, recordId, type, personalId])

  if (!account || !context) return null

  // The connect sheet lives on «فضاهای من» (its Picker flow opens the account there); leaving
  // drops what the form holds, so a form with input asks first.
  if (context.connect) {
    const go = () => navigate(`${getPathForTab('buildings-home')}?shared=connect`)
    const hasInput =
      editing || ['amount', 'title', 'note'].some(key => String(values[key] ?? '').trim())

    return (
      <FormField label="حساب مشترک" controlWidth="full">
        <p className={journeyNoteClass}>
          این دستگاه هنوز به فایل حساب مشترک وصل نیست؛ ثبت شخصی شما عادی ذخیره می‌شود.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => (hasInput ? setLeaving(true) : go())}
        >
          {`اتصال این دستگاه به «${name}»`}
        </Button>
        <ConfirmActionModal
          open={leaving}
          title="رفتن به «فضاهای من»؟"
          message="آنچه در این فرم نوشته‌اید ذخیره نمی‌شود. اول ذخیره کنید یا بعداً وصل شوید."
          confirmLabel="برو"
          cancelLabel="بمان"
          onConfirm={go}
          onClose={() => setLeaving(false)}
        />
      </FormField>
    )
  }

  if (!context.canRecord) return null

  const label = `در «${name}» هم ثبت شود`
  const list = (context.categories?.[type] ?? []).filter(item => item !== SETTLEMENT_CATEGORY)
  const nameOf = (email: string) => personName(email, context.me, {})

  return (
    <>
      <FormField label="حساب مشترک" controlWidth="full">
        <div className="flex items-center justify-between gap-3">
          <span className={journeyNoteClass}>{label}</span>
          <ToggleSwitch
            checked={choice.on}
            onChange={on => change({ on, sharedId: id })}
            label={label}
          />
        </div>
      </FormField>
      {choice.on && list.length ? (
        <FormField label="دسته در حساب مشترک" controlWidth="full">
          <Select
            aria-label="دسته در حساب مشترک"
            value={choice.category || sharedCategory(values.category, list)}
            onChange={category => change({ category })}
            options={[
              // A category the shared list no longer has: shown muted, left on the copy as it is.
              ...(choice.category && !list.includes(choice.category)
                ? [{ value: choice.category, label: choice.category, disabled: true }]
                : []),
              ...list.map(item => ({ value: item, label: item }))
            ]}
          />
        </FormField>
      ) : null}
      {choice.on && type === 'expense' ? (
        <SharedSplitFields
          people={context.people}
          me={context.me}
          nameOf={nameOf}
          amount={parseNumeric(values.amount)}
          payer={choice.payer || context.me}
          split={choice.split || 'equal'}
          onPayer={payer => change({ payer })}
          onSplit={split => change({ split })}
        />
      ) : null}
      {choice.on && type === 'income' ? (
        <p className={alertClassName('info', sharedAlertClass)}>
          مبلغ را شریک هم می‌بیند؛ درآمد روی تراز اثری ندارد و فقط در گزارش‌های حساب مشترک می‌آید.
        </p>
      ) : null}
      {editing && linked !== choice.on && !cancelled ? (
        <p className={alertClassName(linked ? 'warning' : 'info', sharedAlertClass)}>
          {linked
            ? 'با ذخیره، نسخهٔ حساب مشترک حذف می‌شود'
            : `با ذخیره، یک نسخه در «${name}» ساخته می‌شود`}
        </p>
      ) : null}
      {failed && recordId ? (
        <div className={alertClassName('error', sharedAlertClass)} role="alert">
          {`نسخهٔ حساب مشترک این ثبت فرستاده نشد: ${failed.failed}`}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              cancelSharedLink(recordId)
              setFailed(undefined)
              // A copy that was never created: the record is not shared any more.
              if (failed.kind === 'create') {
                // Offline: the save clears the marker instead (the tick is off, no copy queued).
                void import('../../services/sharedLink')
                  .then(({ clearPersonalLink }) => clearPersonalLink(personalId, recordId, type))
                  .catch(() => undefined)
                setCancelled(true)
                onChange({ on: false, unlinked: true })
              }
            }}
          >
            لغو ارسال
          </Button>
        </div>
      ) : null}
    </>
  )
}
