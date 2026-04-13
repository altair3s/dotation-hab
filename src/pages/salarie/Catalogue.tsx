import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import type { Article, ArticleTaille, Dotation, CategorieArticle } from '@/types'
import { CATEGORIE_LABELS, formatPoints, ptsRestants } from '@/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type Filtre = CategorieArticle | 'tous'

const CATEGORIES: { slug: Filtre; label: string }[] = [
  { slug: 'tous',        label: 'Tous' },
  { slug: 'haut',        label: 'Hauts' },
  { slug: 'bas',         label: 'Bas' },
  { slug: 'chaussures',  label: 'Chaussures' },
  { slug: 'epi',         label: 'EPI' },
  { slug: 'outerwear',   label: 'Dessus' },
  { slug: 'accessoires', label: 'Accessoires' },
]

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, tailles:articles_tailles(id, taille, stock_quantite, seuil_alerte)')
    .eq('actif', true)
    .order('nom')
  if (error) throw error
  return data as Article[]
}

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

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StatutBadge({ taille }: { taille: ArticleTaille }) {
  if (taille.stock_quantite === 0) {
    return <span className="text-[10px] text-red-500 font-medium">Rupture</span>
  }
  if (taille.stock_quantite <= taille.seuil_alerte) {
    return <span className="text-[10px] text-amber-500 font-medium">Stock faible</span>
  }
  return null
}

function ArticleCard({ article, ptsDispos }: { article: Article; ptsDispos: number }) {
  const [tailleChoisie, setTailleChoisie] = useState<string | null>(null)
  const addItem = useCartStore((s) => s.addItem)
  const items    = useCartStore((s) => s.items)

  const tailles = article.tailles ?? []
  const stockTotal = tailles.reduce((acc, t) => acc + t.stock_quantite, 0)
  const enRuptureTotale = stockTotal === 0

  const tailleObj = tailles.find((t) => t.taille === tailleChoisie)
  const enRuptureChoisie = tailleObj ? tailleObj.stock_quantite === 0 : false
  const peutAjouter =
    !!tailleChoisie && !enRuptureChoisie && ptsDispos >= article.pts_cout

  const dejaAuPanier = items.some(
    (i) => i.article.id === article.id && i.taille === tailleChoisie
  )

  const handleAjouter = () => {
    if (!tailleChoisie) return
    addItem(article, tailleChoisie)
    setTailleChoisie(null)
  }

  return (
    <div className={clsx(
      'bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col',
      'hover:shadow-md transition-shadow duration-200',
      enRuptureTotale && 'opacity-60'
    )}>
      {/* Photo */}
      <div className="h-40 bg-gray-100 flex items-center justify-center relative">
        {article.photos.length > 0 ? (
          <img
            src={article.photos[0]}
            alt={article.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        )}
        {enRuptureTotale && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full">
              Rupture de stock
            </span>
          </div>
        )}
        {/* Badge catégorie */}
        <span className="absolute top-2 left-2 text-[10px] font-medium bg-white/90 text-gray-600
                         px-2 py-0.5 rounded-full border border-gray-200">
          {CATEGORIE_LABELS[article.categorie_slug] ?? article.categorie_slug}
        </span>
      </div>

      {/* Infos */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <div className="text-sm font-medium text-gray-900 leading-tight">{article.nom}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">{article.reference}</div>
        </div>

        {/* Points */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-gold-200 rounded-full inline-block flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800">{formatPoints(article.pts_cout)}</span>
          {ptsDispos < article.pts_cout && (
            <span className="text-[10px] text-red-500 ml-1">Points insuffisants</span>
          )}
        </div>

        {/* Sélecteur de taille */}
        {tailles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {tailles.map((t) => {
              const rupture = t.stock_quantite === 0
              const selected = tailleChoisie === t.taille
              return (
                <button
                  key={t.taille}
                  disabled={rupture}
                  onClick={() => setTailleChoisie(selected ? null : t.taille)}
                  className={clsx(
                    'px-2 py-0.5 text-xs rounded border font-medium transition-colors',
                    rupture
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : selected
                        ? 'border-brand bg-brand text-white'
                        : 'border-gray-200 text-gray-700 hover:border-brand hover:text-brand'
                  )}
                >
                  {t.taille}
                </button>
              )
            })}
          </div>
        )}

        {tailleObj && <StatutBadge taille={tailleObj} />}

        {/* Bouton ajouter */}
        <button
          disabled={!peutAjouter}
          onClick={handleAjouter}
          className={clsx(
            'w-full mt-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors',
            peutAjouter
              ? dejaAuPanier
                ? 'bg-teal-50 text-brand border border-brand hover:bg-teal-100'
                : 'bg-brand text-white hover:bg-brand-dark'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {!tailleChoisie
            ? 'Choisir une taille'
            : dejaAuPanier
              ? '+ Ajouter encore'
              : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Catalogue() {
  const profil = useAuthStore((s) => s.profil)
  const { pts_total: cartPts, itemCount } = useCartStore()

  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [search, setSearch] = useState('')
  const [dispoOnly, setDispoOnly] = useState(false)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: fetchArticles,
  })

  const { data: dotation } = useQuery({
    queryKey: ['dotation', profil?.id],
    queryFn: () => fetchDotation(profil!.id),
    enabled: !!profil?.id,
  })

  const pts = dotation
    ? ptsRestants(dotation.pts_total, dotation.pts_consommes)
    : 0
  const ptsDispos = pts - cartPts

  const articlesFiltres = articles.filter((a) => {
    if (filtre !== 'tous' && a.categorie_slug !== filtre) return false
    if (search && !a.nom.toLowerCase().includes(search.toLowerCase()) &&
        !a.reference.toLowerCase().includes(search.toLowerCase())) return false
    if (dispoOnly) {
      const stockTotal = (a.tailles ?? []).reduce((acc, t) => acc + t.stock_quantite, 0)
      if (stockTotal === 0) return false
    }
    return true
  })

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Catalogue</h1>
        <div className="flex items-center gap-3">
          {dotation ? (
            <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-100
                            text-brand text-xs font-medium px-3 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 bg-gold-200 rounded-full inline-block" />
              <span>{formatPoints(ptsDispos)} disponibles</span>
              {cartPts > 0 && (
                <span className="text-gray-400">· {formatPoints(cartPts)} en panier</span>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400">Aucune dotation pour {new Date().getFullYear()}</div>
          )}
          {itemCount() > 0 && (
            <a href="/commande"
               className="flex items-center gap-1.5 bg-brand text-white text-xs font-medium
                          px-3 py-1.5 rounded-full hover:bg-brand-dark transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              Panier ({itemCount()})
            </a>
          )}
        </div>
      </div>

      {/* Filtres catégorie */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setFiltre(cat.slug)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              filtre === cat.slug
                ? 'bg-brand text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Barre de recherche + toggle dispo */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={dispoOnly}
            onChange={(e) => setDispoOnly(e.target.checked)}
            className="w-4 h-4 accent-brand"
          />
          En stock uniquement
        </label>
      </div>

      {/* Grille articles */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : articlesFiltres.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="text-3xl mb-3">📦</div>
          <div className="text-sm font-medium text-gray-700">Aucun article trouvé</div>
          <div className="text-xs text-gray-400 mt-1">Modifiez vos filtres</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {articlesFiltres.map((article) => (
            <ArticleCard key={article.id} article={article} ptsDispos={ptsDispos} />
          ))}
        </div>
      )}
    </div>
  )
}
