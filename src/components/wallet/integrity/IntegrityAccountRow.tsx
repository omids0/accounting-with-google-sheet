import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useIsAmountsHidden } from '../../../hooks/useAmountsHidden'
import { getPathForTab } from '../../../routes/paths'
import { INTEGRITY_FIX_TITLE } from '../../../services/integrityFix'
import type { AccountIntegrity } from '../../../services/integrityTypes'
import { cn } from '../../../utils/cn'
import { formatMoney } from '../../../utils/formatMoney'
import { formatIsoDatePersian } from '../../../utils/jalaliDate'
import ConfirmActionModal from '../../ConfirmActionModal'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import {
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../../ui/calmListStyles'
import { maskAmountsInText } from '../trace/traceMask'

interface IntegrityAccountRowProps {
  check: AccountIntegrity
  fixing: boolean
  onFix: (check: AccountIntegrity) => Promise<boolean>
}

const textClass = 'm-0 text-[0.82rem] leading-[1.9] text-muted'

function Money({ amount, signed }: { amount: number; signed?: 'plus' }) {
  return (
    <bdi>
      <MoneyText amount={amount} signed={signed} />
    </bdi>
  )
}

/** Where the history stops adding up, in one sentence. */
function SuspectLine({ check }: { check: AccountIntegrity }) {
  const { suspect } = check

  if (!suspect) return null

  const when = suspect.date ? ` · ${formatIsoDatePersian(suspect.date)}` : ''

  return (
    <p className={textClass}>
      {suspect.afterLast ? (
        <>
          بعد از آخرین ردیف گردش («{suspect.title}»{when}) موجودی به اندازهٔ{' '}
          <Money amount={suspect.gap} signed="plus" /> بدون ثبت ردیف عوض شده.
        </>
      ) : (
        <>
          از ردیف «{suspect.title}»{when} به بعد، موجودی ردیف‌ها به اندازهٔ{' '}
          <Money amount={suspect.gap} signed="plus" /> با ردیف قبلی‌اش نمی‌خواند.
        </>
      )}
    </p>
  )
}

/** One account: the two numbers side by side; tap to read where they part and what can be done. */
export default function IntegrityAccountRow({ check, fixing, onFix }: IntegrityAccountRowProps) {
  const navigate = useNavigate()
  const hidden = useIsAmountsHidden()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { derived, difference } = check

  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        className={cn(
          calmRowClass,
          'w-full cursor-pointer border-0 bg-transparent p-0 text-start first:border-t-0'
        )}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className={calmRowMainClass}>
          <span className={cn(calmRowTitleClass, open && 'whitespace-normal!')}>{check.title}</span>
          <span className={cn(calmRowSubClass, 'whitespace-normal')}>
            ثبت‌شده <Money amount={check.stored} />
            {derived !== null ? (
              <>
                {' · '}گردش <Money amount={derived} />
              </>
            ) : (
              ' · بدون گردش'
            )}
          </span>
        </span>
        <span className={cn(calmRowEndClass, difference ? 'text-danger' : 'text-success')}>
          {difference ? (
            <Money amount={difference} signed="plus" />
          ) : derived !== null ? (
            'برابر ✓'
          ) : (
            '—'
          )}
        </span>
        <span
          aria-hidden="true"
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-90')}
        >
          ‹
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 pb-3 ps-1">
          {difference ? (
            <>
              <p className={textClass}>
                ثبت‌شده <Money amount={check.stored} /> است ولی گردش <Money amount={derived ?? 0} />{' '}
                می‌شود؛ اختلاف <Money amount={difference} signed="plus" />.
              </p>
              <SuspectLine check={check} />
              <p className={textClass}>
                این صفحه نمی‌داند کدام درست است: ممکن است موجودی را مستقیم در شیت عوض کرده باشی، یا
                موجودی اولیه غلط باشد.
              </p>
            </>
          ) : (
            <p className={textClass}>
              {derived !== null
                ? 'موجودی ثبت‌شده با جمع گردش حساب برابر است.'
                : 'این حساب گردش حسابی ندارد، پس چیزی برای مقایسه نیست.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11"
              onClick={() =>
                navigate(
                  getPathForTab('wallet-account-detail', { walletAccountId: check.accountId }),
                  { state: { title: check.title } }
                )
              }
            >
              دیدن گردش حساب
            </Button>
            {difference && check.fixable ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11"
                disabled={fixing}
                loading={fixing}
                onClick={() => setConfirming(true)}
              >
                اصلاح با یک رکورد اصلاحی
              </Button>
            ) : null}
          </div>
          {difference && !check.fixable ? (
            <p className={textClass}>
              این فاصله بین دو ردیف باز شده؛ ردیف‌های قبلی بی‌صدا عوض نمی‌شوند، پس اصلاح خودکار
              پیشنهاد نمی‌شود. گردش حساب را نگاه کن.
            </p>
          ) : null}
        </div>
      ) : null}
      <ConfirmActionModal
        open={confirming}
        title="ثبت رکورد اصلاحی"
        message={maskAmountsInText(
          `یک ردیف «${INTEGRITY_FIX_TITLE}» به مبلغ ${formatMoney(difference)} به گردش حساب «${
            check.title
          }» اضافه می‌شود تا گردش با موجودی ثبت‌شده برابر شود. موجودی حساب عوض نمی‌شود، هزینه یا درآمدی ثبت نمی‌شود و ردیف‌های قبلی دست نمی‌خورند. اگر خودِ موجودی ثبت‌شده اشتباه است، به‌جای این کار موجودی را از کارت حساب درست کن.`,
          hidden
        )}
        confirmLabel="ثبت رکورد اصلاحی"
        cancelLabel="فعلاً نه"
        confirming={fixing}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void onFix(check).then(done => done && setConfirming(false))
        }}
      />
    </li>
  )
}
