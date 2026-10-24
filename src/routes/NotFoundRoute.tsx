import { useNavigate } from 'react-router'

import EmptyState from '../components/EmptyState'

/** `*`: a URL no page answers to. Intentional redirects (workspace guard) happen before this. */
export default function NotFoundRoute() {
  const navigate = useNavigate()

  return (
    <EmptyState
      icon="search"
      message={
        <>
          <b className="block text-text">صفحه پیدا نشد</b>
          <span className="mt-1 block text-[0.8rem] text-muted">
            نشانی این صفحه درست نیست یا دیگر وجود ندارد.
          </span>
        </>
      }
      action={{
        label: 'بازگشت به داشبورد',
        icon: 'dashboard',
        onClick: () => navigate('/', { replace: true })
      }}
    />
  )
}
