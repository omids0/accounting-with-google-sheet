import { useEffect } from 'react'

import { prefetchBottomNavPages } from '../routes/prefetchPages'

export function usePrefetchAppPages(): void {
  useEffect(() => {
    prefetchBottomNavPages()
  }, [])
}
