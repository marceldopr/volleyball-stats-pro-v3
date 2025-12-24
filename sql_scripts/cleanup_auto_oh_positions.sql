-- ============================================================================
-- NETEJA DE POSICIONS "OH" AUTOMÀTIQUES (Receptora)
-- ============================================================================
-- Data: 2024-12-24
-- Objectiu: Eliminar assignacions automàtiques de "OH" (Receptora) mantenint
--           les modificacions manuals fetes per l'usuari
-- ============================================================================

-- IMPORTANT: OH = Receptora (Outside Hitter) en codi intern
-- ============================================================================

-- ============================================================================
-- PAS 1: VERIFICACIÓ PRÈVIA
-- ============================================================================

-- 1.1. Comptar jugadores amb OH
SELECT 
    'Total amb OH (Receptora)' as descripcio,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'OH';

-- 1.2. Veure detall de jugadores amb OH
SELECT 
    first_name || ' ' || last_name as nom_complet,
    main_position,
    secondary_position,
    created_at,
    updated_at,
    CASE 
        WHEN updated_at IS NULL THEN 'Mai actualitzat'
        WHEN updated_at - created_at < INTERVAL '30 seconds' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as origen_estimat,
    updated_at - created_at as temps_modificacio
FROM club_players 
WHERE main_position = 'OH'
ORDER BY updated_at - created_at DESC NULLS FIRST
LIMIT 30;

-- 1.3. Comptar automàtiques vs manuals
SELECT 
    CASE 
        WHEN updated_at IS NULL THEN 'Mai actualitzat'
        WHEN updated_at - created_at < INTERVAL '30 seconds' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as tipus,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'OH'
GROUP BY 
    CASE 
        WHEN updated_at IS NULL THEN 'Mai actualitzat'
        WHEN updated_at - created_at < INTERVAL '30 seconds' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END;

-- ============================================================================
-- PAS 2: BACKUP
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS backup_oh_cleanup AS
SELECT 
    id,
    first_name,
    last_name,
    main_position,
    secondary_position,
    created_at,
    updated_at,
    NOW() as backup_timestamp
FROM club_players 
WHERE main_position = 'OH';

SELECT 'Backup creat:', COUNT(*) FROM backup_oh_cleanup;

-- ============================================================================
-- PAS 3: NETEJA CONSERVADORA (RECOMANAT)
-- ============================================================================
-- Només elimina OH si updated_at ≈ created_at (< 30 segons)
-- ============================================================================

-- 3.1. PREVIEW
SELECT 
    first_name || ' ' || last_name as nom_complet,
    main_position as abans,
    'NULL' as despres,
    updated_at - created_at as temps_modificacio
FROM club_players 
WHERE main_position = 'OH'
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '30 seconds')
ORDER BY first_name;

-- 3.2. Count
SELECT 
    'Jugadores a netejar (automàtiques)' as descripcio,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'OH'
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '30 seconds');

-- 3.3. EXECUTAR (descomenta per aplicar)
/*
UPDATE club_players
SET 
    main_position = NULL,
    secondary_position = NULL,
    updated_at = NOW()
WHERE main_position = 'OH'
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '30 seconds');
*/

-- ============================================================================
-- PAS 4: VERIFICACIÓ POST-NETEJA
-- ============================================================================

-- 4.1. Jugadores amb OH restants (modificades manualment)
SELECT 
    first_name || ' ' || last_name as nom_complet,
    main_position,
    updated_at - created_at as temps_modificacio,
    'MANTINGUDA: Probablement modificació manual' as motiu
FROM club_players 
WHERE main_position = 'OH'
ORDER BY updated_at DESC;

-- 4.2. Jugadores sense posició ara
SELECT 
    COUNT(*) as jugadores_sense_posicio
FROM club_players 
WHERE main_position IS NULL;

-- ============================================================================
-- PAS 5: RESTAURAR BACKUP (si cal)
-- ============================================================================
/*
UPDATE club_players cp
SET 
    main_position = b.main_position,
    secondary_position = b.secondary_position,
    updated_at = NOW()
FROM backup_oh_cleanup b
WHERE cp.id = b.id;

DROP TABLE IF EXISTS backup_oh_cleanup;
*/

-- ============================================================================
-- NOTES IMPORTANTS
-- ============================================================================
-- OH = Outside Hitter (Receptora) en el sistema
-- S = Setter (Colocadora)
-- MB = Middle Blocker (Central)
-- OPP = Opposite (Opuesta)
-- L = Libero (Líbero)
-- ============================================================================
