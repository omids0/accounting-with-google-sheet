import { formatTrailValue, type AccountName } from './trailText'
import ConfirmActionModal from '../ConfirmActionModal'
import type { RevertPlan, RevertPreview } from '../records/recordRevert'

export interface RevertState {
  /** null while the record is being checked. */
  preview: RevertPreview | null
}

const listClass = 'm-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-[0.85rem] leading-relaxed'

function PlanBody({ plan, accountName }: { plan: RevertPlan; accountName: AccountName }) {
  const deleted = plan.kind === 'delete'
  const rows = deleted ? plan.changes.filter(change => change.to.trim()) : plan.changes

  return (
    <>
      <ul className={listClass}>
        {rows.map(({ field, from, to }) => (
          <li key={field.id} className="[overflow-wrap:anywhere]">
            <span className="font-semibold">{field.label}: </span>
            {deleted ? null : (
              <>
                <bdi>{formatTrailValue(field, from, accountName)}</bdi>
                <span aria-hidden="true"> ← </span>
              </>
            )}
            <bdi className="font-semibold">{formatTrailValue(field, to, accountName)}</bdi>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.78rem] leading-relaxed text-muted">
        {deleted
          ? 'تراکنش دوباره ساخته می‌شود و اثرش روی موجودی حساب هم دوباره اعمال می‌شود. پیوست‌ها و پیوند با چک، قسط یا بدهی برنمی‌گردند.'
          : 'در هر خط: مقدار فعلی ← مقداری که برمی‌گردد. اگر تراکنش روی حساب اثر دارد، موجودی و «گردش حساب» هم اصلاح می‌شود.'}
      </p>
    </>
  )
}

/**
 * The question before a revert: what changes (current ← restored), or why it is refused. The
 * revert itself is `runRecordRevert`; nothing is written until the person confirms here.
 */
export default function RevertTrailModal({
  state,
  accountName,
  confirming,
  onClose,
  onConfirm
}: {
  state: RevertState | null
  accountName: AccountName
  confirming: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const preview = state?.preview
  const refused = preview && !preview.ok ? preview.reason : null

  return (
    <ConfirmActionModal
      open={!!state}
      title="بازگردانی تغییر"
      message={
        refused ??
        (preview
          ? 'این تغییر برگردانده می‌شود و یک ردیف «بازگردانی شد» به فعالیت‌ها اضافه می‌شود:'
          : 'در حال بررسی تراکنش…')
      }
      confirmLabel={preview?.ok ? 'بازگردانی' : 'بستن'}
      cancelLabel="انصراف"
      hideCancel={!preview?.ok}
      confirming={confirming}
      onClose={onClose}
      onConfirm={preview?.ok ? onConfirm : onClose}
    >
      {preview?.ok ? <PlanBody plan={preview.plan} accountName={accountName} /> : null}
    </ConfirmActionModal>
  )
}
