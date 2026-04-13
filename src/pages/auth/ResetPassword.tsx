import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import logoAlyzia from '@/logoalyzia.png'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const ok = await resetPassword(email)
    setLoading(false)
    if (ok) setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <img src={logoAlyzia} alt="Alyzia" className="w-10 h-10 object-contain" />
        <div>
          <div className="text-lg font-semibold text-gray-900">Alyzia</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Réinitialisation</div>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email envoyé</h2>
            <p className="text-sm text-gray-500 mb-6">
              Consultez votre boîte mail <strong>{email}</strong> et cliquez sur le lien de réinitialisation.
            </p>
            <Link to="/login" className="text-sm text-brand hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Mot de passe oublié</h1>
            <p className="text-sm text-gray-500 mb-6">
              Entrez votre email professionnel pour recevoir un lien de réinitialisation.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@groupe.fr"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                             placeholder:text-gray-400 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand hover:bg-brand-dark text-white font-medium
                           py-2.5 px-4 rounded-lg text-sm transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
                ← Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
