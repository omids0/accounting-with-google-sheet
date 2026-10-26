import { getSpreadsheets } from '../../services/settings'
import {
  connectSharedAccount,
  NOT_A_SHARED_MESSAGE,
  sharedConnectCandidates
} from '../../services/sharedConnect'
import ConnectBuildingSheet, { type ConnectTarget } from '../buildings/ConnectBuildingSheet'

const SHARED_TARGET: ConnectTarget = {
  type: 'shared',
  title: 'اتصال به حساب مشترک',
  intro:
    'اگر شریک‌تان حساب مشترک را با ایمیل شما به اشتراک گذاشته، از فهرست انتخابش کنید، لینکش را بچسبانید یا با گوگل بازش کنید.',
  notMessage: NOT_A_SHARED_MESSAGE,
  connect: connectSharedAccount,
  landing: () => 'shared-home'
}

interface SharedConnectSheetProps {
  open: boolean
  onClose: () => void
  /** The account is listed on this device: open it. */
  onConnected: (spreadsheetId: string) => void
}

/**
 * «اتصال به حساب مشترک» (the invitation's step 2): the building connect sheet with the shared
 * account's words, its Drive candidates («حسابداری · مشترک …») and its type row check.
 */
export default function SharedConnectSheet({
  open,
  onClose,
  onConnected
}: SharedConnectSheetProps) {
  return (
    <ConnectBuildingSheet
      open={open}
      candidates={sharedConnectCandidates(getSpreadsheets())}
      onClose={onClose}
      onConnected={onConnected}
      target={SHARED_TARGET}
    />
  )
}
