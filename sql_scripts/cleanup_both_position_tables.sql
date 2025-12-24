-- ============================================================================
-- NETEJA COMPLETA DE POSICIONS AUTOMÀTIQUES
-- ============================================================================
-- Aquest script neteja les posicions automàtiques de DUES taules:
-- 1. club_players.main_position (Base de Datos de Jugadoras)
-- 2. player_team_season.position (Equips > Plantilla)
-- ============================================================================

-- ============================================================================
-- PART 1: NETEJAR player_team_season (EQUIPS > PLANTILLA)
-- ============================================================================

-- 1.1. Veure quantes tenen OH a player_team_season
SELECT 
    'Total OH a player_team_season' as descripcio,
    COUNT(*) as total
FROM player_team_season
WHERE position = 'OH';

-- 1.2. Veure detall amb més info
SELECT 
    pts.id,
    p.first_name || ' ' || p.last_name as jugadora,
    t.custom_name as equip,
    pts.position,
    pts.created_at,
    pts.updated_at,
    CASE 
        WHEN pts.updated_at IS NULL THEN 'Mai actualitzat'
        WHEN pts.updated_at - pts.created_at < INTERVAL '30 seconds' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as origen_estimat
FROM player_team_season pts
JOIN club_players p ON pts.player_id = p.id
LEFT JOIN teams t ON pts.team_id = t.id
WHERE pts.position = 'OH'
ORDER BY pts.updated_at - pts.created_at DESC NULLS FIRST
LIMIT 20;

-- 1.3. Comptar automàtiques vs manuals
SELECT 
    CASE 
        WHEN pts.updated_at IS NULL THEN 'Mai actualitzat'
        WHEN pts.updated_at - pts.created_at < INTERVAL '30 seconds' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END as tipus,
    COUNT(*) as total
FROM player_team_season pts
WHERE pts.position = 'OH'
GROUP BY 
    CASE 
        WHEN pts.updated_at IS NULL THEN 'Mai actualitzat'
        WHEN pts.updated_at - pts.created_at <INTERVAL '30 seconds' THEN 'Import automàtic'
        ELSE 'Modificat manualment'
    END;

-- ============================================================================
-- PART 2: EXECUTAR NETEJA DE player_team_season
-- ============================================================================

-- 2.1. BACKUP (opcional)
CREATE TEMP TABLE IF NOT EXISTS backup_pts_cleanup AS
SELECT *
FROM player_team_season
WHERE position = 'OH';

SELECT 'Backup player_team_season:', COUNT(*) FROM backup_pts_cleanup;

-- 2.2. PREVIEW
SELECT 
    p.first_name || ' ' || p.last_name as jugadora,
    t.custom_name as equip,
    pts.position as abans,
    'NULL' as despres
FROM player_team_season pts
JOIN club_players p ON pts.player_id = p.id
LEFT JOIN teams t ON pts.team_id = t.id
WHERE pts.position = 'OH'
  AND (pts.updated_at IS NULL 
       OR pts.updated_at - pts.created_at < INTERVAL '30 seconds')
ORDER BY t.custom_name, p.first_name;

-- 2.3. NETEJAR player_team_season (descomenta per executar)
/*
UPDATE player_team_season
SET 
    position = NULL,
    updated_at = NOW()
WHERE position = 'OH'
  AND (updated_at IS NULL 
       OR updated_at - created_at < INTERVAL '30 seconds');
*/

-- ============================================================================
-- PART 3: VERIFICACIÓ FINAL
-- ============================================================================

-- 3.1. Comprovar club_players
SELECT 
    'club_players amb OH' as taula,
    COUNT(*) as total
FROM club_players
WHERE main_position = 'OH';

-- 3.2. Comprovar player_team_season
SELECT 
    'player_team_season amb OH' as taula,
    COUNT(*) as total
FROM player_team_season
WHERE position = 'OH';

-- 3.3. Veure jugadores sense posició ara
SELECT 
    p.first_name || ' ' || p.last_name as jugadora,
    t.custom_name as equip,
    pts.position as posicio_equip,
    p.main_position as posicio_global
FROM player_team_season pts
JOIN club_players p ON pts.player_id = p.id
LEFT JOIN teams t ON pts.team_id = t.id
WHERE pts.position IS NULL
ORDER BY t.custom_name, p.first_name
LIMIT 30;

-- ============================================================================
-- NOTES IMPORTANTS
-- ============================================================================
-- Hi ha 2 llocs on es guarden posicions:
-- 1. club_players.main_position → General (Base de Datos)
-- 2. player_team_season.position → Per equip/temporada (Plantilla)
--
-- Normalment vols netejar LES DUES!
-- ============================================================================
