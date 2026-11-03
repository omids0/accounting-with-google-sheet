import { useLocation } from 'react-router'

import ParentGrantCard from './ParentGrantCard'
import ParentRows from './ParentRows'
import { useParentsHome } from './useParentsHome'
import { parseParentInviteParam } from '../../services/parentInvite'
import { isConfigured } from '../../services/settings'
import EmptyState from '../EmptyState'
import { listModulePageClass } from '../ui/featureCardStyles'

/**
 * «والدین من» (personal workspace, the teenager's side): who can see this account right now, the
 * fixed sentence that only the parent can end it (no remove button), and the form that gives a
 * parent access after reading exactly what they see. Opened from a parent's invite link
 * (`?parent=`), the e-mail is already filled in.
 */
export default function ParentsHomePage() {
  const { search } = useLocation()
  const home = useParentsHome(parseParentInviteParam(search) ?? '')

  if (!isConfigured()) return <EmptyState icon="lock" message="ابتدا با گوگل وارد شوید" />

  return (
    <div className={listModulePageClass}>
      <ParentRows parents={home.parents} checking={home.checking} />
      <ParentGrantCard
        email={home.email}
        onEmailChange={home.setEmail}
        consent={home.consent}
        onConsentChange={home.setConsent}
        error={home.error}
        granting={home.granting}
        canGrant={home.canGrant}
        onGrant={() => void home.grant()}
      />
    </div>
  )
}
