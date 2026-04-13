# DotaGroupe — Gestion des dotations d'habillement

Application web de gestion des dotations vestimentaires et accessoires pour groupes multi-filiales.

## Stack technique

| Couche      | Technologie                          |
|-------------|--------------------------------------|
| Frontend    | React 18 + Vite + TypeScript         |
| Styles      | Tailwind CSS                         |
| State       | Zustand + React Query                |
| Backend/BDD | Supabase (PostgreSQL + Auth + Storage)|
| Hébergement | OVH (build statique)                 |

## Démarrage rapide

### 1. Cloner et installer

```bash
git clone <url-du-repo>
cd dotation-groupe
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécuter `supabase/migrations/001_initial_schema.sql`
3. Dans **Authentication > Settings**, configurer :
   - Site URL : `http://localhost:5173` (dev) ou votre URL OVH (prod)
   - Email templates : personnaliser au nom du groupe

### 3. Variables d'environnement

```bash
cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
# (disponibles dans Supabase > Project Settings > API)
```

### 4. Lancer le projet

```bash
npm run dev
# → http://localhost:5173
```

### 5. Créer le premier utilisateur admin

Dans **Supabase > Authentication > Users** :
1. Cliquer "Add user" → renseigner email + mot de passe
2. Récupérer l'`user_id` généré
3. Dans SQL Editor :
```sql
insert into profils (user_id, nom, prenom, filiale_id, role)
values (
  '<user_id>',
  'Nom',
  'Prénom',
  (select id from filiales where code = 'AFI'),
  'admin_groupe'
);
```

---

## Architecture du projet

```
src/
├── components/
│   ├── layout/       TopBar, Layout, ProtectedRoute
│   ├── ui/           Button, Badge, Modal (composants réutilisables)
│   ├── catalog/      ArticleCard, SizeSelector, StockBadge     [Sprint 2]
│   ├── cart/         CartPanel, CartItem, PointsSummary         [Sprint 2]
│   ├── admin/        MetricCard, StockTable, FilialeCard        [Sprint 3]
│   └── documents/    DocumentViewer, GenerateButton             [Sprint 4]
├── pages/
│   ├── auth/         Login, ResetPassword
│   ├── salarie/      Catalogue, Commande, Historique            [Sprint 2]
│   └── admin/        Dashboard, Stocks, Catalogue, Salaries...  [Sprint 3+]
├── hooks/            useAuth, useCart, useStock, useCommandes...
├── services/         supabase.ts, pdf.service.ts                [Sprint 4]
├── stores/           authStore.ts, cartStore.ts
├── types/            index.ts (tous les types TypeScript)
└── utils/            formatters.ts
```

## Sprints de développement

| Sprint | Contenu                                          | Durée  |
|--------|--------------------------------------------------|--------|
| ✅ 1   | Fondations : auth, routing, BDD, types           | 1 sem. |
| 2      | Espace salarié : catalogue, panier, commande     | 1 sem. |
| 3      | Back-office : stocks, salariés, dotations        | 1 sem. |
| 4      | Documents PDF : génération, archivage, emails    | 1 sem. |
| 5      | Catalogue admin : articles, photos, fournisseurs | 1 sem. |
| 6      | Finitions : responsive, Excel, déploiement OVH  | 1 sem. |

## Déploiement OVH

```bash
npm run build
# Copier le contenu de dist/ sur votre hébergement OVH via FTP ou SSH

# Ajouter un fichier .htaccess pour le routing SPA :
echo 'RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]' > dist/.htaccess
```

## Rôles et permissions

| Rôle            | Accès                                                        |
|-----------------|--------------------------------------------------------------|
| `admin_groupe`  | Tout : toutes filiales, factures €, paramétrage              |
| `admin_filiale` | Sa filiale : stocks, commandes, documents (hors factures €)  |
| `salarie`       | Son espace : catalogue (pts), commande, historique           |

> Les prix en euros ne sont jamais exposés aux salariés ni aux admins filiale.
> Seuls les `admin_groupe` ont accès aux montants réels (via RLS PostgreSQL).

## Variables d'environnement

| Variable               | Description                          |
|------------------------|--------------------------------------|
| `VITE_SUPABASE_URL`    | URL de votre projet Supabase         |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase (anon key)  |
| `VITE_APP_NAME`        | Nom affiché dans le header           |
| `VITE_GROUP_NAME`      | Nom du groupe (sous le logo)         |
| `VITE_APP_URL`         | URL de prod (pour liens email)       |
