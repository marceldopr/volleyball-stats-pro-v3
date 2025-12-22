// =====================================================
// COACH TYPES
// =====================================================
// TypeScript interfaces for coach management system

export interface CoachDB {
    id: string
    club_id: string
    profile_id: string | null
    first_name: string
    last_name: string
    status: 'active' | 'inactive'
    photo_url: string | null
    phone: string | null
    email: string | null
    notes_internal: string | null
    created_at: string
    updated_at: string
}

export interface CoachTeamSeasonDB {
    id: string
    coach_id: string
    team_id: string
    season_id: string
    role_in_team: 'head' | 'assistant' | 'pf' | 'other'
    start_date: string | null  // alias for date_from
    end_date: string | null    // alias for date_to
    date_from: string | null
    date_to: string | null
    created_at: string
}

// Extended coach with team information
export interface CoachWithTeams extends CoachDB {
    current_teams: Array<{
        id: string
        team_id: string
        team_name: string
        role_in_team: string
    }>
}

// For creating a new coach
export interface CreateCoachParams {
    club_id: string
    profile_id?: string | null
    first_name: string
    last_name: string
    status?: 'active' | 'inactive'
    photo_url?: string | null
    phone?: string | null
    email?: string | null
    notes_internal?: string | null
}

// For updating an existing coach
export interface UpdateCoachParams {
    first_name?: string
    last_name?: string
    status?: 'active' | 'inactive'
    photo_url?: string | null
    phone?: string | null
    email?: string | null
    notes_internal?: string | null
}

// For coach-team-season assignment
export interface CreateCoachTeamSeasonParams {
    coach_id: string
    team_id: string
    season_id: string
    role_in_team?: 'head' | 'assistant' | 'pf' | 'other'
    start_date?: string | null
    end_date?: string | null
    date_from?: string | null
    date_to?: string | null
}

// Coach history by season
export interface CoachSeasonHistory {
    season_id: string
    season_name: string
    teams: Array<{
        team_id: string
        team_name: string
        role_in_team: string
        date_from: string | null
        date_to: string | null
    }>
}
