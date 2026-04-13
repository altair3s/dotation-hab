import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import type { Dotation, Commande, StatutCommande } from '@/types'
import { formatPoints, formatDate, ptsRestants } from '@/utils/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchDotation(profilId: string): Promise<Dotation | null> {
  const annee = new Date().getFullYear()
  const { data, error } = await supabase
    .from('dotations')
    .select('*')
    .eq('profil_id', profilId)
    .eq('annee', annee)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as Dotation | null
}

async function fetchCommandes(profilId: string): Promise<Commande[]> {
  const { data, error } = await supabase
    .from('commandes')
    .select('*, lignes:commandes_lignes(*, article:articles(nom, reference))')
    .eq('profil_id', profilId)
    .order('date_commande', { ascending: false })
  if (error) throw error
  return data as Commande[]
}

const STATUT_CONFIG: Record<StatutCommande, { label: string; className: string }> = {
  brouillon:       { label: 'Brouillon',       className: 'bg-gray-100 text-gray-600' },
  soumise:         { label: 'En attente',       className: 'bg-blue-50 text-blue-700' },
  validee:         { label: 'Validée',          className: 'bg-teal-50 text-brand' },
  en_preparation:  { label: 'En préparation',   className: 'bg-amber-50 text-amber-700' },
  expediee:        { label: 'Expédiée',         className: 'bg-purple-50 text-purple-700' },
  livree:          { label: 'Livrée',           className: 'bg-green-50 text-green-700' },
  annulee:         { label: 'Annulée',          className: 'bg-red-50 text-red-600' },
}

// ─── Page Commande (Panier) ───────────────────────────────────────────────────

export function Commande() {
  const profil  = useAuthStore((s) => s.profil)
  const { items, pts_total: cartPts, removeItem, updateQuantite, clear } = useCartStore()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const { data: dotation } = useQuery({
    queryKey: ['dotation', profil?.id],
    queryFn: () => fetchDotation(profil!.id),
    enabled: !!profil?.id,
  })

  const pts = dotation ? ptsRestants(dotation.pts_total, dotation.pts_consommes) : 0
  const ptsApres = pts - cartPts
  const peutCommander = items.length > 0 && ptsApres >= 0 && !!profil

  const handleSubmit = async () => {
    if (!profil || !peutCommander) return
    setSubmitting(true)
    try {
      // 1. Créer la commande
      const { data: commande, error: errCmd } = await supabase
        .from('commandes')
        .insert({ profil_id: profil.id, pts_total: cartPts, statut: 'soumise' })
        .select()
        .single()

      if (errCmd || !commande) throw errCmd

      // 2. Insérer les lignes
      const lignes = items.map((item) => ({
        commande_id:  commande.id,
        article_id:   item.article.id,
        taille:       item.taille,
        quantite:     item.quantite,
        pts_unitaire: item.article.pts_cout,
      }))

      const { error: errLignes } = await supabase
        .from('commandes_lignes')
        .insert(lignes)

      if (errLignes) throw errLignes

      clear()
      toast.success('Commande soumise avec succès !')
      navigate('/historique')
    } catch (e) {
      console.error(e)
      toast.error('Erreur lors de la soumission de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <div className="text-sm font-medium text-gray-700 mb-1">Votre panier est vide</div>
        <div className="text-xs text-gray-400 mb-4">Ajoutez des articles depuis le catalogue</div>
        <Link to="/catalogue"
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          Voir le catalogue
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Ma commande</h1>
        <Link to="/catalogue" className="text-sm text-brand hover:underline">
          ← Continuer mes achats
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Liste articles */}
        <div className="flex-1 space-y-3">
          {items.map((item) => (
            <div key={`${item.article.id}-${item.taille}`}
                 className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-start">
              {/* Photo placeholder */}
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {item.article.photos.length > 0 ? (
                  <img src={item.article.photos[0]} alt={item.article.nom}
                       className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                )}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{item.article.nom}</div>
                <div className="text-xs text-gray-400">{item.article.reference} · Taille {item.taille}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2.5 h-2.5 bg-gold-200 rounded-full" />
                  <span className="text-sm font-semibold text-gray-800">
                    {formatPoints(item.pts_total)}
                  </span>
                </div>
              </div>

              {/* Quantité + suppr */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantite(item.article.id, item.taille, item.quantite - 1)}
                    className="px-2.5 py-1 text-gray-500 hover:bg-gray-50 text-sm font-medium"
                  >−</button>
                  <span className="px-2 py-1 text-sm font-medium text-gray-800 min-w-[24px] text-center">
                    {item.quantite}
                  </span>
                  <button
                    onClick={() => updateQuantite(item.article.id, item.taille, item.quantite + 1)}
                    className="px-2.5 py-1 text-gray-500 hover:bg-gray-50 text-sm font-medium"
                  >+</button>
                </div>
                <button
                  onClick={() => removeItem(item.article.id, item.taille)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Récapitulatif */}
        <div className="lg:w-64 space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-900">Récapitulatif</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Dotation {new Date().getFullYear()}</span>
                <span className="font-medium">{formatPoints(pts)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Cette commande</span>
                <span className="font-medium text-gray-900">− {formatPoints(cartPts)}</span>
              </div>
              <div className={clsx(
                'flex justify-between pt-2 border-t border-gray-100 font-semibold',
                ptsApres < 0 ? 'text-red-600' : 'text-brand'
              )}>
                <span>Solde restant</span>
                <span>{formatPoints(ptsApres)}</span>
              </div>
            </div>

            {ptsApres < 0 && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                Points insuffisants. Retirez des articles.
              </div>
            )}

            {!dotation && (
              <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Aucune dotation pour {new Date().getFullYear()}.
              </div>
            )}

            <button
              disabled={!peutCommander || submitting}
              onClick={handleSubmit}
              className={clsx(
                'w-full py-2.5 rounded-lg text-sm font-medium transition-colors',
                peutCommander && !submitting
                  ? 'bg-brand text-white hover:bg-brand-dark'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {submitting ? 'Envoi...' : 'Valider la commande'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page Historique ──────────────────────────────────────────────────────────

export function Historique() {
  const profil = useAuthStore((s) => s.profil)

  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ['commandes', profil?.id],
    queryFn: () => fetchCommandes(profil!.id),
    enabled: !!profil?.id,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (commandes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <div className="text-sm font-medium text-gray-700 mb-1">Aucune commande</div>
        <div className="text-xs text-gray-400 mb-4">Vos commandes apparaîtront ici</div>
        <Link to="/catalogue"
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          Voir le catalogue
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-lg font-semibold text-gray-900">Historique de mes commandes</h1>

      <div className="space-y-3">
        {commandes.map((cmd) => {
          const cfg = STATUT_CONFIG[cmd.statut]
          const nbArticles = cmd.lignes?.length ?? 0
          return (
            <div key={cmd.id}
                 className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{cmd.reference}</span>
                    <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', cfg.className)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(cmd.date_commande)} · {nbArticles} article{nbArticles > 1 ? 's' : ''}
                  </div>
                  {/* Lignes résumé */}
                  {cmd.lignes && cmd.lignes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cmd.lignes.slice(0, 3).map((l) => (
                        <span key={l.id}
                              className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600
                                         px-2 py-0.5 rounded-full">
                          {(l as any).article?.nom ?? '—'} · {l.taille}
                        </span>
                      ))}
                      {cmd.lignes.length > 3 && (
                        <span className="text-[11px] text-gray-400 px-1">
                          +{cmd.lignes.length - 3} autre{cmd.lignes.length - 3 > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="w-2.5 h-2.5 bg-gold-200 rounded-full inline-block" />
                    <span className="text-sm font-semibold text-gray-800">
                      {formatPoints(cmd.pts_total)}
                    </span>
                  </div>
                  {cmd.date_validation && (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Validée le {formatDate(cmd.date_validation)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
