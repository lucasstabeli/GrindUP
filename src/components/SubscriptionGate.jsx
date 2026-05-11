import { useUserStore } from '../stores/useUserStore'
import Subscription from '../pages/Subscription'

export default function SubscriptionGate({ children }) {
  const { profile } = useUserStore()

  if (!profile) return children

  const now = new Date()
  const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isInTrial = trialEnd && trialEnd > now
  const isActive = profile.subscription_status === 'active'

  if (isInTrial || isActive) return children

  return <Subscription trialEnd={trialEnd} />
}
