import { useSharing } from '../hooks/useSharing'
import { cx } from '../utils/cn'
import { writerAvatarClass, writerTagClass } from './ui/writerStyles'

interface WriterAvatarProps {
  /** Email from «ثبت‌کننده»; rows from before round 8 have none and show nothing. */
  email?: string
  /** Also print the name: with a « · » separator for list row meta, `plain` for a table cell. */
  withName?: boolean | 'plain'
}

/** Who recorded a row; renders only on a spreadsheet more than one account edits. */
export default function WriterAvatar({ email, withName = false }: WriterAvatarProps) {
  const { shared, label } = useSharing()

  if (!shared || !email?.trim()) return null

  const writer = label(email)
  const name = writer.isMe ? 'من' : writer.name
  const className = writerAvatarClass(writer.isMe)

  if (!withName) {
    return (
      <span className={cx(className, 'me-1')} role="img" aria-label={name}>
        {writer.initial}
      </span>
    )
  }

  return (
    <span className={writerTagClass}>
      <span className={className} aria-hidden>
        {writer.initial}
      </span>
      <span>{withName === 'plain' ? name : `${name} · `}</span>
    </span>
  )
}
