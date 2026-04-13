import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profil, loading } = useAuthStore()

  // Attente init Supabase
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4 7v5c0 5.25 3.4 10.2 8 11.2C16.6 22.2 20 17.25 20 12V7L12 2z"/>
            </svg>
          </div>
          <div className="text-sm text-gray-500">Chargement...</div>
        </div>
      </div>
    )
  }

  // Non connecté
  if (!user) return <Navigate to="/login" replace />

  // Rôle insuffisant
  if (allowedRoles && profil && !allowedRoles.includes(profil.role)) {
    // Redirection vers l'espace approprié
    if (profil.role === 'salarie') return <Navigate to="/catalogue" replace />
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Outlet />
}
