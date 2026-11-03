import { lazy, Suspense, useState } from 'react'

import ChildCard from './ChildCard'
import { CHILD_ENTRY } from './childEntry'
import ChildNameSheet from './ChildNameSheet'
import { CHILDREN_EMPTY, forgetChildQuestion } from './familyCopy'
import InviteChildSheet from './InviteChildSheet'
import { useChildrenHome } from './useChildrenHome'
import { useEnterWorkspace } from '../../hooks/useEnterWorkspace'
import type { ChildRecord } from '../../services/childrenRegistry'
import { getChild } from '../../services/childrenRegistry'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import EmptyState from '../EmptyState'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import Button from '../ui/Button'
import { listModulePageClass } from '../ui/featureCardStyles'

const ConnectChildSheet = lazy(() => import('./ConnectChildSheet'))

/**
 * «فرزندان من» (personal workspace): the children this parent follows read-only, each as a card
 * («مشاهده», «تغییر نام», «حذف از فهرست»), «دعوت فرزند» (the text to send) and «اتصال حساب فرزند»
 * (after the child gave access). Several children are allowed.
 */
export default function ChildrenHomePage() {
  const home = useChildrenHome()
  const { enter, entering, modalProps } = useEnterWorkspace(undefined, CHILD_ENTRY)
  const [connect, setConnect] = useState<'open' | 'closed' | null>(null)
  const [inviting, setInviting] = useState(false)
  const [naming, setNaming] = useState<{ child: ChildRecord; isNew: boolean } | null>(null)
  const [removing, setRemoving] = useState<ChildRecord | null>(null)

  const startConnect = () => setConnect('open')

  const actions = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" variant="secondary" onClick={() => setInviting(true)}>
        دعوت فرزند
      </Button>
      <Button type="button" variant="secondary" onClick={startConnect}>
        اتصال حساب فرزند
      </Button>
    </div>
  )

  return (
    <div className={listModulePageClass}>
      {home.children.length === 0 ? (
        <EmptyState
          icon="eye"
          message={CHILDREN_EMPTY.message}
          description={CHILDREN_EMPTY.description}
          action={{ label: 'دعوت فرزند', onClick: () => setInviting(true) }}
          secondaryAction={{ label: 'اتصال حساب فرزند', onClick: startConnect }}
        />
      ) : (
        <>
          {home.children.map(child => (
            <ChildCard
              key={child.id}
              child={child}
              lost={home.lost.has(child.id)}
              opening={entering === child.id}
              onOpen={() => void enter(child.id, 'child-home')}
              onReconnect={startConnect}
              onRename={() => setNaming({ child, isNew: false })}
              onForget={() => setRemoving(child)}
            />
          ))}
          {actions}
        </>
      )}

      <InviteChildSheet open={inviting} onClose={() => setInviting(false)} />

      {/* Loaded on the first tap, then kept mounted so the sheet closes with its animation. */}
      {connect ? (
        <Suspense fallback={null}>
          <ConnectChildSheet
            open={connect === 'open'}
            onClose={() => setConnect('closed')}
            onConnected={id => {
              home.reload()

              const child = getChild(id)

              if (child) setNaming({ child, isNew: true })
            }}
          />
        </Suspense>
      ) : null}

      <ChildNameSheet
        child={naming?.child ?? null}
        isNew={naming?.isNew}
        onClose={() => setNaming(null)}
        onSaved={home.reload}
      />

      <ConfirmDeleteModal
        open={removing !== null}
        title="حذف از فهرست"
        message={removing ? forgetChildQuestion(removing.name) : ''}
        confirmLabel="حذف از فهرست"
        deleting={home.forgetting}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const child = removing

          setRemoving(null)
          if (child) void home.forget(child)
        }}
      />
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
