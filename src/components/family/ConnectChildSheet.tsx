import { connectChildAccount } from '../../services/childConnect'
import { isPickerAvailable } from '../../services/googlePicker'
import ConnectBuildingSheet, { type ConnectTarget } from '../buildings/ConnectBuildingSheet'

const NOT_A_CHILD_MESSAGE = 'این شیت حساب شخصی یک فرد نیست'

/** The «باز کردن شیت با گوگل» button exists only where the Picker does (the web), so say so only there. */
function childIntro(): string {
  const how = isPickerAvailable()
    ? 'حسابش را با «باز کردن شیت با گوگل» پیدا کنید یا لینک شیت را بچسبانید.'
    : 'لینک شیت او را بچسبانید.'

  return `بعد از این‌که فرزندتان از منوی «والدین من» به ایمیل شما اجازه داد، ${how} فقط می‌بینید و چیزی را تغییر نمی‌دهید.`
}

const CHILD_TARGET: ConnectTarget = {
  type: 'child',
  title: 'اتصال حساب فرزند',
  intro: '',
  notMessage: NOT_A_CHILD_MESSAGE,
  connect: async (spreadsheetId, title) =>
    (await connectChildAccount(spreadsheetId, undefined, { title })) !== null,
  landing: () => 'child-home',
  pickOnly: true
}

interface ConnectChildSheetProps {
  open: boolean
  onClose: () => void
  /** The account is listed on this device (the home asks for the child's name next). */
  onConnected: (spreadsheetId: string) => void
}

/**
 * «اتصال حساب فرزند»: the building connect sheet with a child's words. Many children are allowed,
 * so there is no one-account message. The sheet is only read (its type row), never opened here.
 */
export default function ConnectChildSheet({ open, onClose, onConnected }: ConnectChildSheetProps) {
  return (
    <ConnectBuildingSheet
      open={open}
      candidates={[]}
      onClose={onClose}
      onConnected={onConnected}
      target={{ ...CHILD_TARGET, intro: childIntro() }}
    />
  )
}
