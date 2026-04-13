import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { CATEGORIE_LABELS } from '@/utils/formatters'
import type { CategorieArticle } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Taille {
  id: string
  taille: string
  stock_quantite: number
  seuil_alerte: number
}

interface ArticleStock {
  id: string
  nom: string
  reference: string
  categorie_slug: CategorieArticle
  pts_cout: number
  actif: boolean
  tailles: Taille[]
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchArticlesStock(): Promise<ArticleStock[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, nom, reference, categorie_slug, pts_cout, actif, tailles:articles_tailles(id, taille, stock_quantite, seuil_alerte)')
    .order('nom')
  if (error) throw error
  return data as ArticleStock[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statutTaille(t: Taille): 'rupture' | 'faible' | 'ok' {
  if (t.stock_quantite === 0) return 'rupture'
  if (t.stock_quantite <= t.seuil_alerte) return 'faible'
  return 'ok'
}

const STATUT_STYLE = {
  rupture: 'bg-red-100 text-red-700 border-red-200',
  faible:  'bg-amber-100 text-amber-700 border-amber-200',
  ok:      'bg-gray-100 text-gray-700 border-gray-200',
}

// ─── Composant édition stock inline ──────────────────────────────────────────

function TailleChip({ taille, articleId: _articleId }: { taille: Taille; articleId: string }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(taille.stock_quantite))
  const statut = statutTaille(taille)

  const { mutate, isPending } = useMutation({
    mutationFn: async (qty: number) => {
      const { error } = await supabase
        .from('articles_tailles')
        .update({ stock_quantite: qty })
        .eq('id', taille.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['articles-stock'] })
      toast.success('Stock mis à jour')
      setEditing(false)
    },
    onError: () => toast.error('Erreur mise à jour stock'),
  })

  const handleSave = () => {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 0) return
    mutate(n)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="w-16 px-1.5 py-0.5 text-xs border border-brand rounded focus:outline-none"
          autoFocus
        />
        <button onClick={handleSave} disabled={isPending}
          className="text-xs text-brand hover:text-brand-dark font-medium">✓</button>
        <button onClick={() => { setEditing(false); setVal(String(taille.stock_quantite)) }}
          className="text-xs text-gray-400 hover:text-gray-600">✕</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setEditing(true); setVal(String(taille.stock_quantite)) }}
      className={clsx(
        'flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium',
        'hover:opacity-80 transition-opacity cursor-pointer',
        STATUT_STYLE[statut]
      )}
      title="Cliquer pour modifier"
    >
      <span className="font-mono">{taille.taille}</span>
      <span className="opacity-60">·</span>
      <span>{taille.stock_quantite}</span>
    </button>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

const CATEGORIES_FILTRE = [
  { slug: 'tous', label: 'Tous' },
  { slug: 'haut', label: 'Hauts' },
  { slug: 'bas', label: 'Bas' },
  { slug: 'chaussures', label: 'Chaussures' },
  { slug: 'epi', label: 'EPI' },
  { slug: 'outerwear', label: 'Dessus' },
  { slug: 'accessoires', label: 'Accessoires' },
]

export function Stocks() {
  const [search, setSearch]   = useState('')
  const [cat, setCat]         = useState('tous')
  const [filtre, setFiltre]   = useState<'tous' | 'rupture' | 'faible'>('tous')

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles-stock'],
    queryFn: fetchArticlesStock,
  })

  const articlesFiltres = articles.filter((a) => {
    if (cat !== 'tous' && a.categorie_slug !== cat) return false
    if (search && !a.nom.toLowerCase().includes(search.toLowerCase()) &&
        !a.reference.toLowerCase().includes(search.toLowerCase())) return false
    if (filtre === 'rupture') {
      if (!a.tailles.some((t) => t.stock_quantite === 0)) return false
    }
    if (filtre === 'faible') {
      if (!a.tailles.some((t) => t.stock_quantite > 0 && t.stock_quantite <= t.seuil_alerte)) return false
    }
    return true
  })

  const totalRuptures = articles.reduce((acc, a) =>
    acc + a.tailles.filter((t) => t.stock_quantite === 0).length, 0)
  const totalFaibles = articles.reduce((acc, a) =>
    acc + a.tailles.filter((t) => t.stock_quantite > 0 && t.stock_quantite <= t.seuil_alerte).length, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Gestion des stocks</h1>
        <div className="flex items-center gap-2 text-xs">
          {totalRuptures > 0 && (
            <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-full font-medium">
              {totalRuptures} rupture{totalRuptures > 1 ? 's' : ''}
            </span>
          )}
          {totalFaibles > 0 && (
            <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-full font-medium">
              {totalFaibles} stock{totalFaibles > 1 ? 's' : ''} faible{totalFaibles > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {CATEGORIES_FILTRE.map((c) => (
            <button key={c.slug} onClick={() => setCat(c.slug)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                cat === c.slug ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {(['tous', 'rupture', 'faible'] as const).map((f) => (
            <button key={f} onClick={() => setFiltre(f)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filtre === f
                  ? f === 'rupture' ? 'bg-red-500 text-white'
                    : f === 'faible' ? 'bg-amber-500 text-white'
                    : 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f === 'tous' ? 'Tous' : f === 'rupture' ? 'Ruptures' : 'Stock faible'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input type="text" placeholder="Rechercher un article..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articlesFiltres.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">Aucun article trouvé</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Article</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 font-medium">Stock par taille</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {articlesFiltres.map((a) => {
                const total = a.tailles.reduce((acc, t) => acc + t.stock_quantite, 0)
                const hasRupture = a.tailles.some((t) => t.stock_quantite === 0)
                const hasFaible  = a.tailles.some((t) => t.stock_quantite > 0 && t.stock_quantite <= t.seuil_alerte)
                return (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.nom}</div>
                      <div className="text-[11px] text-gray-400">{a.reference}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">
                        {CATEGORIE_LABELS[a.categorie_slug] ?? a.categorie_slug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.tailles.map((t) => (
                          <TailleChip key={t.id} taille={t} articleId={a.id} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx('text-sm font-semibold',
                        total === 0 ? 'text-red-600' : hasFaible ? 'text-amber-600' : 'text-gray-800')}>
                        {total}
                      </span>
                      {hasRupture && !hasFaible && total > 0 && (
                        <div className="text-[10px] text-red-500">taille(s) épuisée(s)</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Cliquez sur une taille pour modifier son stock directement.
      </p>
    </div>
  )
}
