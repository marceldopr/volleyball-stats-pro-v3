-- ============================================================================
-- VERIFICACIÓ: Comprovar si la neteja ha funcionat
-- ============================================================================
-- Executa aquesta query per veure l'estat actual de les posicions
-- ============================================================================

SELECT 
    first_name || ' ' || last_name as jugadora,
    main_position,
    secondary_position,
    created_at,
    updated_at,
    updated_at - created_at as temps_des_creacio
FROM club_players
ORDER BY first_name, last_name
LIMIT 30;

-- Si main_position i secondary_position són NULL → Neteja exitosa ✅
-- Si encara hi ha "Receptora" → Cal executar l'script de neteja altra vegada

-- ============================================================================
-- Si verifiques que les posicions són NULL però la UI encara mostra "Receptora":
-- ============================================================================
-- 1. Hard refresh del navegador: Ctrl + Shift + R (Windows) o Cmd + Shift + R (Mac)
-- 2. Netejar caché del navegador completament
-- 3. Tancar i reobrir el navegador
-- 4. Provar en mode incògnit
-- ============================================================================
