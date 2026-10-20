import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import BuildingFundHero from './BuildingFundHero'
import FundAccountDetailSheet from './FundAccountDetailSheet'
import FundAccountRow from './FundAccountRow'
import FundAccountSheet from './FundAccountSheet'
import FundLedgerList from './FundLedgerList'
import FundReconcileSheet from './FundReconcileSheet'
import { fundAccountDraft } from './fundRows'
import { useBuildingFund } from './useBuildingFund'
import { useFundActions } from './useFundActions'
import { useRoutedCards } from './useRoutedCards'
import { createPageSpeedDialActions } from '../../hooks/pageSpeedDialActions'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { getPathForTab } from '../../routes/paths'
import { monthName } from '../../services/buildingMonths'
import { isConfigured } from '../../services/settings'
import { toPersianDigits } from '../../utils/normalizeDigits'
import CalmBlock from '../CalmBlock'
import MonthlyFlowChartSection from '../charts/MonthlyFlowChartSection'
import EmptyState from '../EmptyState'
import { calmListClass, calmNoteClass } from '../ui/calmListStyles'
import { chartTitleClass } from '../ui/chartStyles'
import { listModulePageClass } from '../ui/featureCardStyles'
import { useWalletReconcile } from '../wallet/useWalletReconcile'
import WalletSmsReconcileStatus from '../wallet/WalletSmsReconcileStatus'

/**
 * «صندوق»: the wallet of the building. The sum of its accounts is the hero, with what came in
 * minus what went out this month and a six-month trend (transfers and corrections left out);
 * each account shows its balance and whether it agrees with the bank SMS; the ledger lists the
 * newest balance changes. A balance is never typed over: «تطبیق موجودی با بانک» writes a record.
 */
export default function BuildingFundPage({ active = true }: { active?: boolean }) {
  const navigate = useNavigate()
  const fund = useBuildingFund()
  const { can } = useBuildingAccess()
  const actions = useFundActions(fund.accounts, fund.reload)
  const reconcile = useWalletReconcile(fund.accounts)
  const cards = useRoutedCards()

  const { sheet, setSheet, accountOf } = actions

  const thisMonth = fund.trend[fund.trend.length - 1]

  const titles = useMemo(
    () => new Map(fund.accounts.map(account => [account.id, account.title])),
    [fund.accounts]
  )

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات صندوق',
      actions: createPageSpeedDialActions({
        onAdd: () => setSheet({ kind: 'new' }),
        addLabel: 'حساب جدید',
        onRefresh: () => void fund.reload(),
        refreshDisabled: fund.loading,
        readOnly: !can('settings')
      }).filter(action => !action.disabled)
    }),
    [can, fund, setSheet]
  )

  useRegisterPageSpeedDial(isConfigured() ? speedDial : null, active)

  if (!isConfigured()) return <EmptyState icon="wallet" message="ابتدا با گوگل وارد شوید" />

  return (
    <div className={listModulePageClass}>
      <BuildingFundHero
        accounts={fund.accounts}
        flow={{ income: thisMonth?.income ?? 0, expense: thisMonth?.expense ?? 0, expenseCount: 0 }}
        monthName={thisMonth ? monthName(thisMonth.monthKey) : ''}
      />

      {fund.trend.some(item => item.income || item.expense) ? (
        <MonthlyFlowChartSection
          data={fund.trend}
          header={<h3 className={chartTitleClass}>روند ۶ ماه · وصول و هزینه</h3>}
        />
      ) : null}

      <CalmBlock
        title="حساب‌ها"
        action={
          can('settings')
            ? { label: '+ حساب جدید', onClick: () => setSheet({ kind: 'new' }) }
            : undefined
        }
      >
        {fund.accounts.length ? (
          <ul className={calmListClass}>
            {fund.accounts.map(account => {
              const view = can('record') ? reconcile.viewFor(account.id) : null

              return (
                <FundAccountRow
                  key={account.id}
                  account={account}
                  onOpen={() => setSheet({ kind: 'detail', accountId: account.id })}
                  status={
                    view ? (
                      <WalletSmsReconcileStatus
                        {...view}
                        onFind={() =>
                          navigate(
                            getPathForTab('wallet-reconcile', { walletAccountId: account.id }),
                            {
                              state: { title: `تطبیق ${account.title}` }
                            }
                          )
                        }
                        onIgnore={() => reconcile.ignore(account.id)}
                      />
                    ) : null
                  }
                />
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon="wallet"
            message="هنوز حسابی برای صندوق نیست"
            description="حساب بانکی یا نقدی ساختمان را اضافه کن تا موجودی صندوق جلوی چشمت باشد."
            action={
              can('settings')
                ? { label: 'افزودن حساب', onClick: () => setSheet({ kind: 'new' }) }
                : undefined
            }
          />
        )}
        <p className={calmNoteClass}>
          لمس حساب: تطبیق موجودی با بانک، ویرایش نام و کارت، رکوردهای همان حساب.
          {cards.length
            ? ` پیامک‌های کارت ${cards.map(toPersianDigits).join(' و ')} به این ساختمان می‌آید.`
            : ''}
        </p>
      </CalmBlock>

      <CalmBlock title="دفتر">
        <FundLedgerList entries={fund.ledger} accountTitles={titles} />
      </CalmBlock>

      <FundAccountDetailSheet
        account={sheet?.kind === 'detail' ? accountOf : null}
        onReconcile={account => setSheet({ kind: 'reconcile', accountId: account.id })}
        onEdit={account => setSheet({ kind: 'edit', accountId: account.id })}
        onClose={() => setSheet(null)}
      />
      <FundReconcileSheet
        account={sheet?.kind === 'reconcile' ? accountOf : null}
        saving={actions.saving}
        onSave={(real, note) => accountOf && void actions.saveCorrection(accountOf, real, note)}
        onClose={() => setSheet(null)}
      />
      <FundAccountSheet
        open={sheet?.kind === 'edit' || sheet?.kind === 'new'}
        account={sheet?.kind === 'edit' && accountOf ? fundAccountDraft(accountOf) : null}
        canDelete={false}
        fixedBalance
        onSave={draft => void actions.saveAccount(draft)}
        onDelete={() => undefined}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
