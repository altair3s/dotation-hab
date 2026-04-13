-- =============================================================================
-- SEED PHOTOS — DotaGroupe / Alyzia
-- Images via loremflickr.com (photos Flickr réelles, lock = image fixe)
-- Coller dans Supabase → SQL Editor et exécuter
-- =============================================================================

-- ── Hauts ─────────────────────────────────────────────────────────────────────

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/polo,shirt/all?lock=11']
WHERE reference = 'POLO-MC-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/tshirt,workwear/all?lock=22']
WHERE reference = 'TSH-CR-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/shirt,button,office/all?lock=33']
WHERE reference = 'CHE-ML-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/polo,zip,fleece/all?lock=44']
WHERE reference = 'POLO-TH-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/hoodie,sweatshirt/all?lock=55']
WHERE reference = 'SWE-HZ-001';

-- ── Bas ───────────────────────────────────────────────────────────────────────

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/cargo,pants,work/all?lock=66']
WHERE reference = 'PANT-MP-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/trousers,women,work/all?lock=77']
WHERE reference = 'PANT-FEM-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/shorts,work/all?lock=88']
WHERE reference = 'SHORT-STR-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/winter,trousers,insulated/all?lock=99']
WHERE reference = 'PANT-POL-001';

-- ── Chaussures ────────────────────────────────────────────────────────────────

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/safety,shoes,work/all?lock=101']
WHERE reference = 'CSS-S1P-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/work,boots,construction/all?lock=112']
WHERE reference = 'CSS-S3H-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/sneakers,safety/all?lock=123']
WHERE reference = 'SNK-S1-001';

-- ── EPI ───────────────────────────────────────────────────────────────────────

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/safety,vest,yellow/all?lock=134']
WHERE reference = 'GIL-HV-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/work,gloves,protection/all?lock=145']
WHERE reference = 'GNT-ACD-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/safety,glasses,protection/all?lock=156']
WHERE reference = 'LUN-PAN-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/helmet,construction,hard-hat/all?lock=167']
WHERE reference = 'CAS-CH-001';

-- ── Vêtements de dessus ───────────────────────────────────────────────────────

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/softshell,jacket,outdoor/all?lock=178']
WHERE reference = 'VSH-3C-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/parka,winter,jacket/all?lock=189']
WHERE reference = 'PRK-HIV-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/windbreaker,jacket,light/all?lock=191']
WHERE reference = 'VCP-LEG-001';

-- ── Accessoires ───────────────────────────────────────────────────────────────

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/cap,baseball,hat/all?lock=202']
WHERE reference = 'CAQ-VIS-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/beanie,winter,hat/all?lock=213']
WHERE reference = 'BON-ACR-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/belt,nylon,buckle/all?lock=224']
WHERE reference = 'CEI-NYL-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/socks,cotton/all?lock=235']
WHERE reference = 'CHS-AT-001';

UPDATE articles SET photos = ARRAY['https://loremflickr.com/600/400/backpack,bag,laptop/all?lock=246']
WHERE reference = 'SAC-25L-001';

-- =============================================================================
-- Vérification
-- =============================================================================
SELECT reference, nom, array_length(photos, 1) AS nb_photos
FROM articles
ORDER BY categorie_slug, nom;
