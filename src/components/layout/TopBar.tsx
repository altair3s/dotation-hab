import { Link, useLocation } from 'react-router-dom'
import logoAlyzia from '@/logoalyzia.png'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { supabase } from '@/services/supabase'
import toast from 'react-hot-toast'

const NAV_SALARIE = [
  { label: 'Catalogue',   path: '/catalogue' },
  { label: 'Ma commande', path: '/commande' },
  { label: 'Historique',  path: '/historique' },
]

const NAV_ADMIN = [
  { label: 'Tableau de bord', path: '/admin/dashboard' },
  { label: 'Stocks',          path: '/admin/stocks' },
  { label: 'Catalogue',       path: '/admin/catalogue' },
  { label: 'Salariés',        path: '/admin/salaries' },
  { label: 'Commandes',       path: '/admin/commandes' },
  { label: 'Documents',       path: '/admin/documents' },
]

export default function TopBar() {
  const profil = useAuthStore((s) => s.profil)
  const { pts_total: cartPts, itemCount } = useCartStore()

  const logout = async () => {
    await supabase.auth.signOut()
    toast.success('Vous avez été déconnecté')
  }
  const location = useLocation()

  const isAdmin = profil?.role === 'admin_filiale' || profil?.role === 'admin_groupe'
  const navItems = isAdmin ? NAV_ADMIN : NAV_SALARIE

  // Points restants depuis le profil (dotation courante)
  // Note: dans Sprint 2 on branchera sur la vraie dotation via React Query
  const ptsRestants = 340 // placeholder

  const initiales = profil
    ? `${profil.prenom[0]}${profil.nom[0]}`.toUpperCase()
    : '??'

  return (
    <header className="bg-teal-700 text-white sticky top-0 z-50 h-13">
      <div className="flex items-center h-13 px-5 gap-0">

        {/* Logo */}
        <Link to={isAdmin ? '/admin/dashboard' : '/catalogue'} className="flex items-center gap-2.5 mr-8">
          <img src={logoAlyzia} alt="Alyzia" className="w-8 h-8 object-contain flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold leading-tight">
              {import.meta.env.VITE_APP_NAME || 'Alyzia'}
            </div>
            <div className="text-[10px] text-teal-200 uppercase tracking-wider leading-tight">
              {isAdmin ? 'Administration' : 'Espace salarié'}
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center h-13 gap-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 h-13 flex items-center text-sm transition-colors border-b-2 ${
                  isActive
                    ? 'text-white border-gold-200'
                    : 'text-teal-100 border-transparent hover:text-white'
                }`}
              >
                {item.label}
                {item.path === '/commande' && itemCount() > 0 && (
                  <span className="ml-1.5 bg-gold-200 text-teal-800 text-[10px] font-semibold
                                   px-1.5 py-0.5 rounded-full leading-none">
                    {itemCount()}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Droite */}
        <div className="ml-auto flex items-center gap-3">
          {/* Points (salarié uniquement) */}
          {!isAdmin && (
            <Link to="/commande" className="points-chip text-xs">
              <span className="w-3 h-3 bg-gold-200 rounded-full inline-block" />
              <span>{ptsRestants} pts restants</span>
              {cartPts > 0 && (
                <span className="text-gold-600">· {cartPts} en cours</span>
              )}
            </Link>
          )}

          {/* Filiale badge */}
          {profil?.filiale && (
            <span className="text-xs text-teal-200 hidden md:block">
              {profil.filiale.nom}
            </span>
          )}

          {/* Avatar + déconnexion */}
          <div className="relative group">
            <button className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center
                               text-teal-700 text-xs font-semibold hover:bg-teal-50 transition-colors">
              {initiales}
            </button>
            {/* Dropdown */}
            <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-xl
                            shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible
                            transition-all duration-150 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900">
                  {profil?.prenom} {profil?.nom}
                </div>
                <div className="text-xs text-gray-500">{profil?.email}</div>
              </div>
              <Link
                to={isAdmin ? '/admin/profil' : '/profil'}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Mon profil
              </Link>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
