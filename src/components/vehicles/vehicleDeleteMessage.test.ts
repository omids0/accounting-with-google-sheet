import { describe, expect, it } from 'vitest'

import { vehicleDeleteMessage } from './vehicleDeleteMessage'

describe('vehicleDeleteMessage', () => {
  it('names what stays behind and says it is not deleted', () => {
    const message = vehicleDeleteMessage({ services: 3, deadlines: 0, records: 9 })

    expect(message).toContain('۳ سرویس و ۹ ثبت')
    expect(message).toContain('پاک نمی‌شوند')
    expect(message).not.toContain('موعد')
  })

  it('lists three kinds with a comma and «و»', () => {
    expect(vehicleDeleteMessage({ services: 1, deadlines: 2, records: 3 })).toContain(
      '۱ سرویس، ۲ موعد و ۳ ثبت'
    )
  })

  it('is the plain question for a vehicle with nothing or while the counts are unknown', () => {
    expect(vehicleDeleteMessage({ services: 0, deadlines: 0, records: 0 })).toBe(
      'از حذف این خودرو مطمئن هستید؟'
    )
    expect(vehicleDeleteMessage(null)).toBe('از حذف این خودرو مطمئن هستید؟')
  })
})
