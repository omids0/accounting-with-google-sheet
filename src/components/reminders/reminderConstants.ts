export const DAYS_BEFORE_OPTIONS = [
  { value: '0', label: 'همان روز موعد' },
  { value: '1', label: '۱ روز قبل' },
  { value: '2', label: '۲ روز قبل' },
  { value: '3', label: '۳ روز قبل' },
  { value: '7', label: '۷ روز قبل' }
]

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`
}))

export const MINUTE_OPTIONS = [
  { value: '0', label: '00' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
  { value: '45', label: '45' }
]
