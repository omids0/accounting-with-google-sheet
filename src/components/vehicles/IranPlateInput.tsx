import { useEffect, useMemo, useState } from 'react'

import {
  IRAN_PLATE_LETTERS,
  parseIranPlate,
  sanitizeIranPlatePart,
  serializeIranPlate,
  type IranPlateParts
} from './iranPlateUtils'
import './iranPlate.css'
import { cn } from '../../utils/cn'

type IranPlateInputProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

function partsFromValue(value: string): IranPlateParts {
  const parsed = parseIranPlate(value)

  if (parsed.legacy) {
    return {
      province: '',
      number: '',
      letter: '',
      serial: ''
    }
  }

  return {
    province: parsed.province,
    number: parsed.number,
    letter: parsed.letter,
    serial: parsed.serial
  }
}

function PlateFlagBand() {
  return (
    <div className="iran-plate__flag" aria-hidden="true">
      <div className="iran-plate__flag-bars">
        <span className="iran-plate__flag-bar--green" />
        <span className="iran-plate__flag-bar--white" />
        <span className="iran-plate__flag-bar--red" />
      </div>
      <span className="iran-plate__flag-label">IR IRAN</span>
    </div>
  )
}

/** Real plate: flag (left) | ## X ### (center) | ایران / province (right) */
export default function IranPlateInput({ value, onChange, className }: IranPlateInputProps) {
  const [parts, setParts] = useState<IranPlateParts>(() => partsFromValue(value))

  useEffect(() => {
    setParts(partsFromValue(value))
  }, [value])

  const legacyPlate = useMemo(() => parseIranPlate(value).legacy, [value])

  const updatePart = (key: keyof IranPlateParts, nextValue: string) => {
    const nextParts = {
      ...parts,
      [key]: sanitizeIranPlatePart(key, nextValue)
    }

    setParts(nextParts)
    onChange(serializeIranPlate(nextParts))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {legacyPlate ? (
        <p className="text-[0.78rem] text-muted">
          پلاک قبلی: {legacyPlate} — با پر کردن بخش‌ها، پلاک جدید جایگزین می‌شود.
        </p>
      ) : null}

      <div className="flex justify-center sm:justify-start">
        <div className="iran-plate" role="group" aria-label="پلاک خودرو">
          <PlateFlagBand />

          <div className="iran-plate__main">
            <input
              type="text"
              inputMode="numeric"
              value={parts.serial}
              onChange={event => updatePart('serial', event.target.value)}
              placeholder="12"
              maxLength={2}
              className="iran-plate__input"
              style={{ minWidth: '1.8rem', maxWidth: '2.2rem' }}
              aria-label="دو رقم"
            />

            <select
              value={parts.letter}
              onChange={event => updatePart('letter', event.target.value)}
              className="iran-plate__select"
              style={{ minWidth: '1.5rem', maxWidth: '1.7rem' }}
              aria-label="حرف"
            >
              <option value="">—</option>
              {IRAN_PLATE_LETTERS.map(letter => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>

            <input
              type="text"
              inputMode="numeric"
              value={parts.number}
              onChange={event => updatePart('number', event.target.value)}
              placeholder="345"
              maxLength={3}
              className="iran-plate__input"
              style={{ minWidth: '2.6rem', maxWidth: '3.2rem' }}
              aria-label="سه رقم"
            />
          </div>

          <div className="iran-plate__region">
            <span className="iran-plate__iran-label" aria-hidden="true">
              ایران
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={parts.province}
              onChange={event => updatePart('province', event.target.value)}
              placeholder="67"
              maxLength={2}
              className="iran-plate__input iran-plate__province-input"
              aria-label="کد استان"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
