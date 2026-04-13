import { clsx } from 'clsx'
import type { StatutCommande, TypeDocument } from '@/types'

// ─── Badge générique ──────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'gold'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger:  'bg-red-50 text-red-700 border-red-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  gray:    'bg-gray-100 text-gray-600 border-gray-200',
  gold:    'bg-gold-50 text-gold-600 border-gold-100',
}

export function Badge({ variant = 'gray', children, className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        badgeStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full', {
            'bg-emerald-500': variant === 'success',
            'bg-amber-500':   variant === 'warning',
            'bg-red-500':     variant === 'danger',
            'bg-blue-500':    variant === 'info',
            'bg-gray-400':    variant === 'gray',
          })}
        />
      )}
      {children}
    </span>
  )
}

// ─── Badge stock article ──────────────────────────────────────────────────────
interface StockBadgeProps {
  quantite: number
  seuil: number
  className?: string
}

export function StockBadge({ quantite, seuil, className }: StockBadgeProps) {
  if (quantite === 0) {
    return <Badge variant="danger" dot className={className}>Rupture</Badge>
  }
  if (quantite <= seuil) {
    return <Badge variant="warning" dot className={className}>Stock faible</Badge>
  }
  return <Badge variant="success" dot className={className}>En stock</Badge>
}

// ─── Badge statut commande ────────────────────────────────────────────────────
const commandeStatuts: Record<StatutCommande, { label: string; variant: BadgeVariant }> = {
  brouillon:       { label: 'Brouillon',        variant: 'gray'    },
  soumise:         { label: 'Soumise',           variant: 'info'    },
  validee:         { label: 'Validée',           variant: 'success' },
  en_preparation:  { label: 'En préparation',    variant: 'warning' },
  expediee:        { label: 'Expédiée',          variant: 'info'    },
  livree:          { label: 'Livrée',            variant: 'success' },
  annulee:         { label: 'Annulée',           variant: 'danger'  },
}

export function CommandeStatutBadge({ statut }: { statut: StatutCommande }) {
  const { label, variant } = commandeStatuts[statut]
  return <Badge variant={variant} dot>{label}</Badge>
}

// ─── Badge type document ──────────────────────────────────────────────────────
const docTypes: Record<TypeDocument, { label: string; variant: BadgeVariant }> = {
  bon_commande:    { label: 'Bon de commande',  variant: 'info'    },
  bon_livraison:   { label: 'Bon de livraison', variant: 'success' },
  facture:         { label: 'Facture',          variant: 'gold'    },
  fiche_dotation:  { label: 'Fiche dotation',   variant: 'gray'    },
}

export function DocumentTypeBadge({ type }: { type: TypeDocument }) {
  const { label, variant } = docTypes[type]
  return <Badge variant={variant}>{label}</Badge>
}
