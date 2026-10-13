import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { version as APP_VERSION } from '../../../package.json'
import { getPathForTab } from '../../routes/paths'
import { selectWhatsNewItems } from '../../services/whatsNew'
import { changelog } from '../about/aboutChangelog'
import { ABOUT_CHANGELOG_ID } from '../about/aboutChangelogGroup'
import FormModal from '../FormModal'
import { whatsNewItemClass, whatsNewListClass, whatsNewMarkClass } from '../ui/updateStyles'

/** «عنوان — توضیح» → the title, with the detail as a muted second line. */
function ChangelogLine({ text }: { text: string }) {
  const [title, detail] = text.split(' — ')

  return (
    <li className={whatsNewItemClass}>
      <span className={whatsNewMarkClass} aria-hidden="true">
        ✦
      </span>
      <span>
        {title}
        {detail && <small>{detail}</small>}
      </span>
    </li>
  )
}

/** «به‌روز شد — نسخه X»: what changed since the version this device last saw. */
export default function WhatsNewSheet({
  lastSeen,
  onDone
}: {
  lastSeen: string
  onDone: () => void
}) {
  const navigate = useNavigate()
  const items = selectWhatsNewItems(changelog, lastSeen, APP_VERSION)

  useEffect(() => {
    if (items.length === 0) onDone()
  }, [items.length, onDone])

  if (items.length === 0) return null

  return (
    <FormModal
      open
      title={`به‌روز شد — نسخه ${APP_VERSION}`}
      onClose={onDone}
      onSubmit={event => {
        event.preventDefault()
        onDone()
      }}
      saveLabel="باشه"
      cancelLabel="همه تغییرات"
      onCancel={() => {
        onDone()
        navigate(`${getPathForTab('about')}#${ABOUT_CHANGELOG_ID}`)
      }}
    >
      <ul className={whatsNewListClass}>
        {items.map(item => (
          <ChangelogLine key={item} text={item} />
        ))}
      </ul>
    </FormModal>
  )
}
