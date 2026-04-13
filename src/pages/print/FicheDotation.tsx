import { useParams } from 'react-router-dom'
import logoAlyzia from '@/logoalyzia.png'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { formatDate, formatPoints, tauxConsommation } from '@/utils/formatters'

async function fetchFicheDotation(profilId: string) {
  const annee = new Date().getFullYear()

  const [profilRes, dotationRes, commandesRes] = await Promise.all([
    supabase
      .from('profils')
      .select('nom, prenom, matricule, filiale:filiales(nom, code, dotation_categorie)')
      .eq('id', profilId)
      .single(),
    supabase
      .from('dotations')
      .select('pts_total, pts_consommes, date_expiration')
      .eq('profil_id', profilId)
      .eq('annee', annee)
      .single(),
    supabase
      .from('commandes')
      .select('reference, statut, pts_total, date_commande, lignes:commandes_lignes(quantite, pts_unitaire, taille, article:articles(nom))')
      .eq('profil_id', profilId)
      .eq('annee', annee)
      .not('statut', 'in', '("brouillon","annulee")')
      .order('date_commande', { ascending: false }),
  ])

  return {
    profil:    profilRes.data,
    dotation:  dotationRes.data,
    commandes: commandesRes.data ?? [],
    annee,
  }
}

export default function FicheDotation() {
  const { profilId } = useParams<{ profilId: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['print-dotation', profilId],
    queryFn: () => fetchFicheDotation(profilId!),
    enabled: !!profilId,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (isError || !data?.profil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-red-500">Salarié introuvable</div>
      </div>
    )
  }

  const { profil, dotation, commandes, annee } = data
  const filiale = (profil as any).filiale
  const ptsRestants  = dotation ? dotation.pts_total - dotation.pts_consommes : 0
  const taux = dotation ? tauxConsommation(dotation.pts_total, dotation.pts_consommes) : 0

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg
                     hover:bg-brand-dark transition-colors shadow-md">
          Imprimer / PDF
        </button>
        <button onClick={() => window.close()}
          className="bg-white border border-gray-200 text-gray-600 text-sm px-4 py-2
                     rounded-lg hover:bg-gray-50 transition-colors shadow-md">
          Fermer
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-10 bg-white min-h-screen">

        {/* En-tête */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src={logoAlyzia} alt="Alyzia" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold text-gray-900">Alyzia</span>
            </div>
            <div className="text-xs text-gray-400">{filiale?.nom}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">FICHE DE DOTATION</div>
            <div className="text-sm font-semibold text-brand mt-1">Année {annee}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Éditée le {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* Salarié */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Salarié</div>
              <div className="font-semibold text-gray-900">
                {(profil as any).prenom} {(profil as any).nom}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Matricule</div>
              <div className="font-medium text-gray-700">
                {(profil as any).matricule ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Filiale / Catégorie</div>
              <div className="font-medium text-gray-700">
                {filiale?.code} · Cat. {filiale?.dotation_categorie}
              </div>
            </div>
          </div>
        </div>

        {/* Dotation */}
        {dotation ? (
          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-700 mb-3">Enveloppe de points {annee}</div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Dotation totale', value: formatPoints(dotation.pts_total), highlight: false },
                { label: 'Points consommés', value: formatPoints(dotation.pts_consommes), highlight: false },
                { label: 'Points restants', value: formatPoints(ptsRestants), highlight: true },
              ].map((m) => (
                <div key={m.label} className={`rounded-xl p-3 text-center border ${m.highlight ? 'bg-teal-50 border-teal-100' : 'bg-white border-gray-200'}`}>
                  <div className={`text-xl font-bold ${m.highlight ? 'text-brand' : 'text-gray-900'}`}>
                    {m.value}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-brand h-3 rounded-full" style={{ width: `${taux}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{taux}% consommé</span>
              <span>Expire le {formatDate(dotation.date_expiration)}</span>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
            Aucune dotation attribuée pour {annee}.
          </div>
        )}

        {/* Commandes */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Commandes {annee} ({commandes.length})
          </div>
          {commandes.length === 0 ? (
            <div className="text-sm text-gray-400 italic">Aucune commande cette année.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600">Référence</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Date</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Statut</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Points</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((cmd: any) => (
                  <tr key={cmd.id} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-xs text-gray-600">{cmd.reference}</td>
                    <td className="py-2 text-gray-600">{formatDate(cmd.date_commande)}</td>
                    <td className="py-2 text-center text-xs text-gray-500">{cmd.statut}</td>
                    <td className="py-2 text-right font-medium text-gray-800">{formatPoints(cmd.pts_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pied */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-end">
          <div className="text-xs text-gray-400">
            Document non contractuel · Alyzia {annee}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-6">Signature RH</div>
            <div className="w-40 border-b border-gray-400" />
          </div>
        </div>
      </div>
    </>
  )
}
