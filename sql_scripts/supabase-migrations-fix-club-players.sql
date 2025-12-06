-- Solution: Use club_players as the main players table
-- This script will add the missing columns to club_players and ensure it has the correct structure

-- 1. Add missing columns to club_players if they don't exist
ALTER TABLE public.club_players 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- 2. Set default birth_date for any NULL values (for existing players)
UPDATE public.club_players 
SET birth_date = '2000-01-01' 
WHERE birth_date IS NULL;

-- 3. Now make birth_date NOT NULL
ALTER TABLE public.club_players 
ALTER COLUMN birth_date SET NOT NULL;

-- 4. Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'club_players' 
AND column_name IN ('birth_date', 'height_cm', 'weight_kg')
ORDER BY column_name;

-- 5. Check the data
SELECT id, first_name, last_name, birth_date, height_cm, weight_kg
FROM public.club_players
LIMIT 5;
