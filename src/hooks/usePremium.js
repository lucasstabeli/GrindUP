import { useUserStore } from '../stores/useUserStore'

export function usePremium() {
  const { profile } = useUserStore()

  if (!profile) return { isPremium: false, isInTrial: false, isActive: false, daysLeft: 0 }

  const now = new Date()
  const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isInTrial = !!(trialEnd && trialEnd > now)
  const isActive = profile.subscription_status === 'active'
  const isPremium = isInTrial || isActive

  const daysLeft = isInTrial
    ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
    : 0

  return { isPremium, isInTrial, isActive, daysLeft }
}
