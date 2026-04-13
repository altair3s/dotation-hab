import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: fr })
}

export function formatDatetime(date: string | Date): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

// ─── Points ───────────────────────────────────────────────────────────────────
export function formatPoints(pts: number): string {
  return `${pts.toLocaleString('fr-FR')} pts`
}

export function ptsRestants(total: number, consommes: number): number {
  return Math.max(0, total - consommes)
}

export function tauxConsommation(total: number, consommes: number): number {
  if (total === 0) return 0
  return Math.round((consommes / total) * 100)
}

export function peuventCommander(
  ptsRestants: number,
  ptsPanier: number
): boolean {
  return ptsRestants >= ptsPanier
}

// ─── Références ───────────────────────────────────────────────────────────────
export function genererReference(
  type: 'CMD' | 'BC' | 'BL' | 'FAC' | 'DOT',
  annee: number,
  sequence: number
): string {
  return `${type}-${annee}-${String(sequence).padStart(5, '0')}`
}

// ─── Texte ────────────────────────────────────────────────────────────────────
export function initiales(prenom: string, nom: string): string {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase()
}

export function nomComplet(prenom: string, nom: string): string {
  return `${prenom} ${nom}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ─── Stock ────────────────────────────────────────────────────────────────────
export function statutStock(
  quantite: number,
  seuil: number
): 'ok' | 'faible' | 'rupture' {
  if (quantite === 0) return 'rupture'
  if (quantite <= seuil) return 'faible'
  return 'ok'
}

// ─── Catégories ───────────────────────────────────────────────────────────────
export const CATEGORIE_LABELS: Record<string, string> = {
  haut:        'Haut',
  bas:         'Bas',
  chaussures:  'Chaussures',
  epi:         'EPI',
  accessoires: 'Accessoires',
  outerwear:   'Vêtements de dessus',
  tous:        'Tous les articles',
}

// ─── Montants (admin uniquement) ──────────────────────────────────────────────
export function formatEuros(montantHT: number, tauxTVA = 0.2): {
  ht: string
  tva: string
  ttc: string
} {
  const tva = montantHT * tauxTVA
  const ttc = montantHT + tva
  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
  return { ht: fmt(montantHT), tva: fmt(tva), ttc: fmt(ttc) }
}
