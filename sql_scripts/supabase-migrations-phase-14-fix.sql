-- Fix for Phase 14: Allow INSERT on clubs table for upsert functionality
-- This is needed because updateClubName might need to create the club row if it doesn't exist.

CREATE POLICY "Authenticated users can insert clubs" ON public.clubs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Also ensure the update policy is broad enough (it was created in previous migration, but let's be safe)
-- The previous policy was: FOR UPDATE USING (auth.role() = 'authenticated');
-- That should be fine for updating existing rows.
