import { useNavigate } from 'react-router'

import EmptyState from '../components/EmptyState'

/** `*`: a URL no page answers to. Intentional redirects (workspace guard) happen before this. */
export default function NotFoundRoute() {
  const navigate = useNavigate()

  return (
    <EmptyState
      icon="search"
      message="صفحه پیدا نشد"
      description="نشانی این صفحه درست نیست یا دیگر وجود ندارد."
      action={{
        label: 'بازگشت به داشبورد',
        icon: 'dashboard',
        onClick: () => navigate('/', { replace: true })
      }}
    />
  )
}
