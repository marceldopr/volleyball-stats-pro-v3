-- ========================================
-- FASE 13: ESTRUCTURA DE CLUB Y REGLAS DE PLANTILLA
-- ========================================

-- 1. Modificar tabla TEAMS
-- Añadir campos: category_stage, division_name, team_suffix, gender

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS category_stage TEXT NOT NULL DEFAULT 'Sénior',
ADD COLUMN IF NOT EXISTS division_name TEXT,
ADD COLUMN IF NOT EXISTS team_suffix TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'female';

-- 1.1 Normalizar valores existentes de gender (Asegurar Inglés)
-- Normalizar cualquier valor español que pudiera haberse colado
UPDATE teams SET gender = 'female' WHERE gender ILIKE 'Femenino';
UPDATE teams SET gender = 'male' WHERE gender ILIKE 'Masculino';
UPDATE teams SET gender = 'mixed' WHERE gender ILIKE 'Mixto';

-- Asegurar casing correcto (minúsculas)
UPDATE teams SET gender = LOWER(gender);

-- Añadir constraint para category_stage
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_category_stage_check;
ALTER TABLE teams ADD CONSTRAINT teams_category_stage_check 
CHECK (category_stage IN ('Benjamín', 'Alevín', 'Infantil', 'Cadete', 'Juvenil', 'Júnior', 'Sénior'));

-- Añadir constraint para gender en teams (USANDO INGLÉS)
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_gender_check;
ALTER TABLE teams ADD CONSTRAINT teams_gender_check 
CHECK (gender IN ('female', 'male', 'mixed'));


-- 2. Modificar tabla PLAYERS (club_players)
-- Añadir campo: gender

ALTER TABLE club_players 
ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'female';

-- Normalizar valores existentes en players
UPDATE club_players SET gender = 'female' WHERE gender ILIKE 'Femenino';
UPDATE club_players SET gender = 'male' WHERE gender ILIKE 'Masculino';
UPDATE club_players SET gender = LOWER(gender);

-- Añadir constraint para gender en players (USANDO INGLÉS)
ALTER TABLE club_players DROP CONSTRAINT IF EXISTS club_players_gender_check;
ALTER TABLE club_players ADD CONSTRAINT club_players_gender_check 
CHECK (gender IN ('female', 'male'));


-- 3. Modificar tabla SEASONS
-- Añadir campo: reference_date

ALTER TABLE seasons 
ADD COLUMN IF NOT EXISTS reference_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Actualizar reference_date para temporadas existentes (ejemplo genérico, el usuario deberá ajustar)
-- Por defecto ponemos 30 de junio del año de fin de temporada si es posible, o fecha actual
UPDATE seasons SET reference_date = '2025-06-30' WHERE reference_date = CURRENT_DATE;

-- ========================================
-- VERIFICACIÓN
-- ========================================
/*
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teams';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'club_players';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seasons';
*/
