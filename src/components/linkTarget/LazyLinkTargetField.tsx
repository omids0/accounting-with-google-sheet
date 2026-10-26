import { lazy, Suspense, type ComponentProps } from 'react'

/** The picker loads only when a «بدهی»/«طلب» record asks for it, so other entries never pay for it. */
const LinkTargetField = lazy(() => import('./LinkTargetField'))

export default function LazyLinkTargetField(props: ComponentProps<typeof LinkTargetField>) {
  // Nothing to show for a category that cannot link: the chunk is not even requested.
  if (!props.link.kind) return null

  return (
    <Suspense fallback={null}>
      <LinkTargetField {...props} />
    </Suspense>
  )
}
