// ─── Rôles ───────────────────────────────────────────────────────────────────
export type Role = 'admin_groupe' | 'admin_filiale' | 'salarie'

// ─── Filiales ─────────────────────────────────────────────────────────────────
export interface Filiale {
  id: string
  nom: string
  code: string
  groupe_id: string
  dotation_categorie: 'A' | 'B' | 'C'
  created_at: string
}

// ─── Profil utilisateur ───────────────────────────────────────────────────────
export interface Profil {
  id: string
  user_id: string
  nom: string
  prenom: string
  email: string
  matricule?: string
  filiale_id: string
  filiale?: Filiale
  role: Role
  actif: boolean
  created_at: string
}

// ─── Dotations annuelles ──────────────────────────────────────────────────────
export interface Dotation {
  id: string
  profil_id: string
  profil?: Profil
  annee: number
  pts_total: number
  pts_consommes: number
  pts_restants: number  // computed: pts_total - pts_consommes
  date_expiration: string
  created_at: string
}

// ─── Catalogue ────────────────────────────────────────────────────────────────
export type CategorieArticle =
  | 'haut'
  | 'bas'
  | 'chaussures'
  | 'epi'
  | 'accessoires'
  | 'outerwear'

export interface Fournisseur {
  id: string
  nom: string
  contact?: string
  email?: string
  telephone?: string
  delai_livraison_jours: number
  actif: boolean
}

export interface Article {
  id: string
  nom: string
  reference: string
  description?: string
  categorie_slug: CategorieArticle
  pts_cout: number
  // prix_achat_ht et tva_taux sont exclus des types exposés au salarié
  // ils n'apparaissent que dans les requêtes admin
  fournisseur_id?: string
  fournisseur?: Fournisseur
  ref_fournisseur?: string
  photos: string[]          // URLs Supabase Storage
  tags: string[]
  actif: boolean
  created_at: string
  // Relations
  tailles?: ArticleTaille[]
  stock_total?: number      // computed
}

export interface ArticleAdmin extends Article {
  prix_achat_ht: number
  tva_taux: number          // ex: 0.20 pour 20%
}

export interface ArticleTaille {
  id: string
  article_id: string
  taille: string            // ex: 'S', 'M', 'L', '40', '42', 'S/M'
  stock_quantite: number
  seuil_alerte: number
  statut_stock: 'ok' | 'faible' | 'rupture'  // computed
}

// ─── Commandes ────────────────────────────────────────────────────────────────
export type StatutCommande =
  | 'brouillon'
  | 'soumise'
  | 'validee'
  | 'en_preparation'
  | 'expediee'
  | 'livree'
  | 'annulee'

export interface Commande {
  id: string
  reference: string         // ex: CMD-2025-00042
  profil_id: string
  profil?: Profil
  statut: StatutCommande
  pts_total: number
  date_commande: string
  date_validation?: string
  validee_par?: string
  commentaire?: string
  adresse_livraison?: string
  created_at: string
  // Relations
  lignes?: CommandeLigne[]
  documents?: Document[]
}

export interface CommandeLigne {
  id: string
  commande_id: string
  article_id: string
  article?: Article
  taille: string
  quantite: number
  pts_unitaire: number
  pts_total: number         // computed: pts_unitaire * quantite
}

// ─── Documents ────────────────────────────────────────────────────────────────
export type TypeDocument =
  | 'bon_commande'
  | 'bon_livraison'
  | 'facture'
  | 'fiche_dotation'

export type StatutDocument =
  | 'brouillon'
  | 'emis'
  | 'archive'

export interface Document {
  id: string
  type: TypeDocument
  reference: string         // ex: BC-2025-00042
  commande_id?: string
  commande?: Commande
  profil_id?: string
  profil?: Profil
  url_storage: string       // URL signée Supabase Storage
  statut: StatutDocument
  genere_le: string
  genere_par: string
  created_at: string
}

// ─── Panier (state local Zustand) ─────────────────────────────────────────────
export interface CartItem {
  article: Article
  taille: string
  quantite: number
  pts_total: number
}

export interface Cart {
  items: CartItem[]
  pts_total: number         // computed
}

// ─── Filtres catalogue ────────────────────────────────────────────────────────
export interface CatalogueFilters {
  categorie_slug?: CategorieArticle | 'tous'
  search?: string
  disponible_uniquement: boolean
}

// ─── Réponses API / Supabase ──────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export interface ApiError {
  message: string
  code?: string
}

// ─── Dashboard admin ──────────────────────────────────────────────────────────
export interface DashboardMetrics {
  stock_total: number
  articles_count: number
  salaries_actifs: number
  filiales_count: number
  commandes_en_cours: number
  commandes_en_attente: number
  pts_distribues: number
  pts_consommes: number
  taux_consommation: number
  ruptures_count: number
  stock_critique_count: number
  salaries_sans_commande: number
}

export interface FilialeStats {
  filiale: Filiale
  salaries_count: number
  pts_total: number
  pts_consommes: number
  taux_consommation: number
  commandes_count: number
}
