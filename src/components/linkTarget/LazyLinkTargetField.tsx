import { lazy, Suspense, type ComponentProps } from 'react'

import LinkTargetPlaceholder from './LinkTargetPlaceholder'

/** The picker loads only when a «بدهی»/«طلب» record asks for it, so other entries never pay for it. */
const LinkTargetField = lazy(() => import('./LinkTargetField'))

export default function LazyLinkTargetField(props: ComponentProps<typeof LinkTargetField>) {
  const { kind } = props.link

  // Nothing to show for a category that cannot link: the chunk is not even requested.
  if (!kind) return null

  return (
    <Suspense
      fallback={
        <LinkTargetPlaceholder
          label={kind.fieldLabel}
          childLabel={kind.childLabel}
          hint={props.link.expectEmpty ? kind.emptyHint : undefined}
        />
      }
    >
      <LinkTargetField {...props} />
    </Suspense>
  )
}
