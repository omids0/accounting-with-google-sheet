import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { getUserEmail } from '../../services/auth'
import { buildParentInviteText } from '../../services/parentInvite'
import { APP_DOWNLOAD_URL, APP_URL } from '../../utils/appLinks'
import { shareText } from '../../utils/shareText'
import FormModal from '../FormModal'
import { journeyNoteClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import { formErrorClass } from '../ui/formStyles'

interface InviteChildSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * «دعوت فرزند»: the text a parent sends their child. It carries the parent's Google e-mail (the
 * one the child must give access to) and the app link with `?parent=`, so the child's «والدین من»
 * opens with the e-mail filled in. Shared with the system share sheet, or copied.
 */
export default function InviteChildSheet({ open, onClose }: InviteChildSheetProps) {
  const { copy } = useCopyToClipboard()
  const email = getUserEmail() ?? ''

  const text = email
    ? buildParentInviteText(email, APP_URL, { downloadUrl: APP_DOWNLOAD_URL || undefined })
    : ''

  return (
    <FormModal
      open={open}
      title="دعوت فرزند"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        return shareText(text, 'دعوت به حساب کتاب')
      }}
      saveLabel="ارسال دعوت"
      saveDisabled={!text}
      cancelLabel="بستن"
    >
      <p className={journeyNoteClass}>
        این متن را برای فرزندتان بفرستید. او خودش تصمیم می‌گیرد و فقط با اجازهٔ او حسابش را
        می‌بینید.
      </p>
      {text ? (
        <>
          <textarea
            readOnly
            dir="rtl"
            rows={9}
            value={text}
            aria-label="متن دعوت"
            className="w-full rounded-[var(--radius-sm)] border border-border bg-bg p-3 text-sm leading-[1.9] text-text"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11 text-sm"
            onClick={() => void copy(text, 'متن دعوت کپی شد')}
          >
            کپی متن دعوت
          </Button>
        </>
      ) : (
        <p className={formErrorClass} role="alert">
          ایمیل حساب گوگل شما پیدا نشد؛ یک بار خارج شوید و دوباره وارد شوید.
        </p>
      )}
    </FormModal>
  )
}
