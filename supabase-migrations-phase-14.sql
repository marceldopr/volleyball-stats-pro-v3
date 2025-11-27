-- Phase 14: Enhanced Player/Team Creation & Roster Rules

-- 1. Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    acronym TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view clubs (for now, or restrict to authenticated)
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
    FOR SELECT USING (true);

-- Policy: Only admins/directors can update clubs (simplification: authenticated for now)
CREATE POLICY "Authenticated users can update clubs" ON public.clubs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Update players table
-- Add height_cm and weight_kg
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- Update birth_date to be NOT NULL
-- First, ensure no NULL values exist (set a default dummy date for existing records if any)
UPDATE public.players SET birth_date = '2000-01-01' WHERE birth_date IS NULL;

-- Now alter the column
ALTER TABLE public.players 
ALTER COLUMN birth_date SET NOT NULL;

-- 3. Ensure teams have FK to clubs (if not already enforced)
-- The teams table already has club_id, let's ensure it references the new clubs table if possible,
-- BUT existing club_ids might not exist in the new clubs table.
-- Strategy: 
-- a) Insert a default club for existing club_ids found in teams/profiles.
-- b) Add FK constraint.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find distinct club_ids from teams that don't exist in clubs
    FOR r IN SELECT DISTINCT club_id FROM public.teams WHERE club_id IS NOT NULL
    LOOP
        -- Insert a placeholder club for this ID if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = r.club_id) THEN
            INSERT INTO public.clubs (id, name, acronym)
            VALUES (r.club_id, 'Club Default', 'DEF');
        END IF;
    END LOOP;
    
    -- Also check profiles for club_ids
    FOR r IN SELECT DISTINCT club_id FROM public.profiles WHERE club_id IS NOT NULL
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = r.club_id) THEN
            INSERT INTO public.clubs (id, name, acronym)
            VALUES (r.club_id, 'Club Default', 'DEF');
        END IF;
    END LOOP;
END $$;

-- Now add the FK constraint
ALTER TABLE public.teams
DROP CONSTRAINT IF EXISTS teams_club_id_fkey;

ALTER TABLE public.teams
ADD CONSTRAINT teams_club_id_fkey
FOREIGN KEY (club_id) REFERENCES public.clubs(id);

-- Also for profiles if needed
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_club_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_club_id_fkey
FOREIGN KEY (club_id) REFERENCES public.clubs(id);
