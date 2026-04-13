-- =============================================================================
-- SEED CATALOGUE — DotaGroupe
-- Coller dans Supabase → SQL Editor et exécuter
-- =============================================================================

-- Nettoyage préalable (optionnel — décommenter si besoin de repartir à zéro)
-- DELETE FROM articles_tailles;
-- DELETE FROM articles;

-- =============================================================================
-- 1. ARTICLES
-- =============================================================================

INSERT INTO articles (nom, reference, description, categorie_slug, pts_cout, prix_achat_ht, tva_taux, ref_fournisseur, tags, photos, actif)
VALUES

-- ── Hauts ─────────────────────────────────────────────────────────────────────
(
  'Polo manches courtes piqué',
  'POLO-MC-001',
  'Polo en coton piqué 220 g/m², col côtelé, logo brodé poitrine.',
  'haut', 80, 12.50, 0.20, 'FORN-POLO-220',
  ARRAY['homme','femme','été','coton'], '{}', true
),
(
  'T-shirt col rond respirant',
  'TSH-CR-001',
  'T-shirt technique en polyester recyclé, effet wicking, coutures plates.',
  'haut', 60, 8.90, 0.20, 'FORN-TSH-210',
  ARRAY['homme','femme','été','polyester'], '{}', true
),
(
  'Chemise manches longues popeline',
  'CHE-ML-001',
  'Chemise professionnelle popeline 120 fils, col semi-cutaway, poignets boutonnés.',
  'haut', 110, 22.00, 0.20, 'FORN-CHE-120',
  ARRAY['homme','toute saison','popeline'], '{}', true
),
(
  'Polo manches longues thermique',
  'POLO-TH-001',
  'Polo chaud double épaisseur, col zip 1/4, poignets côtelés anti-remontée.',
  'haut', 100, 18.00, 0.20, 'FORN-POLO-TH',
  ARRAY['homme','femme','hiver','thermique'], '{}', true
),
(
  'Sweat-shirt à capuche zippé',
  'SWE-HZ-001',
  'Sweat molleton gratté 320 g/m², zip YKK, poche kangourou, capuche réglable.',
  'haut', 130, 28.00, 0.20, 'FORN-SWE-320',
  ARRAY['homme','femme','hiver','molleton'], '{}', true
),

-- ── Bas ───────────────────────────────────────────────────────────────────────
(
  'Pantalon de travail multipoches',
  'PANT-MP-001',
  'Pantalon cargo en coton/polyester 260 g/m², 8 poches, genouillères intégrées.',
  'bas', 130, 32.00, 0.20, 'FORN-PANT-260',
  ARRAY['homme','toute saison','cargo','robuste'], '{}', true
),
(
  'Pantalon de travail femme coupe droite',
  'PANT-FEM-001',
  'Coupe droite adaptée morphologie féminine, taille élastiquée dos, 6 poches.',
  'bas', 130, 32.00, 0.20, 'FORN-PANT-FEM',
  ARRAY['femme','toute saison','coupe droite'], '{}', true
),
(
  'Short de travail stretch',
  'SHORT-STR-001',
  'Short genoux en tissu stretch bidirectionnel, ceinture réglable, 2 poches cargo.',
  'bas', 90, 21.00, 0.20, 'FORN-SHORT-STR',
  ARRAY['homme','femme','été','stretch'], '{}', true
),
(
  'Pantalon hiver doublé polaire',
  'PANT-POL-001',
  'Pantalon extérieur résistant, doublure polaire 200 g/m² amovible, genoux renforcés.',
  'bas', 180, 48.00, 0.20, 'FORN-PANT-POL',
  ARRAY['homme','hiver','polaire','chantier'], '{}', true
),

-- ── Chaussures ────────────────────────────────────────────────────────────────
(
  'Chaussures de sécurité basse S1P',
  'CSS-S1P-001',
  'Norme EN ISO 20345 S1P. Embout acier 200 J, semelle anti-perforation, antistatique.',
  'chaussures', 170, 42.00, 0.20, 'FORN-CSS-S1P',
  ARRAY['sécurité','S1P','antistatique','mixte'], '{}', true
),
(
  'Chaussures de sécurité haute S3 waterproof',
  'CSS-S3H-001',
  'Norme EN ISO 20345 S3. Montante, embout composite, membrane imperméable, semelle Vibram.',
  'chaussures', 220, 65.00, 0.20, 'FORN-CSS-S3H',
  ARRAY['sécurité','S3','imperméable','chantier'], '{}', true
),
(
  'Sneaker de sécurité S1 SRC',
  'SNK-S1-001',
  'Look sneaker, norme S1 SRC. Embout aluminium léger, semelle antidérapante ESD.',
  'chaussures', 150, 38.00, 0.20, 'FORN-SNK-S1',
  ARRAY['sécurité','S1','léger','bureau'], '{}', true
),

-- ── EPI ───────────────────────────────────────────────────────────────────────
(
  'Gilet de signalisation haute visibilité',
  'GIL-HV-001',
  'Classe 2 EN ISO 20471. Bandes rétroréfléchissantes 50 mm, fermeture velcro, 2 poches.',
  'epi', 35, 5.50, 0.20, 'FORN-GIL-HV',
  ARRAY['haute-visibilité','classe2','chantier'], '{}', true
),
(
  'Gants de travail anti-coupure niveau D',
  'GNT-ACD-001',
  'Norme EN 388. Niveau de coupure D (HPPE+acier), paume en nitrile, dos aéré.',
  'epi', 40, 7.20, 0.20, 'FORN-GNT-ACD',
  ARRAY['gants','anti-coupure','nitrile','chantier'], '{}', true
),
(
  'Lunettes de protection panoramiques',
  'LUN-PAN-001',
  'Norme EN 166. Verres PC traitement anti-rayures et anti-buée, branches réglables.',
  'epi', 25, 3.80, 0.20, 'FORN-LUN-PAN',
  ARRAY['lunettes','protection','anti-buée'], '{}', true
),
(
  'Casque de chantier réglable',
  'CAS-CH-001',
  'Norme EN 397. Polyéthylène haute densité, harnais 6 points, serre-tête réglable.',
  'epi', 45, 9.00, 0.20, 'FORN-CAS-CH',
  ARRAY['casque','chantier','HDPE'], '{}', true
),

-- ── Vêtements de dessus ───────────────────────────────────────────────────────
(
  'Veste softshell stretch 3 couches',
  'VSH-3C-001',
  'Softshell stretch 340 g/m², déperlant DWR, 4 poches zippées, col montant.',
  'outerwear', 200, 55.00, 0.20, 'FORN-VSH-3C',
  ARRAY['homme','femme','mi-saison','softshell','déperlant'], '{}', true
),
(
  'Parka hiver imperméable 5 000 mm',
  'PRK-HIV-001',
  'Imperméabilité 5 000 mm, coutures soudées, doublure polaire amovible, capuche ajustable.',
  'outerwear', 280, 85.00, 0.20, 'FORN-PRK-HIV',
  ARRAY['homme','hiver','imperméable','parka'], '{}', true
),
(
  'Veste coupe-vent légère packable',
  'VCP-LEG-001',
  'Ultra-légère 80 g/m², se range dans sa propre poche, coupe-vent, traitement déperlant.',
  'outerwear', 150, 38.00, 0.20, 'FORN-VCP-LEG',
  ARRAY['homme','femme','mi-saison','packable','léger'], '{}', true
),

-- ── Accessoires ───────────────────────────────────────────────────────────────
(
  'Casquette visière réglable',
  'CAQ-VIS-001',
  'Coton twill 6 panneaux, logo brodé, fermeture velcro réglable, taille unique.',
  'accessoires', 30, 5.00, 0.20, 'FORN-CAQ-VIS',
  ARRAY['unisexe','coton','été'], '{}', true
),
(
  'Bonnet acrylique côtelé',
  'BON-ACR-001',
  'Acrylique 100 % double épaisseur, revers roulé, logo brodé discret, taille unique.',
  'accessoires', 25, 4.20, 0.20, 'FORN-BON-ACR',
  ARRAY['unisexe','hiver','acrylique'], '{}', true
),
(
  'Ceinture nylon avec boucle métal',
  'CEI-NYL-001',
  'Nylon 38 mm, boucle en zinc mat, longueur réglable 75→130 cm.',
  'accessoires', 20, 3.50, 0.20, 'FORN-CEI-NYL',
  ARRAY['unisexe','toute saison','nylon'], '{}', true
),
(
  'Chaussettes hautes anti-transpiration (lot de 3)',
  'CHS-AT-001',
  'Lot de 3 paires. Mélange coton/polyamide, bande de compression cheville, pointe renforcée.',
  'accessoires', 35, 6.80, 0.20, 'FORN-CHS-AT',
  ARRAY['unisexe','toute saison','coton','lot3'], '{}', true
),
(
  'Sac à dos 25 L avec poche laptop',
  'SAC-25L-001',
  'Polyester 600D, poche laptop 15", poches organisatrices, dos rembourrée, taille unique.',
  'accessoires', 90, 24.00, 0.20, 'FORN-SAC-25L',
  ARRAY['unisexe','toute saison','polyester'], '{}', true
);


-- =============================================================================
-- 2. TAILLES PAR ARTICLE
-- =============================================================================

-- ── Polo manches courtes ──────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',15,5),('S',40,10),('M',60,10),('L',55,10),('XL',35,10),('XXL',20,5),('3XL',10,5)) AS t(taille,stock,seuil)
WHERE reference = 'POLO-MC-001';

-- ── T-shirt col rond ──────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',10,5),('S',35,10),('M',55,10),('L',50,10),('XL',30,10),('XXL',15,5),('3XL',8,5)) AS t(taille,stock,seuil)
WHERE reference = 'TSH-CR-001';

-- ── Chemise manches longues ───────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('S',20,5),('M',40,8),('L',45,8),('XL',30,8),('XXL',15,5),('3XL',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'CHE-ML-001';

-- ── Polo thermique ────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',8,3),('S',25,8),('M',40,8),('L',38,8),('XL',22,5),('XXL',12,5)) AS t(taille,stock,seuil)
WHERE reference = 'POLO-TH-001';

-- ── Sweat zippé ───────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',6,3),('S',20,5),('M',35,8),('L',32,8),('XL',20,5),('XXL',10,5),('3XL',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'SWE-HZ-001';

-- ── Pantalon multipoches homme ────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('38',10,5),('40',25,8),('42',40,8),('44',45,8),('46',35,8),('48',20,5),('50',10,5),('52',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'PANT-MP-001';

-- ── Pantalon femme ────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('36',8,5),('38',20,8),('40',35,8),('42',38,8),('44',25,8),('46',15,5),('48',8,3)) AS t(taille,stock,seuil)
WHERE reference = 'PANT-FEM-001';

-- ── Short stretch ─────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('S',15,5),('M',25,8),('L',28,8),('XL',20,5),('XXL',10,5),('3XL',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'SHORT-STR-001';

-- ── Pantalon hiver polaire ────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('38',5,3),('40',12,5),('42',20,5),('44',22,5),('46',18,5),('48',10,5),('50',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'PANT-POL-001';

-- ── Chaussures S1P ───────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('38',8,3),('39',12,5),('40',20,5),('41',25,5),('42',28,5),('43',22,5),('44',18,5),('45',12,5),('46',8,3),('47',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'CSS-S1P-001';

-- ── Chaussures S3 haute ───────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('38',5,3),('39',8,3),('40',15,5),('41',18,5),('42',20,5),('43',18,5),('44',15,5),('45',10,3),('46',6,3),('47',3,2)) AS t(taille,stock,seuil)
WHERE reference = 'CSS-S3H-001';

-- ── Sneaker S1 ────────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('37',5,3),('38',10,5),('39',15,5),('40',20,5),('41',22,5),('42',20,5),('43',15,5),('44',10,5),('45',8,3),('46',4,2)) AS t(taille,stock,seuil)
WHERE reference = 'SNK-S1-001';

-- ── Gilet HV ──────────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('S/M',30,10),('L/XL',50,10),('XXL/3XL',25,8)) AS t(taille,stock,seuil)
WHERE reference = 'GIL-HV-001';

-- ── Gants anti-coupure ────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('7 (S)',20,8),('8 (M)',40,10),('9 (L)',40,10),('10 (XL)',25,8),('11 (XXL)',10,5)) AS t(taille,stock,seuil)
WHERE reference = 'GNT-ACD-001';

-- ── Lunettes panoramiques ─────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('Unique',80,15)) AS t(taille,stock,seuil)
WHERE reference = 'LUN-PAN-001';

-- ── Casque de chantier ────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('Unique',60,10)) AS t(taille,stock,seuil)
WHERE reference = 'CAS-CH-001';

-- ── Softshell 3 couches ───────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',5,3),('S',15,5),('M',25,8),('L',22,8),('XL',15,5),('XXL',8,3),('3XL',4,2)) AS t(taille,stock,seuil)
WHERE reference = 'VSH-3C-001';

-- ── Parka hiver ───────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',3,2),('S',10,5),('M',18,5),('L',16,5),('XL',12,5),('XXL',7,3),('3XL',3,2)) AS t(taille,stock,seuil)
WHERE reference = 'PRK-HIV-001';

-- ── Veste coupe-vent packable ─────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('XS',8,3),('S',18,5),('M',28,8),('L',25,8),('XL',18,5),('XXL',10,5),('3XL',5,3)) AS t(taille,stock,seuil)
WHERE reference = 'VCP-LEG-001';

-- ── Casquette ─────────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('Unique',100,20)) AS t(taille,stock,seuil)
WHERE reference = 'CAQ-VIS-001';

-- ── Bonnet ────────────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('Unique',80,15)) AS t(taille,stock,seuil)
WHERE reference = 'BON-ACR-001';

-- ── Ceinture ──────────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('75-95 cm',30,8),('90-110 cm',40,8),('105-130 cm',25,8)) AS t(taille,stock,seuil)
WHERE reference = 'CEI-NYL-001';

-- ── Chaussettes lot 3 ─────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('39-42',50,10),('43-46',60,10),('47-50',20,5)) AS t(taille,stock,seuil)
WHERE reference = 'CHS-AT-001';

-- ── Sac à dos ─────────────────────────────────────────────────────────────────
INSERT INTO articles_tailles (article_id, taille, stock_quantite, seuil_alerte)
SELECT id, t.taille, t.stock, t.seuil FROM articles
CROSS JOIN (VALUES ('Unique',35,8)) AS t(taille,stock,seuil)
WHERE reference = 'SAC-25L-001';


-- =============================================================================
-- Vérification
-- =============================================================================
SELECT
  a.reference,
  a.nom,
  a.categorie_slug,
  a.pts_cout,
  COUNT(t.id)               AS nb_tailles,
  SUM(t.stock_quantite)     AS stock_total
FROM articles a
LEFT JOIN articles_tailles t ON t.article_id = a.id
GROUP BY a.id, a.reference, a.nom, a.categorie_slug, a.pts_cout
ORDER BY a.categorie_slug, a.nom;
