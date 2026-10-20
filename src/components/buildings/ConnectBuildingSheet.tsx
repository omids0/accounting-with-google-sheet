import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useOpenSheetWithGoogle } from '../../hooks/useOpenSheetWithGoogle'
import { getPathForTab } from '../../routes/paths'
import { connectBuilding, NOT_A_BUILDING_MESSAGE } from '../../services/buildingConnect'
import { isJourneyUnfinished, readJourney } from '../../services/buildingJourney'
import { registerBuildingSpreadsheet } from '../../services/buildingTemplate'
import { getSettings } from '../../services/settings'
import { getSpreadsheetLabel, parseSpreadsheetIdFromUrl } from '../../services/spreadsheetCatalog'
import { switchActiveSpreadsheet } from '../../services/spreadsheetSetup'
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
import {
  journeyListClass,
  journeyNoteClass,
  journeyRowButtonClass,
  journeyRowTitleClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import { formErrorClass } from '../ui/formStyles'

interface ConnectBuildingSheetProps {
  open: boolean
  /** Drive sheets named like a building that this device has not registered. */
  candidates: SpreadsheetEntry[]
  onClose: () => void
  /** Registers a building and enters it (the home's `useEnterBuilding`). */
  onConnected: (spreadsheetId: string) => void
}

/**
 * «اتصال به شیت موجود»: pick a building from the Drive list, paste its link, or open it with
 * Google (the only way the app can reach a sheet someone else shared). A sheet without the type
 * row is refused with «این شیت ساختمان نیست».
 */
export default function ConnectBuildingSheet({
  open,
  candidates,
  onClose,
  onConnected
}: ConnectBuildingSheetProps) {
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const connect = async (spreadsheetId: string, title?: string) => {
    setBusy(true)
    setError(null)
    try {
      if (await connectBuilding(spreadsheetId, title)) {
        onClose()
        onConnected(spreadsheetId)
      } else {
        setError(NOT_A_BUILDING_MESSAGE)
      }
    } catch (err) {
      setError(toUserMessage(err, 'اتصال به شیت ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  const previousRef = useRef('')

  // The picker has already made the sheet active: keep it when it is a building, else go back.
  const picker = useOpenSheetWithGoogle(async pickedId => {
    const previousId = previousRef.current

    if ((await syncWorkspaceTypeFromSheet(pickedId)) === 'building') {
      const name = getSettings()?.spreadsheets?.find(sheet => sheet.id === pickedId)?.name

      registerBuildingSpreadsheet(pickedId, name ?? pickedId)
      await moveSyncToSpreadsheet(previousId, pickedId)
      onClose()
      navigate(
        getPathForTab(
          isJourneyUnfinished(readJourney(pickedId)) ? 'building-setup' : 'building-dashboard'
        )
      )
      bumpSpreadsheetKey()

      return
    }
    setError(NOT_A_BUILDING_MESSAGE)
    if (previousId) {
      await switchActiveSpreadsheet(previousId).catch(() => undefined)
      await moveSyncToSpreadsheet(pickedId, previousId)
      bumpSpreadsheetKey()
    }
  })

  const openPicker = () => {
    previousRef.current = getSettings()?.spreadsheetId ?? ''
    if (previousRef.current && getWorkspaceType(previousRef.current) !== 'building') {
      rememberPersonalSheet(previousRef.current)
    }
    void picker.openWithGoogle()
  }

  return (
    <FormModal
      open={open}
      title="اتصال به شیت موجود"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        const id = parseSpreadsheetIdFromUrl(link)

        if (id) void connect(id)
        else setError('لینک یا شناسهٔ شیت را درست وارد کنید')
      }}
      saving={busy}
      saveLabel="اتصال"
    >
      <p className={journeyNoteClass}>
        اگر مدیر قبلی یا هیئت مدیره شیت ساختمان را با شما به اشتراک گذاشته، از اینجا وصلش کنید.
      </p>
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
