import { Component, type ReactNode } from 'react'
import { useLocation } from 'react-router'

import LoadErrorState from '../LoadErrorState'

interface BoundaryProps {
  children: ReactNode
  /** A change of this value (the route) clears a caught error. */
  resetKey: string
}

interface BoundaryState {
  failed: boolean
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <LoadErrorState
        icon="warning"
        message="نمایش این صفحه با خطا روبه‌رو شد؛ اطلاعات شما از بین نرفته است."
        onRetry={() => this.setState({ failed: false })}
      />
    )
  }
}

/**
 * One bad row (an impossible date, a malformed cell) must not blank the whole app: the shell and
 * the menu stay, and the page shows a retry card. Moving to another route clears the error.
 */
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return <Boundary resetKey={pathname}>{children}</Boundary>
}
