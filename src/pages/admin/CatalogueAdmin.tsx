import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { CATEGORIE_LABELS, formatPoints } from '@/utils/formatters'
import type { CategorieArticle } from '@/types'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface TailleRow {
  id?: string
  taille: string
  stock_quantite: number
  seuil_alerte: number
}

interface ArticleRow {
  id: string
  nom: string
  reference: string
  description: string
  categorie_slug: CategorieArticle
  pts_cout: number
  prix_achat_ht: number
  tva_taux: number
  ref_fournisseur: string
  tags: string[]
  actif: boolean
  photos: string[]
  tailles: TailleRow[]
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchArticles(): Promise<ArticleRow[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, nom, reference, description, categorie_slug, pts_cout,
      prix_achat_ht, tva_taux, ref_fournisseur, tags, actif, photos,
      tailles:articles_tailles(id, taille, stock_quantite, seuil_alerte)
    `)
    .order('nom')
  if (error) throw error
  return data as unknown as ArticleRow[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES: { slug: CategorieArticle | 'tous'; label: string }[] = [
  { slug: 'tous',        label: 'Tous' },
  { slug: 'haut',        label: 'Hauts' },
  { slug: 'bas',         label: 'Bas' },
  { slug: 'chaussures',  label: 'Chaussures' },
  { slug: 'epi',         label: 'EPI' },
  { slug: 'outerwear',   label: 'Dessus' },
  { slug: 'accessoires', label: 'Accessoires' },
]

const TAILLES_PRESET: Record<string, string[]> = {
  haut:        ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  bas:         ['36', '38', '40', '42', '44', '46', '48'],
  chaussures:  ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  epi:         ['S/M', 'L/XL', 'Unique'],
  outerwear:   ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  accessoires: ['Unique', 'S/M', 'L/XL'],
}

// ─── Modal article ────────────────────────────────────────────────────────────

function ModalArticle({
  article,
  onClose,
}: {
  article: ArticleRow | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const isEdit = !!article

  const [form, setForm] = useState({
    nom:             article?.nom             ?? '',
    reference:       article?.reference       ?? '',
    description:     article?.description     ?? '',
    categorie_slug:  article?.categorie_slug  ?? 'haut' as CategorieArticle,
    pts_cout:        article?.pts_cout        ?? 0,
    prix_achat_ht:   article?.prix_achat_ht   ?? 0,
    tva_taux:        article ? Math.round((article.tva_taux ?? 0.2) * 100) : 20,
    ref_fournisseur: article?.ref_fournisseur ?? '',
    tags:            article?.tags?.join(', ') ?? '',
  })

  const [tailles,     setTailles]     = useState<TailleRow[]>(article?.tailles ?? [])
  const [newTaille,   setNewTaille]   = useState('')
  const [photos,      setPhotos]      = useState<string[]>(article?.photos ?? [])
  const [newPhotoUrl, setNewPhotoUrl] = useState('')

  const field =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const handlePreset = () => {
    const presets = TAILLES_PRESET[form.categorie_slug] ?? []
    const existing = new Set(tailles.map((t) => t.taille))
    const toAdd = presets
      .filter((t) => !existing.has(t))
      .map((t): TailleRow => ({ taille: t, stock_quantite: 0, seuil_alerte: 5 }))
    setTailles((prev) => [...prev, ...toAdd])
  }

  const addTaille = () => {
    const t = newTaille.trim()
    if (!t || tailles.some((x) => x.taille === t)) return
    setTailles((prev) => [...prev, { taille: t, stock_quantite: 0, seuil_alerte: 5 }])
    setNewTaille('')
  }

  const removeTaille = (idx: number) => setTailles((prev) => prev.filter((_, i) => i !== idx))

  const updateTaille = (idx: number, field: 'stock_quantite' | 'seuil_alerte', val: number) =>
    setTailles((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: val } : t)))

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload = {
        nom:             form.nom.trim(),
        reference:       form.reference.trim().toUpperCase(),
        description:     form.description.trim() || null,
        categorie_slug:  form.categorie_slug,
        pts_cout:        Number(form.pts_cout),
        prix_achat_ht:   Number(form.prix_achat_ht),
        tva_taux:        Number(form.tva_taux) / 100,
        ref_fournisseur: form.ref_fournisseur.trim() || null,
        tags:            form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        photos:          photos,
      }

      let articleId = article?.id

      if (isEdit) {
        const { error } = await supabase.from('articles').update(payload).eq('id', articleId!)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('articles')
          .insert({ ...payload, actif: true })
          .select('id')
          .single()
        if (error) throw error
        articleId = data.id
      }

      // Supprime les tailles retirées (édition uniquement)
      if (isEdit && article) {
        const keptIds = tailles.filter((t) => t.id).map((t) => t.id!)
        const toDelete = article.tailles
          .filter((t) => t.id && !keptIds.includes(t.id))
          .map((t) => t.id!)
        if (toDelete.length > 0) {
          const { error } = await supabase.from('articles_tailles').delete().in('id', toDelete)
          if (error) throw error
        }
      }

      // Upsert tailles
      for (const t of tailles) {
        if (t.id) {
          const { error } = await supabase
            .from('articles_tailles')
            .update({ stock_quantite: t.stock_quantite, seuil_alerte: t.seuil_alerte })
            .eq('id', t.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('articles_tailles').insert({
            article_id:     articleId,
            taille:         t.taille,
            stock_quantite: t.stock_quantite,
            seuil_alerte:   t.seuil_alerte,
          })
          if (error) throw error
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['articles-catalogue-admin'] })
      qc.invalidateQueries({ queryKey: ['articles-stock'] })
      qc.invalidateQueries({ queryKey: ['articles'] })
      toast.success(isEdit ? 'Article modifié' : 'Article créé')
      onClose()
    },
    onError: (e: any) => toast.error(e.message ?? 'Erreur'),
  })

  const canSave = form.nom.trim() && form.reference.trim() && Number(form.pts_cout) >= 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Modifier l'article" : 'Nouvel article'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* ── Informations générales ── */}
          <section>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Informations générales
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text" value={form.nom} onChange={field('nom')}
                  placeholder="ex: Veste softshell homme"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Référence *</label>
                <input
                  type="text" value={form.reference} onChange={field('reference')}
                  placeholder="ex: VSH-001"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie *</label>
                <select
                  value={form.categorie_slug}
                  onChange={field('categorie_slug')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
                >
                  {CATEGORIES.filter((c) => c.slug !== 'tous').map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description} onChange={field('description')} rows={2}
                  placeholder="Description courte de l'article..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                <input
                  type="text" value={form.tags} onChange={field('tags')}
                  placeholder="ex: homme, imperméable, hiver"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Réf. fournisseur</label>
                <input
                  type="text" value={form.ref_fournisseur} onChange={field('ref_fournisseur')}
                  placeholder="ex: FOURNISSEUR-456"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>
          </section>

          {/* ── Tarification ── */}
          <section>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Tarification
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Points coût *</label>
                <input
                  type="number" min={0} value={form.pts_cout} onChange={field('pts_cout')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prix achat HT (€)</label>
                <input
                  type="number" min={0} step="0.01" value={form.prix_achat_ht} onChange={field('prix_achat_ht')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">TVA (%)</label>
                <input
                  type="number" min={0} max={100} value={form.tva_taux} onChange={field('tva_taux')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>
          </section>

          {/* ── Photos ── */}
          <section>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Photos
            </div>

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group w-20 h-20">
                    <img
                      src={url} alt={`photo ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80/f3f4f6/9ca3af?text=?' }}
                    />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                                 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100
                                 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url" value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const url = newPhotoUrl.trim()
                    if (url && !photos.includes(url)) { setPhotos((p) => [...p, url]); setNewPhotoUrl('') }
                  }
                }}
                placeholder="https://… (URL de l'image)"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <button
                type="button"
                onClick={() => {
                  const url = newPhotoUrl.trim()
                  if (url && !photos.includes(url)) { setPhotos((p) => [...p, url]); setNewPhotoUrl('') }
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg
                           transition-colors font-medium"
              >
                Ajouter
              </button>
            </div>
          </section>

          {/* ── Tailles & stock ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Tailles & stock
              </div>
              <button
                type="button" onClick={handlePreset}
                className="text-xs text-brand hover:text-brand-dark font-medium underline underline-offset-2"
              >
                Charger tailles {CATEGORIE_LABELS[form.categorie_slug]}
              </button>
            </div>

            {tailles.length > 0 && (
              <div className="mb-3 border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400">
                      <th className="text-left px-3 py-2 font-medium">Taille</th>
                      <th className="text-center px-3 py-2 font-medium">Stock initial</th>
                      <th className="text-center px-3 py-2 font-medium">Seuil alerte</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {tailles.map((t, idx) => (
                      <tr key={`${t.id ?? ''}-${idx}`} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2 font-mono font-medium text-gray-800">{t.taille}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min={0} value={t.stock_quantite}
                            onChange={(e) => updateTaille(idx, 'stock_quantite', Number(e.target.value))}
                            className="w-16 px-2 py-0.5 border border-gray-200 rounded text-center text-xs
                                       focus:outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" min={0} value={t.seuil_alerte}
                            onChange={(e) => updateTaille(idx, 'seuil_alerte', Number(e.target.value))}
                            className="w-16 px-2 py-0.5 border border-gray-200 rounded text-center text-xs
                                       focus:outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeTaille(idx)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text" value={newTaille} onChange={(e) => setNewTaille(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTaille() } }}
                placeholder="Ajouter une taille (ex: XXL, 42…)"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <button
                type="button" onClick={addTaille}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg
                           transition-colors font-medium"
              >
                Ajouter
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
            Annuler
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !canSave}
            className="px-5 py-2 text-sm bg-brand text-white font-medium rounded-lg
                       hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : "Créer l'article"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function CatalogueAdmin() {
  const qc = useQueryClient()

  const [cat, setCat]               = useState<string>('tous')
  const [search, setSearch]         = useState('')
  const [showInactif, setShowInactif] = useState(false)
  const [modal, setModal]           = useState<{ open: boolean; article: ArticleRow | null }>({
    open: false, article: null,
  })

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles-catalogue-admin'],
    queryFn: fetchArticles,
  })

  const toggleActif = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase.from('articles').update({ actif }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { actif }) => {
      qc.invalidateQueries({ queryKey: ['articles-catalogue-admin'] })
      qc.invalidateQueries({ queryKey: ['articles'] })
      toast.success(actif ? 'Article activé' : 'Article désactivé')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const articlesFiltres = articles.filter((a) => {
    if (!showInactif && !a.actif) return false
    if (cat !== 'tous' && a.categorie_slug !== cat) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.nom.toLowerCase().includes(q) && !a.reference.toLowerCase().includes(q)) return false
    }
    return true
  })

  const nbActifs   = articles.filter((a) => a.actif).length
  const nbInactifs = articles.filter((a) => !a.actif).length

  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Catalogue articles</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {nbActifs} actif{nbActifs !== 1 ? 's' : ''}
            {nbInactifs > 0 && ` · ${nbInactifs} inactif${nbInactifs !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, article: null })}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium
                     rounded-lg hover:bg-brand-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Nouvel article
        </button>
      </div>

      {/* Filtres catégorie + toggle inactifs */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCat(c.slug)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                cat === c.slug
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 ml-auto text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox" checked={showInactif} onChange={(e) => setShowInactif(e.target.checked)}
            className="w-3.5 h-3.5 accent-brand"
          />
          Afficher inactifs
        </label>
      </div>

      {/* Recherche */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input
          type="text" placeholder="Rechercher par nom ou référence…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articlesFiltres.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">Aucun article trouvé</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="w-12 px-4 py-3" />
                <th className="text-left px-4 py-3 font-medium">Article</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Catégorie</th>
                <th className="text-center px-4 py-3 font-medium">Points</th>
                <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Stock / Tailles</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articlesFiltres.map((a) => {
                const stockTotal = a.tailles.reduce((s, t) => s + t.stock_quantite, 0)
                const hasRupture = a.tailles.some((t) => t.stock_quantite === 0)
                const hasFaible  = a.tailles.some(
                  (t) => t.stock_quantite > 0 && t.stock_quantite <= t.seuil_alerte
                )
                return (
                  <tr
                    key={a.id}
                    className={clsx(
                      'border-b border-gray-50 hover:bg-gray-50 transition-colors',
                      !a.actif && 'opacity-50'
                    )}
                  >
                    <td className="px-4 py-2">
                      {a.photos[0] ? (
                        <img
                          src={a.photos[0]} alt={a.nom}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.nom}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{a.reference}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">
                        {CATEGORIE_LABELS[a.categorie_slug] ?? a.categorie_slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-800">
                        {formatPoints(a.pts_cout)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <div className="text-xs text-gray-600">
                        {a.tailles.length} taille{a.tailles.length !== 1 ? 's' : ''}
                        {a.tailles.length > 0 && (
                          <span className="text-gray-400"> · {stockTotal} u.</span>
                        )}
                      </div>
                      {hasRupture && (
                        <div className="text-[10px] text-red-500 font-medium mt-0.5">
                          {a.tailles.filter((t) => t.stock_quantite === 0).length} rupture(s)
                        </div>
                      )}
                      {!hasRupture && hasFaible && (
                        <div className="text-[10px] text-amber-500 font-medium mt-0.5">
                          stock faible
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActif.mutate({ id: a.id, actif: !a.actif })}
                        disabled={toggleActif.isPending}
                        className={clsx(
                          'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                          a.actif
                            ? 'bg-teal-50 text-brand border-teal-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-teal-50 hover:text-brand hover:border-teal-100'
                        )}
                      >
                        {a.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModal({ open: true, article: a })}
                        className="text-xs text-brand hover:text-brand-dark font-medium transition-colors"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <ModalArticle
          article={modal.article}
          onClose={() => setModal({ open: false, article: null })}
        />
      )}
    </div>
  )
}
