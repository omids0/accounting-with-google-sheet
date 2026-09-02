import { useEffect, useState } from 'react'

import { getDataRevision, subscribeDataRevision } from '../services/dataRevision'

export function useDataRefresh(): number {
  const [revision, setRevision] = useState(getDataRevision)

  useEffect(() => subscribeDataRevision(() => setRevision(getDataRevision())), [])

  return revision
}
