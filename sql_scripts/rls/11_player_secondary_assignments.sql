-- Create player_secondary_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.player_secondary_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.club_players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    jersey_number TEXT,
    valid_from DATE,
    valid_to DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: A player can only be doubled to a specific team once per season
    CONSTRAINT uq_secondary_assignment UNIQUE (player_id, team_id, season_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_secondary_assignments_team_season ON public.player_secondary_assignments(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_secondary_assignments_player_season ON public.player_secondary_assignments(player_id, season_id);

-- Enable RLS
ALTER TABLE public.player_secondary_assignments ENABLE ROW LEVEL SECURITY;

-- Helper logic for checking role directly since functions might not exist
-- Pattern: (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')

-- Policies

-- 1. SELECT: Authenticated users from the same club can view
DROP POLICY IF EXISTS "Users can view secondary assignments from their club" ON public.player_secondary_assignments;
CREATE POLICY "Users can view secondary assignments from their club"
ON public.player_secondary_assignments FOR SELECT
TO authenticated
USING (
    club_id = public.get_user_club_id()
);

-- 2. INSERT: Only DT and Owners can create secondary assignments
DROP POLICY IF EXISTS "DT and Owners can insert secondary assignments" ON public.player_secondary_assignments;
CREATE POLICY "DT and Owners can insert secondary assignments"
ON public.player_secondary_assignments FOR INSERT
TO authenticated
WITH CHECK (
    club_id = public.get_user_club_id()
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
    )
);

-- 3. UPDATE: Only DT and Owners can update
DROP POLICY IF EXISTS "DT and Owners can update secondary assignments" ON public.player_secondary_assignments;
CREATE POLICY "DT and Owners can update secondary assignments"
ON public.player_secondary_assignments FOR UPDATE
TO authenticated
USING (
    club_id = public.get_user_club_id()
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
    )
)
WITH CHECK (
    club_id = public.get_user_club_id()
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
    )
);

-- 4. DELETE: Only DT and Owners can delete
DROP POLICY IF EXISTS "DT and Owners can delete secondary assignments" ON public.player_secondary_assignments;
CREATE POLICY "DT and Owners can delete secondary assignments"
ON public.player_secondary_assignments FOR DELETE
TO authenticated
USING (
    club_id = public.get_user_club_id()
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('dt', 'owner')
    )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_player_secondary_assignments_modtime ON public.player_secondary_assignments;
CREATE TRIGGER update_player_secondary_assignments_modtime
    BEFORE UPDATE ON public.player_secondary_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
