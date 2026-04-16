import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      setUser: (user) => set({ user }),
      setProfile: (profile) => {
        const theme = profile?.theme || (profile?.gender === 'female' ? 'female-dark' : 'male')
        document.documentElement.setAttribute('data-theme', theme)
        set({ profile })
      },
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set((s) => ({ profile: s.profile ? { ...s.profile, theme } : s.profile }))
      },
      clearUser: () => {
        document.documentElement.setAttribute('data-theme', 'male')
        set({ user: null, profile: null })
      },
      isProfessional: () =>
        ['nutritionist', 'personal', 'aesthetician'].includes(get().profile?.role),
    }),
    { name: 'vidafit-user', partialize: (s) => ({ profile: s.profile }) }
  )
)
