import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Profil } from '@/types'

export function useAuth() {
  const store = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const fetchProfil = useCallback(async (userId: string): Promise<Profil | null> => {
    const { data, error } = await supabase
      .from('profils')
      .select('*, filiale:filiales(*)')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      console.error('Erreur chargement profil:', error)
      return null
    }
    return data as Profil
  }, [])

  // Chargement du profil quand l'utilisateur est connu
  useEffect(() => {
    if (!store.user) return

    fetchProfil(store.user.id).then((profil) => {
      store.setProfil(profil)
      store.setLoading(false)
    })
  }, [store.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation après chargement du profil — uniquement depuis /login
  useEffect(() => {
    if (!store.profil || location.pathname !== '/login') return
    if (store.profil.role === 'salarie') {
      navigate('/catalogue')
    } else {
      navigate('/admin/dashboard')
    }
  }, [store.profil]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialisation de la session Supabase
  useEffect(() => {
    store.setLoading(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      store.setSession(session)
      store.setUser(session?.user ?? null)
      if (!session?.user) {
        store.setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      store.setSession(session)
      store.setUser(session?.user ?? null)

      if (event === 'SIGNED_IN') {
        store.setLoading(true) // profil en cours de chargement
      }

      if (event === 'SIGNED_OUT') {
        store.reset()
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/reset-password`,
    })
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return false
    }
    toast.success('Email de réinitialisation envoyé')
    return true
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return false
    }
    toast.success('Mot de passe mis à jour')
    return true
  }

  return {
    user: store.user,
    profil: store.profil,
    session: store.session,
    loading: store.loading,
    isAuthenticated: !!store.user,
    role: store.profil?.role ?? null,
    isAdminGroupe: store.profil?.role === 'admin_groupe',
    isAdminFiliale: ['admin_groupe', 'admin_filiale'].includes(store.profil?.role ?? ''),
    isSalarie: store.profil?.role === 'salarie',
    resetPassword,
    updatePassword,
  }
}
