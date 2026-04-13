import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { formatPoints, formatDate } from '@/utils/formatters'
import type { Filiale } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfilAvecDotation {
  id: string
  nom: string
  prenom: string
  matricule: string | null
  role: string
  actif: boolean
  filiale: Filiale
  dotation: {
    id: string
    pts_total: number
    pts_consommes: number
    date_expiration: string
  } | null
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchProfils(): Promise<ProfilAvecDotation[]> {
  const annee = new Date().getFullYear()
  const { data, error } = await supabase
    .from('profils')
    .select(`
      id, nom, prenom, matricule, role, actif,
      filiale:filiales(id, nom, code, groupe_id, dotation_categorie, created_at),
      dotation:dotations(id, pts_total, pts_consommes, date_expiration)
    `)
    .order('nom')
  if (error) throw error

  return (data ?? []).map((p: any) => ({
    ...p,
    dotation: Array.isArray(p.dotation)
      ? (p.dotation.find((d: any) => new Date(d.date_expiration).getFullYear() === annee) ?? null)
      : p.dotation ?? null,
  }))
}

async function fetchFiliales(): Promise<Filiale[]> {
  const { data, error } = await supabase.from('filiales').select('*').eq('actif', true).order('nom')
  if (error) throw error
  return data as Filiale[]
}

// ─── Modal dotation ───────────────────────────────────────────────────────────

function ModalDotation({
  profil,
  onClose,
}: {
  profil: ProfilAvecDotation
  onClose: () => void
}) {
  const qc = useQueryClient()
  const annee = new Date().getFullYear()

  const [pts, setPts]     = useState(String(profil.dotation?.pts_total ?? 300))
  const [expiry, setExpiry] = useState(
    profil.dotation?.date_expiration?.slice(0, 10) ?? `${annee}-12-31`
  )

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const ptsN = parseInt(pts, 10)
      if (isNaN(ptsN) || ptsN < 0) throw new Error('Points invalides')

      if (profil.dotation) {
        const { error } = await supabase
          .from('dotations')
          .update({ pts_total: ptsN, date_expiration: expiry })
          .eq('id', profil.dotation.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dotations')
          .insert({ profil_id: profil.id, annee, pts_total: ptsN, date_expiration: expiry })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-salaries'] })
      toast.success('Dotation enregistrée')
      onClose()
    },
    onError: (e: any) => toast.error(e.message ?? 'Erreur'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <div className="text-base font-semibold text-gray-900">
            {profil.dotation ? 'Modifier la dotation' : 'Attribuer une dotation'}
          </div>
          <div className="text-sm text-gray-500">
            {profil.prenom} {profil.nom} · {annee}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Points alloués</label>
            <input
              type="number" min={0} value={pts}
              onChange={(e) => setPts(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
            <input
              type="date" value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
        </div>

        {profil.dotation && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
            Consommés : {formatPoints(profil.dotation.pts_consommes)} /
            {' '}{formatPoints(profil.dotation.pts_total)}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={() => mutate()} disabled={isPending}
            className="flex-1 py-2 bg-brand text-white rounded-lg text-sm font-medium
                       hover:bg-brand-dark disabled:opacity-60">
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function Salaries() {
  const [search, setSearch]       = useState('')
  const [filialeId, setFilialeId] = useState('tous')
  const [modalProfil, setModalProfil] = useState<ProfilAvecDotation | null>(null)

  const annee = new Date().getFullYear()

  const { data: profils = [], isLoading } = useQuery({
    queryKey: ['admin-salaries'],
    queryFn: fetchProfils,
  })

  const { data: filiales = [] } = useQuery({
    queryKey: ['filiales'],
    queryFn: fetchFiliales,
  })

  const filtres = profils.filter((p) => {
    if (filialeId !== 'tous' && p.filiale?.id !== filialeId) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.nom.toLowerCase().includes(q) &&
          !p.prenom.toLowerCase().includes(q) &&
          !(p.matricule?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const sansDotation = filtres.filter((p) => !p.dotation).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Salariés & dotations {annee}</h1>
        {sansDotation > 0 && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100
                           px-2 py-1 rounded-full font-medium">
            {sansDotation} sans dotation
          </span>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          </svg>
          <input type="text" placeholder="Rechercher un salarié..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
        </div>
        <select value={filialeId} onChange={(e) => setFilialeId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white">
          <option value="tous">Toutes les filiales</option>
          {filiales.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtres.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">Aucun salarié trouvé</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Salarié</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Filiale</th>
                <th className="text-left px-4 py-3 font-medium">Dotation {annee}</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map((p) => {
                const dot = p.dotation
                const taux = dot && dot.pts_total > 0
                  ? Math.round((dot.pts_consommes / dot.pts_total) * 100)
                  : 0
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {p.prenom} {p.nom}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {p.matricule ? `#${p.matricule}` : '—'} · {p.role}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-medium text-gray-700 bg-gray-100
                                       px-2 py-0.5 rounded-full">
                        {p.filiale?.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dot ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-gold-200 rounded-full" />
                              <span className="text-xs font-semibold text-gray-800">
                                {formatPoints(dot.pts_total - dot.pts_consommes)}
                              </span>
                              <span className="text-xs text-gray-400">
                                / {formatPoints(dot.pts_total)}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400">
                              exp. {formatDate(dot.date_expiration)}
                            </span>
                          </div>
                          <div className="w-32 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={clsx('h-1.5 rounded-full',
                                taux >= 90 ? 'bg-brand' : taux >= 50 ? 'bg-gold-200' : 'bg-gray-300')}
                              style={{ width: `${taux}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Aucune dotation
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setModalProfil(p)}
                        className="text-xs text-brand hover:text-brand-dark font-medium
                                   hover:underline transition-colors"
                      >
                        {dot ? 'Modifier' : 'Attribuer'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalProfil && (
        <ModalDotation profil={modalProfil} onClose={() => setModalProfil(null)} />
      )}
    </div>
  )
}
