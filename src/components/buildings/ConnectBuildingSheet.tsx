import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useOpenSheetWithGoogle } from '../../hooks/useOpenSheetWithGoogle'
import { getPathForTab } from '../../routes/paths'
import {
  connectBuilding,
  NOT_A_BUILDING_MESSAGE,
  registerConnectedSheet
} from '../../services/buildingConnect'
import { isJourneyUnfinished, readJourney } from '../../services/buildingJourney'
import { getSettings, getSpreadsheets } from '../../services/settings'
import { anotherSharedExists, undoPickedSheet } from '../../services/sharedConnect'
import { ONE_SHARED_ACCOUNT_MESSAGE } from '../../services/sharedWorkspace'
import { getSpreadsheetLabel, parseSpreadsheetIdFromUrl } from '../../services/spreadsheetCatalog'
import { moveSyncToSpreadsheet } from '../../services/spreadsheetSwitch'
import {
  getWorkspaceType,
  rememberPersonalSheet,
  syncWorkspaceTypeFromSheet
} from '../../services/workspace'
import { bumpSpreadsheetKey } from '../../stores/appStore'
import type { SpreadsheetEntry } from '../../types'
import { toUserMessage } from '../../utils/userMessage'
import { FormField } from '../form'
import FormModal from '../FormModal'
import type { Tab } from '../layout/types'
import {
  journeyListClass,
  journeyNoteClass,
  journeyRowButtonClass,
  journeyRowTitleClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import { formErrorClass } from '../ui/formStyles'

/** What the sheet connects: a building (default) or the shared account. */
export interface ConnectTarget {
  type: 'building' | 'shared'
  title: string
  intro: string
  notMessage: string
  /** Reads the sheet's type row and lists it on this device; false for another kind of sheet. */
  connect: (spreadsheetId: string, title?: string) => Promise<boolean>
  /** The page the «باز کردن شیت با گوگل» path opens once the picked sheet is listed. */
  landing: (spreadsheetId: string) => Tab
}

const BUILDING_TARGET: ConnectTarget = {
  type: 'building',
  title: 'اتصال به شیت موجود',
  intro: 'اگر مدیر قبلی یا هیئت مدیره شیت ساختمان را با شما به اشتراک گذاشته، از اینجا وصلش کنید.',
  notMessage: NOT_A_BUILDING_MESSAGE,
  connect: connectBuilding,
  landing: id => (isJourneyUnfinished(readJourney(id)) ? 'building-setup' : 'building-dashboard')
}

interface ConnectBuildingSheetProps {
  open: boolean
  /** Drive sheets named like the target that this device has not registered. */
  candidates: SpreadsheetEntry[]
  onClose: () => void
  /** Registers the sheet and enters it (the home's `useEnterBuilding` / `useEnterWorkspace`). */
  onConnected: (spreadsheetId: string) => void
  /** Default: a building. */
  target?: ConnectTarget
}

/**
 * «اتصال به شیت موجود» (and, with the shared target, «اتصال به حساب مشترک»): pick a sheet from
 * the Drive list, paste its link, or open it with Google (the only way the app can reach a sheet
 * someone else shared). A sheet without the target's type row is refused («این شیت ساختمان نیست»).
 */
export default function ConnectBuildingSheet({
  open,
  candidates,
  onClose,
  onConnected,
  target = BUILDING_TARGET
}: ConnectBuildingSheetProps) {
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const connect = async (spreadsheetId: string, title?: string) => {
    setBusy(true)
    setError(null)
    try {
      if (await target.connect(spreadsheetId, title)) {
        onClose()
        onConnected(spreadsheetId)
      } else {
        setError(target.notMessage)
      }
    } catch (err) {
      setError(toUserMessage(err, 'اتصال به شیت ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  const previousRef = useRef('')

  // The picker has already made the sheet active: keep it when it is the target, else go back.
  const picker = useOpenSheetWithGoogle(async pickedId => {
    const previousId = previousRef.current
    const matches = (await syncWorkspaceTypeFromSheet(pickedId)) === target.type
    // One shared account per person: the picked sheet is already registered here, so it is only
    // «another» when a different registered sheet is shared.
    const second =
      matches && target.type === 'shared' && anotherSharedExists(getSpreadsheets(), pickedId)

    if (matches && !second) {
      const name = getSettings()?.spreadsheets?.find(sheet => sheet.id === pickedId)?.name

      registerConnectedSheet(pickedId, target.type, name ?? pickedId)
      await moveSyncToSpreadsheet(previousId, pickedId)
      onClose()
      navigate(getPathForTab(target.landing(pickedId)))
      bumpSpreadsheetKey()

      return
    }
    setError(second ? ONE_SHARED_ACCOUNT_MESSAGE : target.notMessage)
    await undoPickedSheet(pickedId, previousId, second)
    if (previousId) bumpSpreadsheetKey()
  })

  const openPicker = () => {
    previousRef.current = getSettings()?.spreadsheetId ?? ''
    if (previousRef.current && getWorkspaceType(previousRef.current) === 'personal') {
      rememberPersonalSheet(previousRef.current)
    }
    void picker.openWithGoogle()
  }

  return (
    <FormModal
      open={open}
      title={target.title}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        const id = parseSpreadsheetIdFromUrl(link)

        if (id) return connect(id)

        setError('لینک یا شناسهٔ شیت را درست وارد کنید')

        return undefined
      }}
      saving={busy}
      saveLabel="اتصال"
    >
      <p className={journeyNoteClass}>{target.intro}</p>
      {candidates.length ? (
        <div className={journeyListClass}>
          {candidates.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={journeyRowButtonClass}
              disabled={busy}
              onClick={() => void connect(entry.id, entry.name)}
            >
              <span className={journeyRowTitleClass}>{getSpreadsheetLabel(entry.name)}</span>
            </button>
          ))}
        </div>
      ) : null}
      <FormField label="لینک شیت" hint="لینک گوگل‌شیت یا شناسهٔ آن را بچسبانید.">
        <input
          dir="ltr"
          value={link}
          onChange={event => setLink(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          autoComplete="off"
        />
      </FormField>
      {picker.available ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11 text-sm"
          loading={picker.opening}
          onClick={openPicker}
        >
          باز کردن شیت با گوگل
        </Button>
      ) : null}
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
    </FormModal>
  )
}
