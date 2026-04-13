import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { formatPoints, formatDate } from '@/utils/formatters'
import type { StatutCommande } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandeAdmin {
  id: string
  reference: string
  statut: StatutCommande
  pts_total: number
  date_commande: string
  date_validation: string | null
  commentaire: string | null
  profil: { nom: string; prenom: string; filiale: { code: string; nom: string } | null } | null
  lignes: { id: string; taille: string; quantite: number; pts_unitaire: number; article: { nom: string } | null }[]
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchCommandes(): Promise<CommandeAdmin[]> {
  const { data, error } = await supabase
    .from('commandes')
    .select(`
      id, reference, statut, pts_total, date_commande, date_validation, commentaire,
      profil:profils(nom, prenom, filiale:filiales(code, nom)),
      lignes:commandes_lignes(id, taille, quantite, pts_unitaire, article:articles(nom))
    `)
    .order('date_commande', { ascending: false })
  if (error) throw error
  return data as unknown as CommandeAdmin[]
}

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutCommande, { label: string; className: string }> = {
  brouillon:       { label: 'Brouillon',      className: 'bg-gray-100 text-gray-600' },
  soumise:         { label: 'En attente',      className: 'bg-blue-50 text-blue-700' },
  validee:         { label: 'Validée',         className: 'bg-teal-50 text-brand' },
  en_preparation:  { label: 'En préparation',  className: 'bg-amber-50 text-amber-700' },
  expediee:        { label: 'Expédiée',        className: 'bg-purple-50 text-purple-700' },
  livree:          { label: 'Livrée',          className: 'bg-green-50 text-green-700' },
  annulee:         { label: 'Annulée',         className: 'bg-red-50 text-red-600' },
}

const TRANSITIONS: Partial<Record<StatutCommande, { next: StatutCommande; label: string }[]>> = {
  soumise:        [{ next: 'validee',         label: 'Valider' },
                   { next: 'annulee',         label: 'Annuler' }],
  validee:        [{ next: 'en_preparation',  label: 'En préparation' }],
  en_preparation: [{ next: 'expediee',        label: 'Expédier' }],
  expediee:       [{ next: 'livree',          label: 'Marquer livrée' }],
}

// ─── Ligne de commande dépliée ────────────────────────────────────────────────

function DetailCommande({ cmd }: { cmd: CommandeAdmin }) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={6} className="px-6 py-3">
        <div className="space-y-1">
          {cmd.lignes.map((l) => (
            <div key={l.id} className="flex items-center gap-4 text-xs text-gray-600">
              <span className="font-medium text-gray-800 w-48 truncate">
                {l.article?.nom ?? '—'}
              </span>
              <span className="text-gray-400">Taille {l.taille}</span>
              <span className="text-gray-400">× {l.quantite}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gold-200 rounded-full" />
                {formatPoints(l.pts_unitaire * l.quantite)}
              </span>
            </div>
          ))}
          {cmd.commentaire && (
            <div className="text-xs text-gray-500 mt-1 italic">
              Note : {cmd.commentaire}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function Commandes() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [filtre, setFiltre]       = useState<StatutCommande | 'tous'>('tous')
  const [expanded, setExpanded]   = useState<string | null>(null)

  const { data: commandes = [], isLoading } = useQuery({
    queryKey: ['admin-commandes'],
    queryFn: fetchCommandes,
  })

  const { mutate: changerStatut, isPending } = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: StatutCommande }) => {
      const update: Record<string, unknown> = { statut }
      if (statut === 'validee') update.date_validation = new Date().toISOString()
      const { error } = await supabase.from('commandes').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { statut }) => {
      qc.invalidateQueries({ queryKey: ['admin-commandes'] })
      qc.invalidateQueries({ queryKey: ['admin-metrics'] })
      toast.success(`Commande ${STATUT_CONFIG[statut].label.toLowerCase()}`)
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  })

  const filtrees = commandes.filter((c) => {
    if (filtre !== 'tous' && c.statut !== filtre) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.reference.toLowerCase().includes(q) &&
          !c.profil?.nom.toLowerCase().includes(q) &&
          !c.profil?.prenom.toLowerCase().includes(q)) return false
    }
    return true
  })

  const enAttente = commandes.filter((c) => c.statut === 'soumise').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Commandes</h1>
        {enAttente > 0 && (
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100
                           px-2 py-1 rounded-full font-medium">
            {enAttente} en attente de validation
          </span>
        )}
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setFiltre('tous')}
          className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            filtre === 'tous' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          Tous ({commandes.length})
        </button>
        {(Object.entries(STATUT_CONFIG) as [StatutCommande, typeof STATUT_CONFIG[StatutCommande]][]).map(([s, cfg]) => {
          const count = commandes.filter((c) => c.statut === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setFiltre(s)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filtre === s ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Recherche */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input type="text" placeholder="Rechercher par référence ou salarié..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtrees.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">Aucune commande</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-3 font-medium w-6" />
                <th className="text-left px-4 py-3 font-medium">Référence</th>
                <th className="text-left px-4 py-3 font-medium">Salarié</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">Statut / Action</th>
              </tr>
            </thead>
            <tbody>
              {filtrees.map((cmd) => {
                const cfg = STATUT_CONFIG[cmd.statut]
                const transitions = TRANSITIONS[cmd.statut] ?? []
                const isExpanded = expanded === cmd.id
                return (
                  <>
                    <tr key={cmd.id}
                        className={clsx('border-b border-gray-50 hover:bg-gray-50 transition-colors',
                          isExpanded && 'bg-gray-50')}>
                      {/* Toggle détail */}
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(isExpanded ? null : cmd.id)}
                          className="text-gray-400 hover:text-gray-600">
                          <svg className={clsx('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-90')}
                               fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{cmd.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {cmd.profil?.prenom} {cmd.profil?.nom}
                        </div>
                        <div className="text-[11px] text-gray-400">{cmd.profil?.filiale?.code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {formatDate(cmd.date_commande)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="w-2 h-2 bg-gold-200 rounded-full" />
                          <span className="font-medium">{formatPoints(cmd.pts_total)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', cfg.className)}>
                            {cfg.label}
                          </span>
                          {transitions.map((t) => (
                            <button key={t.next}
                              disabled={isPending}
                              onClick={() => changerStatut({ id: cmd.id, statut: t.next })}
                              className={clsx(
                                'text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors',
                                t.next === 'annulee'
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-brand text-brand hover:bg-teal-50',
                                isPending && 'opacity-50 cursor-not-allowed'
                              )}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && <DetailCommande cmd={cmd} />}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
