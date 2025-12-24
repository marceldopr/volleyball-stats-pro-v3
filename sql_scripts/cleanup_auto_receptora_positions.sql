-- ============================================================================
-- NETEJA DE POSICIONS "RECEPTORA" AUTOMÀTIQUES
-- ============================================================================
-- Data: 2024-12-24
-- Objectiu: Eliminar assignacions automàtiques de "Receptora" mantenint
--           les modificacions manuals fetes per l'usuari
-- ============================================================================

-- IMPORTANT: Executar pas a pas, revisar resultats abans de continuar
-- ============================================================================

-- ============================================================================
-- PAS 1: VERIFICACIÓ PRÈVIA (NOMÉS LECTURA)
-- ============================================================================

-- 1.1. Comptar total de jugadores amb "Receptora"
SELECT 
    'Total amb Receptora' as descripcio,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora';

-- 1.2. Veure detall de jugadores afectades
SELECT 
    id,
    first_name || ' ' || last_name as nom_complet,
    main_position,
    secondary_position,
    created_at,
    updated_at,
    CASE 
        WHEN updated_at IS NULL THEN 'Mai actualitzat'
        WHEN updated_at - created_at < INTERVAL '1 minute' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as origen_estimat
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora'
ORDER BY updated_at - created_at DESC NULLS FIRST;

-- 1.3. Comptar quantes són automàtiques vs manuals
SELECT 
    CASE 
        WHEN updated_at IS NULL THEN 'Mai actualitzat'
        WHEN updated_at - created_at < INTERVAL '1 minute' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as tipus,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora'
GROUP BY 
    CASE 
        WHEN updated_at IS NULL THEN 'Mai actualitzat'
        WHEN updated_at - created_at < INTERVAL '1 minute' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END
ORDER BY total DESC;

-- ============================================================================
-- PAS 2: BACKUP DE SEGURETAT
-- ============================================================================

-- 2.1. Crear taula temporal amb backup
CREATE TEMP TABLE IF NOT EXISTS backup_receptora_cleanup AS
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
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora';

-- 2.2. Verificar backup creat
SELECT 
    'Backup creat' as status,
    COUNT(*) as jugadores_guardades
FROM backup_receptora_cleanup;

-- ============================================================================
-- PAS 3: NETEJA - OPCIÓ A (CONSERVADORA)
-- ============================================================================
-- Aquesta opció NOMÉS elimina les posicions que clarament són automàtiques
-- (creades i mai modificades, o modificades en menys d'1 minut)
-- ============================================================================

-- 3A.1. PREVIEW: Veure què s'eliminarà
SELECT 
    id,
    first_name || ' ' || last_name as nom_complet,
    main_position as main_pos_actual,
    secondary_position as secondary_pos_actual,
    'NULL' as main_pos_despres,
    'NULL' as secondary_pos_despres,
    updated_at - created_at as temps_modificacio
FROM club_players 
WHERE (main_position = 'Receptora' OR secondary_position = 'Receptora')
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '1 minute')
ORDER BY first_name, last_name;

-- 3A.2. Comptar quantes s'afectaran
SELECT 
    'Jugadores que es netejaran (Opció A)' as descripcio,
    COUNT(*) as total
FROM club_players 
WHERE (main_position = 'Receptora' OR secondary_position = 'Receptora')
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '1 minute');

-- 3A.3. EXECUTAR NETEJA (descomenta per executar)
/*
UPDATE club_players
SET 
    main_position = NULL,
    secondary_position = NULL,
    updated_at = NOW()
WHERE (main_position = 'Receptora' OR secondary_position = 'Receptora')
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '1 minute');
*/

-- ============================================================================
-- PAS 3: NETEJA - OPCIÓ B (AGRESSIVA)
-- ============================================================================
-- Aquesta opció elimina TOTES les posicions "Receptora"
-- ⚠️ NOMÉS usar si estàs 100% segur que totes són automàtiques
-- ============================================================================

-- 3B.1. PREVIEW: Veure què s'eliminarà
SELECT 
    id,
    first_name || ' ' || last_name as nom_complet,
    main_position as main_pos_actual,
    secondary_position as secondary_pos_actual,
    'NULL' as main_pos_despres,
    'NULL' as secondary_pos_despres
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora'
ORDER BY first_name, last_name;

-- 3B.2. Comptar quantes s'afectaran
SELECT 
    'Jugadores que es netejaran (Opció B - TOTES)' as descripcio,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora';

-- 3B.3. EXECUTAR NETEJA TOTAL (descomenta per executar)
/*
UPDATE club_players
SET 
    main_position = NULL,
    secondary_position = NULL,
    updated_at = NOW()
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora';
*/

-- ============================================================================
-- PAS 4: NETEJA TAMBÉ A PLAYER_TEAM_SEASON (si cal)
-- ============================================================================
-- Aquesta taula guarda les posicions per equip/temporada
-- ============================================================================

-- 4.1. Verificar si hi ha "Receptora" a player_team_season
SELECT 
    'Receptora a player_team_season' as taula,
    COUNT(*) as total
FROM player_team_season 
WHERE position = 'Receptora';

-- 4.2. Veure detall
SELECT 
    pts.id,
    p.first_name || ' ' || p.last_name as jugadora,
    t.custom_name as equip,
    pts.position,
    pts.created_at,
    pts.updated_at,
    CASE 
        WHEN pts.updated_at IS NULL THEN 'Mai actualitzat'
        WHEN pts.updated_at - pts.created_at < INTERVAL '1 minute' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as origen_estimat
FROM player_team_season pts
JOIN club_players p ON pts.player_id = p.id
LEFT JOIN teams t ON pts.team_id = t.id
WHERE pts.position = 'Receptora'
ORDER BY pts.updated_at - pts.created_at DESC NULLS FIRST;

-- 4.3. EXECUTAR NETEJA player_team_season (descomenta per executar)
/*
UPDATE player_team_season
SET 
    position = NULL,
    updated_at = NOW()
WHERE position = 'Receptora'
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '1 minute');
*/

-- ============================================================================
-- PAS 5: VERIFICACIÓ POST-NETEJA
-- ============================================================================

-- 5.1. Comptar quantes queden amb "Receptora"
SELECT 
    'Receptora restants després de neteja' as descripcio,
    COUNT(*) as total
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora';

-- 5.2. Veure quines han quedat (haurien de ser les modificades manualment)
SELECT 
    id,
    first_name || ' ' || last_name as nom_complet,
    main_position,
    secondary_position,
    updated_at - created_at as temps_modificacio,
    'MANTINGUDA: Probablement modificació manual' as motiu
FROM club_players 
WHERE main_position = 'Receptora' 
   OR secondary_position = 'Receptora'
ORDER BY updated_at DESC;

-- ============================================================================
-- PAS 6: RESTAURAR BACKUP (només si cal desfer canvis)
-- ============================================================================

-- 6.1. NOMÉS executar si vols desfer tots els canvis
-- ⚠️ Això restaurarà TOTES les posicions al seu estat original
/*
UPDATE club_players cp
SET 
    main_position = b.main_position,
    secondary_position = b.secondary_position,
    updated_at = NOW()
FROM backup_receptora_cleanup b
WHERE cp.id = b.id;
*/

-- 6.2. Eliminar taula temporal de backup
/*
DROP TABLE IF EXISTS backup_receptora_cleanup;
*/

-- ============================================================================
-- INSTRUCCIONS D'ÚS
-- ============================================================================
/*
1. Executa PAS 1 (queries de verificació) per veure l'estat actual
2. Executa PAS 2 per crear backup de seguretat
3. Revisa els resultats del PREVIEW de l'opció que vulguis (3A o 3B)
4. Descomenta i executa UNA de les opcions (3A conservadora o 3B agressiva)
5. Si cal, executa PAS 4 per netejar també player_team_season
6. Executa PAS 5 per verificar resultats
7. Si cal desfer, usa PAS 6 per restaurar backup

RECOMANACIÓ: Començar amb Opció A (conservadora)
*/
