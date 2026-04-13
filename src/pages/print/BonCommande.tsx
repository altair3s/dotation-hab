import { useParams } from 'react-router-dom'
import logoAlyzia from '@/logoalyzia.png'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import { formatDate, formatPoints } from '@/utils/formatters'

async function fetchCommande(id: string) {
  const { data, error } = await supabase
    .from('commandes')
    .select(`
      id, reference, statut, pts_total, date_commande, date_validation,
      adresse_livraison, commentaire,
      profil:profils(nom, prenom, matricule, filiale:filiales(nom, code, dotation_categorie)),
      lignes:commandes_lignes(
        id, taille, quantite, pts_unitaire,
        article:articles(nom, reference, categorie_slug)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export default function BonCommande() {
  const { commandeId } = useParams<{ commandeId: string }>()

  const { data: cmd, isLoading, isError } = useQuery({
    queryKey: ['print-commande', commandeId],
    queryFn: () => fetchCommande(commandeId!),
    enabled: !!commandeId,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (isError || !cmd) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-red-500">Commande introuvable</div>
      </div>
    )
  }

  const profil  = (cmd as any).profil
  const filiale = profil?.filiale
  const lignes  = (cmd as any).lignes ?? []

  return (
    <>
      {/* Styles print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      {/* Bouton impression */}
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

      {/* Document */}
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
            <div className="text-xl font-bold text-gray-900">BON DE COMMANDE</div>
            <div className="text-sm font-mono text-brand mt-1">{cmd.reference}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Émis le {formatDate(cmd.date_commande)}
            </div>
          </div>
        </div>

        {/* Salarié */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Salarié</div>
            <div className="text-sm font-semibold text-gray-900">
              {profil?.prenom} {profil?.nom}
            </div>
            {profil?.matricule && (
              <div className="text-xs text-gray-500 mt-0.5">Matricule : {profil.matricule}</div>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Filiale</div>
            <div className="text-sm font-semibold text-gray-900">{filiale?.nom}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Code : {filiale?.code} · Catégorie {filiale?.dotation_categorie}
            </div>
          </div>
        </div>

        {/* Lignes */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-700">Article</th>
              <th className="text-center py-2 font-semibold text-gray-700">Taille</th>
              <th className="text-center py-2 font-semibold text-gray-700">Qté</th>
              <th className="text-right py-2 font-semibold text-gray-700">Pts unitaire</th>
              <th className="text-right py-2 font-semibold text-gray-700">Total pts</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l: any) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2.5">
                  <div className="font-medium text-gray-900">{l.article?.nom}</div>
                  <div className="text-xs text-gray-400">{l.article?.reference}</div>
                </td>
                <td className="py-2.5 text-center text-gray-700">{l.taille}</td>
                <td className="py-2.5 text-center text-gray-700">{l.quantite}</td>
                <td className="py-2.5 text-right text-gray-700">{formatPoints(l.pts_unitaire)}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">
                  {formatPoints(l.pts_unitaire * l.quantite)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={4} className="py-3 font-bold text-gray-900">TOTAL</td>
              <td className="py-3 text-right font-bold text-brand text-base">
                {formatPoints(cmd.pts_total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Commentaire / adresse */}
        {(cmd as any).adresse_livraison && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Adresse de livraison
            </div>
            <div className="text-sm text-gray-700">{(cmd as any).adresse_livraison}</div>
          </div>
        )}
        {(cmd as any).commentaire && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Commentaire</div>
            <div className="text-sm text-gray-700 italic">{(cmd as any).commentaire}</div>
          </div>
        )}

        {/* Pied */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-end">
          <div className="text-xs text-gray-400">
            Document généré le {formatDate(new Date().toISOString())}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-6">Signature / Validation</div>
            <div className="w-40 border-b border-gray-400" />
          </div>
        </div>
      </div>
    </>
  )
}
