-- Complete fix for players table - Add missing columns from Phase 14

-- 1. Add birth_date column if it doesn't exist
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Add height_cm and weight_kg columns if they don't exist
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- 3. Set default birth_date for any NULL values (for existing players)
UPDATE public.players 
SET birth_date = '2000-01-01' 
WHERE birth_date IS NULL;

-- 4. Now make birth_date NOT NULL
ALTER TABLE public.players 
ALTER COLUMN birth_date SET NOT NULL;

-- 5. Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name IN ('birth_date', 'height_cm', 'weight_kg')
ORDER BY column_name;
