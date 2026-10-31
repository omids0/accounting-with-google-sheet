import { Fragment } from 'react'

import ForecastMoney from './ForecastMoney'
import type { ForecastAccount } from '../../services/cashForecast'
import { cn, cx } from '../../utils/cn'
import CalmBlock from '../CalmBlock'

const chipClass = cx(
  'focus-ring-inset flex min-h-11 cursor-pointer flex-col items-start justify-center rounded-xl border px-3 py-1',
  'text-start text-[0.8rem] font-semibold transition-colors'
)

const chipOnClass =
  'border-primary bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] text-text'

const chipOffClass = 'border-border bg-bg text-muted'

/**
 * «حساب‌های حساب‌شده»: every wallet account as a switch, and one sentence saying which ones the
 * estimate adds up and which it leaves out, so the starting balance never mixes accounts silently.
 */
export default function ForecastAccountsCard({
  accounts,
  excluded,
  included,
  startBalance,
  onToggle
}: {
  accounts: ForecastAccount[]
  excluded: ReadonlySet<string>
  included: ForecastAccount[]
  startBalance: number
  onToggle: (id: string) => void
}) {
  const left = accounts.filter(account => excluded.has(account.id))

  return (
    <CalmBlock title="حساب‌های حساب‌شده">
      <div
        role="group"
        aria-label="حساب‌هایی که در برآورد می‌آیند"
        className="flex flex-wrap gap-2"
      >
        {accounts.map(account => {
          const on = !excluded.has(account.id)

          return (
            <button
              key={account.id}
              type="button"
              aria-pressed={on}
              aria-label={`${account.title}، ${on ? 'در برآورد هست' : 'بیرون از برآورد'}`}
              className={cn(chipClass, on ? chipOnClass : chipOffClass)}
              onClick={() => onToggle(account.id)}
            >
              <bdi>{account.title}</bdi>
              <span className="text-[0.72rem] font-normal text-muted">
                <ForecastMoney amount={account.balance} />
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 mb-0 text-[0.76rem] leading-[1.8] text-muted">
        {included.length ? (
          <>
            حساب‌شده در برآورد:{' '}
            {included.map((account, index) => (
              <Fragment key={account.id}>
                {index > 0 ? ' + ' : null}
                <bdi>{account.title}</bdi> <ForecastMoney amount={account.balance} />
              </Fragment>
            ))}
            {included.length > 1 ? (
              <>
                {' '}
                = <ForecastMoney amount={startBalance} />
              </>
            ) : null}
            .
          </>
        ) : (
          'هیچ حسابی در برآورد نیست؛ دست‌کم یکی را روشن کن.'
        )}{' '}
        {left.length ? (
          <>
            بیرون از برآورد:{' '}
            {left.map((account, index) => (
              <Fragment key={account.id}>
                {index > 0 ? '، ' : null}
                <bdi>{account.title}</bdi> <ForecastMoney amount={account.balance} />
              </Fragment>
            ))}
            . تکرارهایی که به این حساب‌ها وصل‌اند هم حساب نمی‌شوند.
          </>
        ) : (
          'همهٔ حساب‌های کیف پول داخل برآورد است.'
        )}
      </p>
    </CalmBlock>
  )
}
