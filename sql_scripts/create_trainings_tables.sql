-- Create trainings table
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    title TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create training_attendance table
CREATE TABLE IF NOT EXISTS public.training_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.club_players(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'justified')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(training_id, player_id)
);

-- Enable RLS
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for trainings
-- Coaches can view trainings for teams they are assigned to
CREATE POLICY "Coaches can view trainings for their teams" ON public.trainings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_team_assignments ca
            WHERE ca.team_id = trainings.team_id
            AND ca.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'dt' OR p.role = 'admin')
        )
    );

-- Coaches can insert trainings for their teams
CREATE POLICY "Coaches can create trainings for their teams" ON public.trainings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coach_team_assignments ca
            WHERE ca.team_id = trainings.team_id
            AND ca.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.role = 'dt' OR p.role = 'admin')
        )
    );

-- Update and Delete policies (similar logic)
CREATE POLICY "Coaches can update their team trainings" ON public.trainings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_team_assignments ca
            WHERE ca.team_id = trainings.team_id
            AND ca.user_id = auth.uid()
        ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('dt', 'admin'))
    );

CREATE POLICY "Coaches can delete their team trainings" ON public.trainings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_team_assignments ca
            WHERE ca.team_id = trainings.team_id
            AND ca.user_id = auth.uid()
        ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('dt', 'admin'))
    );


-- Policies for training_attendance
-- Inherit access from training
CREATE POLICY "View attendance based on training access" ON public.training_attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.trainings t
            WHERE t.id = training_attendance.training_id
            AND (
                EXISTS (
                    SELECT 1 FROM public.coach_team_assignments ca
                    WHERE ca.team_id = t.team_id
                    AND ca.user_id = auth.uid()
                ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('dt', 'admin'))
            )
        )
    );

CREATE POLICY "Manage attendance based on training access" ON public.training_attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.trainings t
            WHERE t.id = training_attendance.training_id
            AND (
                EXISTS (
                    SELECT 1 FROM public.coach_team_assignments ca
                    WHERE ca.team_id = t.team_id
                    AND ca.user_id = auth.uid()
                ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('dt', 'admin'))
            )
        )
    );
