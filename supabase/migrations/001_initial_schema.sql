-- ============================================================
-- DOTATION GROUPE — Migration initiale
-- Version : 001
-- Exécuter dans : Supabase > SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ─── 1. FILIALES ─────────────────────────────────────────────────────────────

create table filiales (
  id                  uuid primary key default uuid_generate_v4(),
  nom                 text not null,
  code                text not null unique,          -- ex: 'AFI', 'TV', 'HOP'
  groupe_id           text not null default 'groupe_principal',
  dotation_categorie  text not null check (dotation_categorie in ('A', 'B', 'C')),
  actif               boolean not null default true,
  created_at          timestamptz not null default now()
);

comment on table filiales is 'Filiales du groupe, chacune avec sa catégorie de dotation';

-- ─── 2. PROFILS UTILISATEURS ──────────────────────────────────────────────────
-- Étend auth.users de Supabase

create table profils (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  nom         text not null,
  prenom      text not null,
  matricule   text unique,
  filiale_id  uuid not null references filiales(id),
  role        text not null check (role in ('admin_groupe', 'admin_filiale', 'salarie')),
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table profils is 'Profil étendu de chaque utilisateur, lié à auth.users';
comment on column profils.role is 'admin_groupe: accès total | admin_filiale: accès à sa filiale | salarie: espace commande';

-- Index utiles
create index idx_profils_filiale on profils(filiale_id);
create index idx_profils_role    on profils(role);
create index idx_profils_user    on profils(user_id);

-- ─── 3. DOTATIONS ANNUELLES ───────────────────────────────────────────────────

create table dotations (
  id               uuid primary key default uuid_generate_v4(),
  profil_id        uuid not null references profils(id) on delete cascade,
  annee            int  not null check (annee >= 2024),
  pts_total        int  not null check (pts_total >= 0),
  pts_consommes    int  not null default 0 check (pts_consommes >= 0),
  date_expiration  date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (profil_id, annee)   -- une dotation par salarié par an
);

comment on table dotations is 'Enveloppe de points attribuée à chaque salarié par année';
comment on column dotations.pts_total     is 'Total de points alloués (correspond à un montant €, non visible du salarié)';
comment on column dotations.pts_consommes is 'Points déjà utilisés dans des commandes validées';

-- Vue pratique : points restants calculés
create view v_dotations_avec_solde as
select
  d.*,
  (d.pts_total - d.pts_consommes) as pts_restants,
  round((d.pts_consommes::numeric / nullif(d.pts_total, 0)) * 100, 1) as taux_consommation,
  p.nom, p.prenom, p.matricule,
  f.nom as filiale_nom, f.code as filiale_code
from dotations d
join profils p on p.id = d.profil_id
join filiales f on f.id = p.filiale_id;

-- ─── 4. CATALOGUE ────────────────────────────────────────────────────────────

create table categories_article (
  id              uuid primary key default uuid_generate_v4(),
  nom             text not null,
  slug            text not null unique,   -- 'haut', 'bas', 'chaussures', 'epi', 'accessoires', 'outerwear'
  icone           text,                   -- nom d'icône ou SVG
  ordre_affichage int  not null default 0
);

insert into categories_article (nom, slug, ordre_affichage) values
  ('Hauts',                'haut',        1),
  ('Bas',                  'bas',         2),
  ('Chaussures',           'chaussures',  3),
  ('EPI & Sécurité',       'epi',         4),
  ('Vêtements de dessus',  'outerwear',   5),
  ('Accessoires',          'accessoires', 6);

create table fournisseurs (
  id                    uuid primary key default uuid_generate_v4(),
  nom                   text not null,
  contact               text,
  email                 text,
  telephone             text,
  delai_livraison_jours int  not null default 7,
  actif                 boolean not null default true,
  created_at            timestamptz not null default now()
);

create table articles (
  id               uuid primary key default uuid_generate_v4(),
  nom              text not null,
  reference        text not null unique,
  description      text,
  categorie_slug   text not null references categories_article(slug),
  pts_cout         int  not null check (pts_cout > 0),
  -- Champs sensibles (admin seulement via RLS)
  prix_achat_ht    numeric(10,2),
  tva_taux         numeric(4,3) default 0.200,
  ref_fournisseur  text,
  fournisseur_id   uuid references fournisseurs(id),
  -- Media
  photos           text[] not null default '{}',   -- paths Storage bucket 'catalogue'
  tags             text[] not null default '{}',
  -- Statut
  actif            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column articles.prix_achat_ht is 'Prix d''achat HT — jamais exposé aux salariés (RLS)';
comment on column articles.pts_cout      is 'Coût en points — seule valeur visible du salarié';

create index idx_articles_categorie on articles(categorie_slug);
create index idx_articles_actif     on articles(actif);

-- Stock par taille
create table articles_tailles (
  id              uuid primary key default uuid_generate_v4(),
  article_id      uuid not null references articles(id) on delete cascade,
  taille          text not null,          -- 'S', 'M', 'L', '40', '42', 'S/M', 'Unique'...
  stock_quantite  int  not null default 0 check (stock_quantite >= 0),
  seuil_alerte    int  not null default 5,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (article_id, taille)
);

comment on table articles_tailles is 'Stock réel par article et par taille — source de vérité pour le catalogue';

-- Vue catalogue salarié (sans prix €)
create view v_catalogue_salarie as
select
  a.id, a.nom, a.reference, a.description,
  a.categorie_slug, a.pts_cout, a.photos, a.tags, a.actif,
  json_agg(
    json_build_object(
      'id',             at.id,
      'taille',         at.taille,
      'stock_quantite', at.stock_quantite,
      'seuil_alerte',   at.seuil_alerte,
      'statut_stock',   case
                          when at.stock_quantite = 0 then 'rupture'
                          when at.stock_quantite <= at.seuil_alerte then 'faible'
                          else 'ok'
                        end
    ) order by at.taille
  ) as tailles,
  sum(at.stock_quantite) as stock_total
from articles a
left join articles_tailles at on at.article_id = a.id
where a.actif = true
group by a.id;

-- ─── 5. COMMANDES ────────────────────────────────────────────────────────────

create sequence seq_commande_num start 1;

create table commandes (
  id               uuid primary key default uuid_generate_v4(),
  reference        text not null unique
                   default 'CMD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('seq_commande_num')::text, 5, '0'),
  profil_id        uuid not null references profils(id),
  statut           text not null default 'soumise'
                   check (statut in ('brouillon','soumise','validee','en_preparation','expediee','livree','annulee')),
  pts_total        int  not null default 0,
  commentaire      text,
  adresse_livraison text,
  date_commande    timestamptz not null default now(),
  date_validation  timestamptz,
  validee_par      uuid references profils(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_commandes_profil  on commandes(profil_id);
create index idx_commandes_statut  on commandes(statut);
create index idx_commandes_date    on commandes(date_commande desc);

create table commandes_lignes (
  id            uuid primary key default uuid_generate_v4(),
  commande_id   uuid not null references commandes(id) on delete cascade,
  article_id    uuid not null references articles(id),
  taille        text not null,
  quantite      int  not null check (quantite > 0),
  pts_unitaire  int  not null,
  pts_total     int  generated always as (quantite * pts_unitaire) stored,
  created_at    timestamptz not null default now()
);

comment on column commandes_lignes.pts_total is 'Calculé automatiquement : quantite × pts_unitaire';

-- ─── 6. DOCUMENTS ────────────────────────────────────────────────────────────

create sequence seq_document_num start 1;

create table documents (
  id           uuid primary key default uuid_generate_v4(),
  type         text not null
               check (type in ('bon_commande','bon_livraison','facture','fiche_dotation')),
  reference    text not null unique,
  commande_id  uuid references commandes(id),
  profil_id    uuid references profils(id),
  url_storage  text not null,           -- path dans bucket 'documents'
  statut       text not null default 'emis'
               check (statut in ('brouillon','emis','archive')),
  genere_le    timestamptz not null default now(),
  genere_par   uuid references profils(id),
  created_at   timestamptz not null default now()
);

create index idx_documents_commande on documents(commande_id);
create index idx_documents_profil   on documents(profil_id);
create index idx_documents_type     on documents(type);

-- ─── 7. TRIGGERS UPDATED_AT ──────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profils_updated_at
  before update on profils
  for each row execute function set_updated_at();

create trigger trg_dotations_updated_at
  before update on dotations
  for each row execute function set_updated_at();

create trigger trg_articles_updated_at
  before update on articles
  for each row execute function set_updated_at();

create trigger trg_articles_tailles_updated_at
  before update on articles_tailles
  for each row execute function set_updated_at();

create trigger trg_commandes_updated_at
  before update on commandes
  for each row execute function set_updated_at();

-- ─── 8. TRIGGER : décrémenter le stock lors de la validation ─────────────────

create or replace function decrementer_stock_commande()
returns trigger language plpgsql as $$
begin
  -- Se déclenche quand une commande passe à 'validee'
  if new.statut = 'validee' and old.statut != 'validee' then
    -- Décrémenter le stock pour chaque ligne
    update articles_tailles at
    set stock_quantite = at.stock_quantite - cl.quantite
    from commandes_lignes cl
    where cl.commande_id = new.id
      and at.article_id  = cl.article_id
      and at.taille      = cl.taille;

    -- Mettre à jour les points consommés du salarié (dotation de l'année courante)
    update dotations
    set pts_consommes = pts_consommes + new.pts_total
    where profil_id = new.profil_id
      and annee = extract(year from now())::int;
  end if;
  return new;
end;
$$;

create trigger trg_commande_validation
  after update on commandes
  for each row execute function decrementer_stock_commande();

-- ─── 9. ROW LEVEL SECURITY ───────────────────────────────────────────────────

alter table filiales          enable row level security;
alter table profils           enable row level security;
alter table dotations         enable row level security;
alter table articles          enable row level security;
alter table articles_tailles  enable row level security;
alter table commandes         enable row level security;
alter table commandes_lignes  enable row level security;
alter table documents         enable row level security;

-- Helper : récupère le rôle de l'utilisateur connecté
create or replace function current_role_dotation()
returns text language sql security definer stable as $$
  select role from profils where user_id = auth.uid()
$$;

-- Helper : filiale de l'utilisateur connecté
create or replace function current_filiale_id()
returns uuid language sql security definer stable as $$
  select filiale_id from profils where user_id = auth.uid()
$$;

-- Helper : profil_id de l'utilisateur connecté
create or replace function current_profil_id()
returns uuid language sql security definer stable as $$
  select id from profils where user_id = auth.uid()
$$;

-- ── Filiales : lecture pour tous les connectés
create policy "filiales_select_all" on filiales
  for select to authenticated using (true);

-- ── Profils : chacun voit le sien ; admins voient leur filiale ou tout
create policy "profils_select_own" on profils
  for select to authenticated using (
    user_id = auth.uid()
    or current_role_dotation() = 'admin_groupe'
    or (current_role_dotation() = 'admin_filiale' and filiale_id = current_filiale_id())
  );

create policy "profils_update_own" on profils
  for update to authenticated using (user_id = auth.uid());

create policy "profils_all_admin_groupe" on profils
  for all to authenticated using (current_role_dotation() = 'admin_groupe');

-- ── Dotations : salarié voit la sienne ; admins voient filiale / tout
create policy "dotations_select" on dotations
  for select to authenticated using (
    profil_id = current_profil_id()
    or current_role_dotation() = 'admin_groupe'
    or (current_role_dotation() = 'admin_filiale'
        and profil_id in (
          select id from profils where filiale_id = current_filiale_id()
        ))
  );

create policy "dotations_insert_admin" on dotations
  for insert to authenticated
  with check (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

create policy "dotations_update_admin" on dotations
  for update to authenticated
  using (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

-- ── Articles : lecture publique (sans prix €) ; écriture admin seulement
create policy "articles_select_salarie" on articles
  for select to authenticated using (actif = true);

create policy "articles_select_admin" on articles
  for select to authenticated
  using (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

create policy "articles_write_admin" on articles
  for all to authenticated
  using (current_role_dotation() in ('admin_groupe', 'admin_filiale'))
  with check (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

-- ── Articles_tailles : lecture tous ; écriture admin
create policy "tailles_select" on articles_tailles
  for select to authenticated using (true);

create policy "tailles_write_admin" on articles_tailles
  for all to authenticated
  using (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

-- ── Commandes : salarié voit les siennes ; admins voient filiale / tout
create policy "commandes_select_own" on commandes
  for select to authenticated using (
    profil_id = current_profil_id()
    or current_role_dotation() = 'admin_groupe'
    or (current_role_dotation() = 'admin_filiale'
        and profil_id in (select id from profils where filiale_id = current_filiale_id()))
  );

create policy "commandes_insert_own" on commandes
  for insert to authenticated
  with check (profil_id = current_profil_id());

create policy "commandes_update_admin" on commandes
  for update to authenticated
  using (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

-- ── Commandes_lignes : hérite des droits commandes
create policy "lignes_select" on commandes_lignes
  for select to authenticated using (
    commande_id in (select id from commandes where profil_id = current_profil_id())
    or current_role_dotation() in ('admin_groupe', 'admin_filiale')
  );

create policy "lignes_insert_own" on commandes_lignes
  for insert to authenticated
  with check (
    commande_id in (select id from commandes where profil_id = current_profil_id())
  );

-- ── Documents : salarié voit les siens ; admins voient tout / factures admin seulement
create policy "documents_select" on documents
  for select to authenticated using (
    -- Salarié : voit ses docs sauf les factures
    (profil_id = current_profil_id() and type != 'facture')
    -- Admin filiale : voit docs de sa filiale
    or (current_role_dotation() = 'admin_filiale'
        and profil_id in (select id from profils where filiale_id = current_filiale_id()))
    -- Admin groupe : voit tout
    or current_role_dotation() = 'admin_groupe'
  );

create policy "documents_write_admin" on documents
  for all to authenticated
  using (current_role_dotation() in ('admin_groupe', 'admin_filiale'));

-- ─── 10. STORAGE BUCKETS ─────────────────────────────────────────────────────
-- À exécuter dans Supabase > Storage > New Bucket (ou via SQL)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalogue', 'catalogue', true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Policies storage catalogue (photos articles, publiques en lecture)
create policy "catalogue_public_read" on storage.objects
  for select using (bucket_id = 'catalogue');

create policy "catalogue_admin_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalogue'
    and (select role from profils where user_id = auth.uid()) in ('admin_groupe', 'admin_filiale')
  );

-- Policies storage documents (privé — URL signées uniquement)
create policy "documents_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      (select role from profils where user_id = auth.uid()) in ('admin_groupe', 'admin_filiale')
      or name like '%' || (select filiale_id::text from profils where user_id = auth.uid()) || '%'
    )
  );

create policy "documents_write_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (select role from profils where user_id = auth.uid()) in ('admin_groupe', 'admin_filiale')
  );

-- ─── 11. DONNÉES DE TEST (optionnel, commenter en prod) ──────────────────────

-- Filiale de test
insert into filiales (nom, code, dotation_categorie) values
  ('GPNS',  'GPNS', 'B'),
  ('Transavia France',       'TV',  'A'),
  ('Hop! Airlines',          'HOP', 'A'),
  ('KLM Ground Services',    'KLM', 'C');

-- Fournisseur de test
insert into fournisseurs (nom, contact, email, delai_livraison_jours) values
  ('Vêtements Pro SARL',  'Marc Dupont', 'marc@vetpro.fr', 5),
  ('SafeWear Europe',     'Lisa Klein',  'lisa@safewear.eu', 10);

-- Article de test
insert into articles (nom, reference, categorie_slug, pts_cout, photos, tags) values
  ('Veste softshell travail', 'VTR-2024-SS', 'outerwear',  85, '{}', array['travail', 'hiver']),
  ('Pantalon stretch',        'PTR-2024-ST', 'bas',         65, '{}', array['travail']),
  ('Polo manches courtes',    'PMC-2024-BL', 'haut',        40, '{}', array['été']),
  ('Chaussures sécurité S3',  'CSS-2024-S3', 'chaussures', 120, '{}', array['epi', 'sécurité']),
  ('Parka haute visibilité',  'PHV-2024-JN', 'outerwear',  110, '{}', array['hiver', 'visibilité']),
  ('Casque de protection',    'CAS-2024-RG', 'epi',         55, '{}', array['epi', 'sécurité']);

-- Stock par taille
insert into articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
select id, unnest(array['S','M','L','XL','XXL']), unnest(array[24,31,18,3,0]), 5
from articles where reference = 'VTR-2024-SS';

insert into articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
select id, unnest(array['38','40','42','44','46','48']), unnest(array[12,28,34,19,4,0]), 5
from articles where reference = 'PTR-2024-ST';

insert into articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
select id, unnest(array['S','M','L','XL','XXL']), unnest(array[44,62,38,25,17]), 10
from articles where reference = 'PMC-2024-BL';

insert into articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
select id, unnest(array['39','40','41','42','43','44']), unnest(array[2,11,8,1,7,0]), 5
from articles where reference = 'CSS-2024-S3';

insert into articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
select id, unnest(array['S','M','L','XL']), unnest(array[15,22,8,0]), 5
from articles where reference = 'PHV-2024-JN';

insert into articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
select id, unnest(array['S/M','L/XL']), unnest(array[0,0]), 5
from articles where reference = 'CAS-2024-RG';
