import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import logoAlyzia from '@/logoalyzia.png'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const loading = useAuthStore((s) => s.loading)
  const [submitting, setSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect')
      } else {
        toast.error(`Erreur de connexion : ${error.message}`)
      }
      setSubmitting(false)
    }
    // En cas de succès : onAuthStateChange dans AppRoutes gère la navigation
  }

  const isLoading = loading || submitting

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <img src={logoAlyzia} alt="Alyzia" className="w-10 h-10 object-contain" />
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {import.meta.env.VITE_APP_NAME || 'Alyzia'}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {import.meta.env.VITE_GROUP_NAME || 'Gestion des dotations'}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Connexion</h1>
        <p className="text-sm text-gray-500 mb-6">
          Accédez à votre espace dotation
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@groupe.fr"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                         placeholder:text-gray-400 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <Link
                to="/reset-password"
                className="text-xs text-brand hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                         placeholder:text-gray-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium
                       py-2.5 px-4 rounded-lg text-sm transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Problème de connexion ? Contactez votre administrateur RH ou&nbsp;
        <a href="mailto:support@groupe.fr" className="text-brand hover:underline">
          support@groupe.fr
        </a>
      </p>
    </div>
  )
}
