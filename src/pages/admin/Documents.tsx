import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/utils/formatters'
import type { TypeDocument, StatutDocument } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentRow {
  id: string
  type: TypeDocument
  reference: string
  statut: StatutDocument
  genere_le: string
  url_storage: string
  commande: { reference: string } | null
  profil: { nom: string; prenom: string } | null
  generateur: { nom: string; prenom: string } | null
}

interface CommandeOption {
  id: string
  reference: string
  statut: string
  profil: { nom: string; prenom: string } | null
}

interface ProfilOption {
  id: string
  nom: string
  prenom: string
  filiale: { code: string } | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TypeDocument, { label: string; color: string }> = {
  bon_commande:   { label: 'Bon de commande',    color: 'bg-blue-50 text-blue-700' },
  bon_livraison:  { label: 'Bon de livraison',   color: 'bg-purple-50 text-purple-700' },
  facture:        { label: 'Facture',            color: 'bg-amber-50 text-amber-700' },
  fiche_dotation: { label: 'Fiche de dotation',  color: 'bg-teal-50 text-brand' },
}

const STATUT_CONFIG: Record<StatutDocument, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  emis:      { label: 'Émis',      color: 'bg-green-50 text-green-700' },
  archive:   { label: 'Archivé',   color: 'bg-gray-100 text-gray-400' },
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDocuments(): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id, type, reference, statut, genere_le, url_storage,
      commande:commandes(reference),
      profil:profils!documents_profil_id_fkey(nom, prenom),
      generateur:profils!documents_genere_par_fkey(nom, prenom)
    `)
    .order('genere_le', { ascending: false })
  if (error) throw error
  return data as unknown as DocumentRow[]
}

async function fetchCommandesValidees(): Promise<CommandeOption[]> {
  const { data, error } = await supabase
    .from('commandes')
    .select('id, reference, statut, profil:profils(nom, prenom)')
    .in('statut', ['validee', 'en_preparation', 'expediee', 'livree'])
    .order('date_commande', { ascending: false })
  if (error) throw error
  return data as unknown as CommandeOption[]
}

async function fetchProfils(): Promise<ProfilOption[]> {
  const { data, error } = await supabase
    .from('profils')
    .select('id, nom, prenom, filiale:filiales(code)')
    .eq('actif', true)
    .order('nom')
  if (error) throw error
  return data as unknown as ProfilOption[]
}

async function genererReference(type: string): Promise<string> {
  const prefixes: Record<string, string> = {
    bon_commande:   'BC',
    bon_livraison:  'BL',
    facture:        'FAC',
    fiche_dotation: 'DOT',
  }
  const prefix = prefixes[type] ?? 'DOC'
  const annee  = new Date().getFullYear()
  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
  const seq = String((count ?? 0) + 1).padStart(5, '0')
  return `${prefix}-${annee}-${seq}`
}

// ─── Modal de génération ──────────────────────────────────────────────────────

function ModalGenerer({ onClose }: { onClose: () => void }) {
  const navigate   = useNavigate()
  const profil     = useAuthStore((s) => s.profil)
  const qc         = useQueryClient()

  const [type, setType]         = useState<TypeDocument>('bon_commande')
  const [commandeId, setCommandeId] = useState('')
  const [profilId, setProfilId] = useState('')

  const { data: commandes = [] } = useQuery({ queryKey: ['commandes-validees'], queryFn: fetchCommandesValidees })
  const { data: profils   = [] } = useQuery({ queryKey: ['profils-options'],    queryFn: fetchProfils })

  const needCommande  = type === 'bon_commande' || type === 'bon_livraison' || type === 'facture'
  const needProfil    = type === 'fiche_dotation'

  const canGenerer = (needCommande && !!commandeId) || (needProfil && !!profilId)

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!profil) throw new Error('Non authentifié')
      const reference  = await genererReference(type)
      const urlStorage = needCommande
        ? `view://bon_commande/${commandeId}`
        : `view://fiche_dotation/${profilId}`

      const { error } = await supabase.from('documents').insert({
        type,
        reference,
        url_storage:  urlStorage,
        statut:       'emis',
        commande_id:  needCommande ? commandeId : null,
        profil_id:    needProfil   ? profilId   : null,
        genere_par:   profil.id,
      })
      if (error) throw error
      return { type, commandeId, profilId, reference }
    },
    onSuccess: ({ type: t, commandeId: cId, profilId: pId }) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document généré')
      onClose()
      if (t === 'fiche_dotation') navigate(`/print/dotation/${pId}`)
      else navigate(`/print/commande/${cId}`)
    },
    onError: (e: any) => toast.error(e.message ?? 'Erreur génération'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="text-base font-semibold text-gray-900">Générer un document</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
          <select value={type} onChange={(e) => { setType(e.target.value as TypeDocument); setCommandeId(''); setProfilId('') }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
            {Object.entries(TYPE_CONFIG).map(([t, cfg]) => (
              <option key={t} value={t}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {needCommande && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commande</label>
            <select value={commandeId} onChange={(e) => setCommandeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
              <option value="">Sélectionner une commande...</option>
              {commandes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reference} — {(c.profil as any)?.prenom} {(c.profil as any)?.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        {needProfil && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salarié</label>
            <select value={profilId} onChange={(e) => setProfilId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
              <option value="">Sélectionner un salarié...</option>
              {profils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prenom} {p.nom} — {(p.filiale as any)?.code}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={() => mutate()} disabled={!canGenerer || isPending}
            className="flex-1 py-2 bg-brand text-white rounded-lg text-sm font-medium
                       hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending ? 'Génération...' : 'Générer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function Documents() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [typeFiltre,   setTypeFiltre]   = useState<TypeDocument | 'tous'>('tous')
  const [statutFiltre, setStatutFiltre] = useState<StatutDocument | 'tous'>('tous')
  const [showModal,    setShowModal]    = useState(false)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  })

  const { mutate: archiver } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').update({ statut: 'archive' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document archivé')
    },
    onError: () => toast.error('Erreur archivage'),
  })

  const handleView = (doc: DocumentRow) => {
    if (doc.url_storage.startsWith('view://bon_commande/')) {
      const id = doc.url_storage.replace('view://bon_commande/', '')
      navigate(`/print/commande/${id}`)
    } else if (doc.url_storage.startsWith('view://fiche_dotation/')) {
      const id = doc.url_storage.replace('view://fiche_dotation/', '')
      navigate(`/print/dotation/${id}`)
    }
  }

  const filtres = documents.filter((d) => {
    if (typeFiltre   !== 'tous' && d.type   !== typeFiltre)   return false
    if (statutFiltre !== 'tous' && d.statut !== statutFiltre) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Documents & archives</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand text-white text-sm font-medium
                     px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Générer
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <button onClick={() => setTypeFiltre('tous')}
            className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              typeFiltre === 'tous' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            Tous les types
          </button>
          {Object.entries(TYPE_CONFIG).map(([t, cfg]) => (
            <button key={t} onClick={() => setTypeFiltre(t as TypeDocument)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                typeFiltre === t ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {(['tous', 'emis', 'archive'] as const).map((s) => (
            <button key={s} onClick={() => setStatutFiltre(s)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                statutFiltre === s ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {s === 'tous' ? 'Tous les statuts' : STATUT_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtres.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div className="text-sm text-gray-500">Aucun document</div>
          <button onClick={() => setShowModal(true)}
            className="text-sm text-brand hover:underline font-medium">
            Générer le premier document
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Référence</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Lié à</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Généré le</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map((doc) => {
                const tcfg = TYPE_CONFIG[doc.type]
                const scfg = STATUT_CONFIG[doc.statut]
                const isViewable = doc.url_storage.startsWith('view://')
                return (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{doc.reference}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', tcfg.color)}>
                        {tcfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-gray-700">
                        {doc.commande?.reference && (
                          <span>{doc.commande.reference}</span>
                        )}
                        {doc.profil && (
                          <span>{(doc.profil as any).prenom} {(doc.profil as any).nom}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                      {formatDate(doc.genere_le)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', scfg.color)}>
                        {scfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {isViewable && (
                          <button onClick={() => handleView(doc)}
                            className="text-xs text-brand hover:text-brand-dark font-medium hover:underline">
                            Voir / Imprimer
                          </button>
                        )}
                        {doc.statut !== 'archive' && (
                          <button onClick={() => archiver(doc.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
                            Archiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <ModalGenerer onClose={() => setShowModal(false)} />}
    </div>
  )
}
