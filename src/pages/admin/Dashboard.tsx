import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { supabase } from '@/services/supabase'
import type { StatutCommande } from '@/types'
import { formatPoints, formatDate } from '@/utils/formatters'

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchMetrics() {
  const annee = new Date().getFullYear()

  const [articles, salaries, filiales, commandes, dotations, ruptures] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }).eq('actif', true),
    supabase.from('profils').select('id', { count: 'exact', head: true }).eq('actif', true).eq('role', 'salarie'),
    supabase.from('filiales').select('id', { count: 'exact', head: true }).eq('actif', true),
    supabase.from('commandes').select('statut'),
    supabase.from('dotations').select('pts_total, pts_consommes').eq('annee', annee),
    supabase.from('articles_tailles').select('id', { count: 'exact', head: true }).eq('stock_quantite', 0),
  ])

  const cmdData = commandes.data ?? []
  const dotData = dotations.data ?? []

  return {
    articles_count:        articles.count ?? 0,
    salaries_actifs:       salaries.count ?? 0,
    filiales_count:        filiales.count ?? 0,
    commandes_en_attente:  cmdData.filter((c) => c.statut === 'soumise').length,
    commandes_en_cours:    cmdData.filter((c) =>
      ['soumise','validee','en_preparation','expediee'].includes(c.statut)).length,
    ruptures_count:        ruptures.count ?? 0,
    pts_distribues:        dotData.reduce((a, d) => a + d.pts_total, 0),
    pts_consommes:         dotData.reduce((a, d) => a + d.pts_consommes, 0),
  }
}

async function fetchRecentCommandes() {
  const { data, error } = await supabase
    .from('commandes')
    .select('id, reference, statut, pts_total, date_commande, profil:profils(nom, prenom, filiale:filiales(code))')
    .order('date_commande', { ascending: false })
    .limit(8)
  if (error) throw error
  return data
}

// ─── Composants ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, color = 'gray', icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'gray' | 'brand' | 'amber' | 'red'
  icon: React.ReactNode
}) {
  const colors = {
    gray:  'bg-white border-gray-200',
    brand: 'bg-teal-50 border-teal-100',
    amber: 'bg-amber-50 border-amber-100',
    red:   'bg-red-50 border-red-100',
  }
  const iconColors = {
    gray:  'bg-gray-100 text-gray-500',
    brand: 'bg-teal-100 text-brand',
    amber: 'bg-amber-100 text-amber-600',
    red:   'bg-red-100 text-red-500',
  }

  return (
    <div className={clsx('border rounded-xl p-4 flex items-start gap-3', colors[color])}>
      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', iconColors[color])}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

const STATUT_CONFIG: Record<StatutCommande, { label: string; className: string }> = {
  brouillon:       { label: 'Brouillon',      className: 'bg-gray-100 text-gray-600' },
  soumise:         { label: 'En attente',      className: 'bg-blue-50 text-blue-700' },
  validee:         { label: 'Validée',         className: 'bg-teal-50 text-brand' },
  en_preparation:  { label: 'En préparation',  className: 'bg-amber-50 text-amber-700' },
  expediee:        { label: 'Expédiée',        className: 'bg-purple-50 text-purple-700' },
  livree:          { label: 'Livrée',          className: 'bg-green-50 text-green-700' },
  annulee:         { label: 'Annulée',         className: 'bg-red-50 text-red-600' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: fetchMetrics,
  })

  const { data: commandes = [], isLoading: loadingCmd } = useQuery({
    queryKey: ['admin-commandes-recent'],
    queryFn: fetchRecentCommandes,
  })

  const tauxConso = metrics && metrics.pts_distribues > 0
    ? Math.round((metrics.pts_consommes / metrics.pts_distribues) * 100)
    : 0

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Tableau de bord</h1>

      {/* Métriques */}
      {loadingMetrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Articles actifs"
            value={metrics?.articles_count ?? 0}
            color="brand"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>}
          />
          <MetricCard
            label="Salariés actifs"
            value={metrics?.salaries_actifs ?? 0}
            sub={`${metrics?.filiales_count ?? 0} filiales`}
            color="gray"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>}
          />
          <MetricCard
            label="Commandes en attente"
            value={metrics?.commandes_en_attente ?? 0}
            color={metrics?.commandes_en_attente ? 'amber' : 'gray'}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>}
          />
          <MetricCard
            label="Ruptures de stock"
            value={metrics?.ruptures_count ?? 0}
            color={metrics?.ruptures_count ? 'red' : 'gray'}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>}
          />
        </div>
      )}

      {/* Consommation dotations */}
      {metrics && metrics.pts_distribues > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-900">
              Consommation des dotations {new Date().getFullYear()}
            </div>
            <div className="text-sm font-bold text-brand">{tauxConso}%</div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-brand h-2.5 rounded-full transition-all"
              style={{ width: `${tauxConso}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{formatPoints(metrics.pts_consommes)} consommés</span>
            <span>{formatPoints(metrics.pts_distribues)} distribués</span>
          </div>
        </div>
      )}

      {/* Commandes récentes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">Commandes récentes</div>
          <Link to="/admin/commandes" className="text-xs text-brand hover:underline">
            Voir tout →
          </Link>
        </div>

        {loadingCmd ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : commandes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aucune commande</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-4 py-2 font-medium">Référence</th>
                <th className="text-left px-4 py-2 font-medium">Salarié</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-2 font-medium">Points</th>
                <th className="text-right px-4 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((cmd) => {
                const profil = (cmd as any).profil
                const cfg = STATUT_CONFIG[cmd.statut as StatutCommande]
                return (
                  <tr key={cmd.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{cmd.reference}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {profil?.prenom} {profil?.nom}
                      </div>
                      <div className="text-[11px] text-gray-400">{profil?.filiale?.code}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell text-xs">
                      {formatDate(cmd.date_commande)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="w-2 h-2 bg-gold-200 rounded-full" />
                        <span className="font-medium text-gray-800">{formatPoints(cmd.pts_total)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', cfg.className)}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
