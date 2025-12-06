-- Fix for existing players with NULL birth_date
-- This updates all players that have NULL birth_date to a default date

-- Option 1: Set a default date for all NULL birth_dates
-- Using 2000-01-01 as a placeholder (same as in the original migration)
UPDATE public.players 
SET birth_date = '2000-01-01' 
WHERE birth_date IS NULL;

-- Option 2 (Alternative): If you prefer a different default date
-- Uncomment the line below and comment the one above
-- UPDATE public.players SET birth_date = '1990-01-01' WHERE birth_date IS NULL;

-- Verify the update
SELECT id, first_name, last_name, birth_date 
FROM public.players 
WHERE birth_date = '2000-01-01';
