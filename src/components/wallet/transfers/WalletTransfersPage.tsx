import { useMemo } from 'react'

import TransferFormModal from './TransferFormModal'
import TransferListItem from './TransferListItem'
import { useTransferModal } from './useTransferModal'
import { useTransfers } from './useTransfers'
import { useIncrementalList } from '../../../hooks/useIncrementalList'
import { useRegisterPageSpeedDial } from '../../../hooks/usePageSpeedDial'
import { useWorkspaceType } from '../../../hooks/useWorkspaceType'
import { isConfigured } from '../../../services/settings'
import { listCountLabel } from '../../../utils/listCountLabel'
import EmptyState from '../../EmptyState'
import ShowMoreFooter from '../../ShowMoreFooter'
import { RecordListSkeleton } from '../../skeleton'
import SpeedDialIcon from '../../SpeedDialIcon'
import Card from '../../ui/Card'
import { listModulePageClass } from '../../ui/featureCardStyles'
import { recordsListCountClass, recordsListHeaderClass } from '../../ui/recordsStyles'

/** `/wallet/transfers` — «انتقال‌ها»: the moves between the user's own accounts, with delete. */
export default function WalletTransfersPage() {
  const personal = useWorkspaceType() === 'personal'
  const { transfers, accounts, loading, deletingId, reload, remove } = useTransfers()
  const { canTransfer, openTransfer, modalProps } = useTransferModal()
  const { visible, remaining, nextStep, showMore } = useIncrementalList(transfers)

  const speedDial = useMemo(
    () => ({
      ariaLabel: 'عملیات انتقال‌ها',
      actions: [
        ...(canTransfer
          ? [
              {
                id: 'add',
                label: 'ثبت انتقال',
                icon: <SpeedDialIcon name="add" />,
                onClick: () => openTransfer(),
                headerLabel: '+ ثبت انتقال'
              }
            ]
          : []),
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: () => void reload(),
          disabled: loading
        }
      ]
    }),
    [canTransfer, loading, openTransfer, reload]
  )

  useRegisterPageSpeedDial(isConfigured() && personal ? speedDial : null)

  if (!isConfigured()) {
    return <EmptyState icon="wallet" message="ابتدا با گوگل وارد شوید" />
  }

  return (
    <div className={listModulePageClass}>
      {loading && transfers.length === 0 ? (
        <RecordListSkeleton />
      ) : transfers.length === 0 ? (
        <EmptyState
          icon="swap"
          message="هنوز انتقالی ثبت نشده"
          description={
            accounts.length < 2
              ? 'برای انتقال حداقل دو حساب لازم است.'
              : 'پولی که بین حساب‌های خودت جابه‌جا می‌کنی، مثل برداشت از بانک برای کیف نقد، این‌جا می‌آید. درآمد یا هزینه حساب نمی‌شود.'
          }
          action={canTransfer ? { label: 'ثبت انتقال', onClick: () => openTransfer() } : undefined}
        />
      ) : (
        <Card className="records-list-card">
          <div className={recordsListHeaderClass}>
            <span>انتقال‌ها</span>
            <span className={recordsListCountClass}>
              {listCountLabel(visible.length, transfers.length, 'انتقال')}
            </span>
          </div>
          {visible.map((transfer, index) => (
            <TransferListItem
              key={transfer.id}
              transfer={transfer}
              accounts={accounts}
              index={index}
              deleting={deletingId === transfer.id}
              onDelete={remove}
            />
          ))}
          <ShowMoreFooter
            remaining={remaining}
            nextStep={nextStep}
            onShowMore={showMore}
            unit="انتقال"
          />
        </Card>
      )}

      <TransferFormModal {...modalProps} />
    </div>
  )
}
