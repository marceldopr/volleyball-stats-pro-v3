-- Fix RLS policies for clubs table to allow INSERT and UPDATE

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can update clubs" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can insert clubs" ON public.clubs;

-- Recreate policies with proper permissions
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert clubs" ON public.clubs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clubs" ON public.clubs
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
