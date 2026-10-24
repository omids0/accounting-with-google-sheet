type UpdateMileageToggleProps = {
  /** Whether saving also moves the vehicle's current mileage to the entered one. */
  checked: boolean
  onChange: (update: boolean) => void
  /** The vehicle's current mileage, km. */
  currentMileage: number
}

/**
 * «کارکرد خودرو هم به‌روز شود»: shared by the service, mechanic and periodic forms. Off means
 * the entry is only history, so a mileage below the vehicle's current one is accepted.
 */
export default function UpdateMileageToggle({
  checked,
  onChange,
  currentMileage
}: UpdateMileageToggleProps) {
  const current = `${currentMileage.toLocaleString('fa-IR')} کیلومتر`

  return (
    <label className="flex cursor-pointer items-start gap-2 text-[0.85rem] text-primary">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span>
        کارکرد خودرو هم به‌روز شود
        <span className="mt-0.5 block text-[0.78rem] font-normal text-muted">
          {checked
            ? `کارکرد فعلی خودرو (${current}) به کارکرد این ثبت تغییر می‌کند و نباید از آن کمتر باشد.`
            : `کارکرد فعلی خودرو (${current}) همان می‌ماند و کارکرد کمتر هم قابل ثبت است؛ مناسب ثبت سابقه.`}
        </span>
      </span>
    </label>
  )
}
