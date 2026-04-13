import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profil } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profil: Profil | null
  loading: boolean

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfil: (profil: Profil | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profil: null,
      loading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfil: (profil) => set({ profil }),
      setLoading: (loading) => set({ loading }),
      reset: () => set({ user: null, session: null, profil: null, loading: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ profil: state.profil }),
    }
  )
)
