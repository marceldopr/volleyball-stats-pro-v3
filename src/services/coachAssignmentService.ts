import { supabase } from '@/lib/supabaseClient'

// Legacy interface for backward compatibility
export interface CoachTeamAssignmentDB {
    id: string
    user_id: string
    team_id: string
    season_id: string
    role_in_team: string | null
    created_at: string
    updated_at: string
}

export interface CoachWithAssignments {
    id: string
    full_name: string
    email: string
    role: string
    assignments: Array<{
        id: string
        team_id: string
        team_name: string
        season_id: string
    }>
}

export const coachAssignmentService = {
    /**
     * Get all coaches with their team assignments for a specific club and season
     * Uses new coach_team_season table
     */
    getCoachesWithAssignments: async (clubId: string, seasonId: string): Promise<CoachWithAssignments[]> => {
        console.log('[getCoachesWithAssignments] Starting query with:', { clubId, seasonId })

        // 1. Get all coaches from the club
        const { data: coaches, error: coachesError } = await supabase
            .from('coaches')
            .select('id, first_name, last_name, profile_id, email')
            .eq('club_id', clubId)
            .eq('status', 'active')

        console.log('[getCoachesWithAssignments] Coaches query result:', {
            count: coaches?.length || 0,
            error: coachesError
        })

        if (coachesError) {
            console.error('[getCoachesWithAssignments] Error fetching coaches:', coachesError)
            throw coachesError
        }

        if (!coaches || coaches.length === 0) {
            console.warn('[getCoachesWithAssignments] No coaches found for club:', clubId)
            return []
        }

        // 2. Get all assignments for these coaches in the current season
        const coachIds = coaches.map(c => c.id)
        console.log('[getCoachesWithAssignments] Fetching assignments for coach IDs:', coachIds)

        const { data: assignments, error: assignmentsError } = await supabase
            .from('coach_team_season')
            .select('id, coach_id, team_id, season_id')
            .in('coach_id', coachIds)
            .eq('season_id', seasonId)

        console.log('[getCoachesWithAssignments] Assignments query result:', {
            count: assignments?.length || 0,
            error: assignmentsError
        })

        if (assignmentsError) {
            console.error('[getCoachesWithAssignments] Error fetching assignments:', assignmentsError)
        }

        // 3. Get team data
        let teamsMap: Record<string, { custom_name: string | null; category: string; gender: string }> = {}
        if (assignments && assignments.length > 0) {
            const teamIds = [...new Set(assignments.map(a => a.team_id))]

            const { data: teams, error: teamsError } = await supabase
                .from('teams')
                .select('id, custom_name, category, gender')
                .in('id', teamIds)

            if (!teamsError && teams) {
                teamsMap = teams.reduce((acc, team) => {
                    acc[team.id] = { custom_name: team.custom_name, category: team.category, gender: team.gender }
                    return acc
                }, {} as Record<string, { custom_name: string | null; category: string; gender: string }>)
            }
        }

        // 4. Combine data
        const result = coaches.map(coach => ({
            id: coach.profile_id || coach.id, // Return profile_id for compatibility with old system
            full_name: `${coach.first_name} ${coach.last_name}`,
            email: coach.email || '',
            role: 'coach',
            assignments: (assignments || [])
                .filter(a => a.coach_id === coach.id)
                .map(a => {
                    const team = teamsMap[a.team_id]
                    let teamName = 'Equipo desconocido'

                    if (team) {
                        if (team.custom_name) {
                            teamName = team.custom_name
                        } else {
                            const genderLabel = team.gender === 'male' ? 'Masculino' :
                                team.gender === 'female' ? 'Femenino' : 'Mixto'
                            teamName = team.category ? `${team.category} ${genderLabel}` : genderLabel
                        }
                    }

                    return {
                        id: a.id,
                        team_id: a.team_id,
                        team_name: teamName,
                        season_id: a.season_id
                    }
                })
        }))

        console.log('[getCoachesWithAssignments] Final result:', {
            totalCoaches: result.length,
            coachesWithAssignments: result.filter(c => c.assignments.length > 0).length
        })

        return result
    },

    /**
     * Get all teams assigned to a specific user (coach)
     * Converts user_id to coach_id internally
     */
    getAssignedTeamsByUser: async (userId: string, seasonId?: string): Promise<string[]> => {
        console.log('[coachAssignmentService] getAssignedTeamsByUser called with:', { userId, seasonId })

        // Find coach by profile_id
        const { data: coach } = await supabase
            .from('coaches')
            .select('id')
            .eq('profile_id', userId)
            .single()

        if (!coach) {
            console.warn('[coachAssignmentService] No coach found for user:', userId)
            return []
        }

        let query = supabase
            .from('coach_team_season')
            .select('team_id')
            .eq('coach_id', coach.id)

        if (seasonId) {
            query = query.eq('season_id', seasonId)
        }

        const { data, error } = await query

        if (error) {
            console.error('[coachAssignmentService] Error fetching coach assignments:', error)
            throw error
        }

        const teamIds = data?.map(assignment => assignment.team_id) || []
        console.log('[coachAssignmentService] Returning team IDs:', teamIds)
        return teamIds
    },

    /**
     * Assign a coach to a team
     * Converts user_id to coach_id internally
     */
    assignCoachToTeam: async (params: {
        user_id: string
        team_id: string
        season_id: string
        role_in_team?: string
    }): Promise<CoachTeamAssignmentDB> => {
        // Find or create coach from user_id
        const { data: coachData, error: coachError } = await supabase
            .from('coaches')
            .select('id, profile_id')
            .eq('profile_id', params.user_id)
            .single()

        let coachId: string

        if (coachError || !coachData) {
            // Coach doesn't exist, create from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, club_id')
                .eq('id', params.user_id)
                .single()

            if (!profile) {
                throw new Error('Profile not found')
            }

            const names = profile.full_name.split(' ')
            const { data: newCoach, error: createError } = await supabase
                .from('coaches')
                .insert({
                    club_id: profile.club_id,
                    profile_id: params.user_id,
                    first_name: names[0] || 'Coach',
                    last_name: names.slice(1).join(' ') || 'Sin Apellido',
                    status: 'active'
                })
                .select()
                .single()

            if (createError || !newCoach) throw createError || new Error('Failed to create coach')
            coachId = newCoach.id
        } else {
            coachId = coachData.id
        }

        // Create assignment
        const { data, error } = await supabase
            .from('coach_team_season')
            .insert({
                coach_id: coachId,
                team_id: params.team_id,
                season_id: params.season_id,
                role_in_team: params.role_in_team || 'head'
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating coach assignment:', error)
            throw error
        }

        // Return in legacy format for compatibility
        return {
            id: data.id,
            user_id: params.user_id,
            team_id: data.team_id,
            season_id: data.season_id,
            role_in_team: data.role_in_team,
            created_at: data.created_at,
            updated_at: data.created_at // coach_team_season doesn't have updated_at
        }
    },

    /**
     * Remove a coach-team assignment
     */
    removeCoachAssignment: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('coach_team_season')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting coach assignment:', error)
            throw error
        }
    },

    // Legacy method names for backward compatibility
    createAssignment: async (params: {
        user_id: string
        team_id: string
        season_id: string
        role_in_team?: string
    }): Promise<CoachTeamAssignmentDB> => {
        return coachAssignmentService.assignCoachToTeam(params)
    },

    deleteAssignment: async (id: string): Promise<void> => {
        return coachAssignmentService.removeCoachAssignment(id)
    },

    /**
     * Get the primary coach name for a team in a season
     */
    getPrimaryCoachForTeam: async (teamId: string, seasonId: string): Promise<string | null> => {
        const { data: assignment } = await supabase
            .from('coach_team_season')
            .select('coach_id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('role_in_team', 'head') // Only get head coach, not assistants
            .limit(1)
            .single()

        if (!assignment) return null

        const { data: coach } = await supabase
            .from('coaches')
            .select('first_name, last_name')
            .eq('id', assignment.coach_id)
            .single()

        if (!coach) return null

        return `${coach.first_name} ${coach.last_name}`
    },

    /**
     * Get the assistant coach name for a team in a season
     */
    getAssistantCoachForTeam: async (teamId: string, seasonId: string): Promise<string | null> => {
        const { data: assignment } = await supabase
            .from('coach_team_season')
            .select('coach_id')
            .eq('team_id', teamId)
            .eq('season_id', seasonId)
            .eq('role_in_team', 'assistant') // Only get assistant coach
            .limit(1)
            .single()

        if (!assignment) return null

        const { data: coach } = await supabase
            .from('coaches')
            .select('first_name, last_name')
            .eq('id', assignment.coach_id)
            .single()

        if (!coach) return null

        return `${coach.first_name} ${coach.last_name}`
    }
}
