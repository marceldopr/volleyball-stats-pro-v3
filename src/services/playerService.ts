import { supabase } from '@/lib/supabaseClient'

export interface PlayerDB {
    id: string
    club_id: string
    first_name: string
    last_name: string
    gender: 'female' | 'male'
    birth_date: string
    main_position: 'S' | 'OH' | 'MB' | 'OPP' | 'L' | string
    secondary_position: string | null
    dominant_hand: 'left' | 'right' | null
    height_cm?: number | null
    weight_kg?: number | null
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export const playerService = {
    getPlayersByClub: async (clubId: string): Promise<PlayerDB[]> => {
        const { data, error } = await supabase
            .from('club_players')
            .select('*')
            .eq('club_id', clubId)
            .order('first_name', { ascending: true })

        if (error) throw error
        return data
    },

    createPlayer: async (player: Omit<PlayerDB, 'id' | 'created_at' | 'updated_at'>): Promise<PlayerDB> => {
        const { data, error } = await supabase
            .from('club_players')
            .insert(player)
            .select()
            .single()

        if (error) throw error
        return data
    },

    updatePlayer: async (id: string, player: Partial<PlayerDB>): Promise<PlayerDB> => {
        const { data, error } = await supabase
            .from('club_players')
            .update(player)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    deletePlayer: async (id: string): Promise<void> => {
        // First try standard delete
        const { error } = await supabase
            .from('club_players')
            .delete()
            .eq('id', id)

        if (error) {
            // If foreign key violation, we might need a force delete
            if (error.code === '23503') {
                console.error('Foreign key violation. Use forceDeletePlayer instead.')
                throw new Error('REFERENCED_DATA')
            }
            throw error
        }
    },

    forceDeletePlayer: async (id: string): Promise<void> => {
        // 1. Delete reports
        const { error: reportsError } = await supabase
            .from('reports')
            .delete()
            .eq('player_id', id)

        if (reportsError) console.error('Error deleting reports:', reportsError)

        // 2. Delete team assignments (player_team_season)
        const { error: teamError } = await supabase
            .from('player_team_season')
            .delete()
            .eq('player_id', id)

        if (teamError) console.error('Error deleting team assignments:', teamError)

        // 3. Delete match stats
        const { error: statsError } = await supabase
            .from('match_player_set_stats')
            .delete()
            .eq('player_id', id)

        if (statsError) console.error('Error deleting match stats:', statsError)

        // 4. Delete training attendance
        const { error: attendanceError } = await supabase
            .from('training_attendance')
            .delete()
            .eq('player_id', id)

        if (attendanceError) console.error('Error deleting attendance:', attendanceError)

        // 5. Delete player evaluation scores (Flux B) - inferred table name
        const { error: scoresError } = await supabase
            .from('player_evaluation_scores')
            .delete()
            .eq('player_id', id)

        if (scoresError) {
            // Ignore if table doesn't exist or other error, just log
            console.log('Error deleting evaluation scores (might not exist):', scoresError)
        }

        // 6. Delete player evaluations (Flux B) - inferred table name
        const { error: evalError } = await supabase
            .from('player_evaluations')
            .delete()
            .eq('player_id', id)

        if (evalError) {
            // Ignore if table doesn't exist
            console.log('Error deleting evaluations (might not exist):', evalError)
        }

        // finally delete player
        const { error } = await supabase
            .from('club_players')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    getPlayersWithTeam: async (clubId: string, seasonId: string | null): Promise<(PlayerDB & { team?: { id: string, name: string, category: string, gender: string } })[]> => {
        // 1. Get all players
        const { data: players, error: playersError } = await supabase
            .from('club_players')
            .select('*')
            .eq('club_id', clubId)
            .order('first_name', { ascending: true })

        if (playersError) throw playersError

        if (!seasonId || players.length === 0) {
            return players
        }

        try {
            // 2. Get assignments for the active season
            const { data: assignments, error: assignmentsError } = await supabase
                .from('player_team_season')
                .select(`
                    player_id,
                    teams (
                        id,
                        custom_name,
                        category,
                        gender
                    )
                `)
                .eq('season_id', seasonId)

            if (assignmentsError) {
                console.error('Error fetching team assignments:', assignmentsError)
                return players // Return players without team info if this fails
            }

            // 3. Map assignments to players
            const assignmentMap = new Map()
            assignments?.forEach((a: any) => {
                if (a.teams) {
                    // Normalize the team object to have a 'name' property
                    const team = a.teams
                    const displayName = team.custom_name || `${team.category} ${team.gender === 'female' ? 'Femenino' : team.gender === 'male' ? 'Masculino' : 'Mixto'}`

                    assignmentMap.set(a.player_id, {
                        ...team,
                        name: displayName
                    })
                }
            })

            return players.map(p => ({
                ...p,
                team: assignmentMap.get(p.id)
            }))
        } catch (error) {
            console.error('Unexpected error fetching assignments:', error)
            return players // Fallback: return players even if assignments fail
        }
    }
}
