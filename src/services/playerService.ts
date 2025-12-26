import { supabase } from '@/lib/supabaseClient'
import { auditService } from './auditService'

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
    deleted_at?: string | null  // Soft delete timestamp
}

export const playerService = {
    getPlayersByClub: async (clubId: string): Promise<PlayerDB[]> => {
        const { data, error } = await supabase
            .from('club_players')
            .select('*')
            .eq('club_id', clubId)
            .is('deleted_at', null)  // Filter out soft-deleted
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
        // Fetch player data for audit log before soft delete
        const { data: player } = await supabase
            .from('club_players')
            .select('*')
            .eq('id', id)
            .single()

        // Log to audit before deletion
        if (player) {
            await auditService.logDeletion({
                actionType: 'DELETE',
                entityType: 'player',
                entityId: id,
                entityName: `${player.first_name} ${player.last_name}`,
                clubId: player.club_id,
                entitySnapshot: player
            })
        }

        // SOFT DELETE: Set deleted_at instead of actually deleting
        const { error } = await supabase
            .from('club_players')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('Error soft deleting player:', error)
            throw error
        }
    },

    /**
     * Restore a soft-deleted player
     */
    restorePlayer: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('club_players')
            .update({ deleted_at: null })
            .eq('id', id)

        if (error) {
            console.error('Error restoring player:', error)
            throw error
        }
    },

    /**
     * Get soft-deleted players for restoration UI
     */
    getDeletedPlayers: async (clubId: string): Promise<PlayerDB[]> => {
        const { data, error } = await supabase
            .from('club_players')
            .select('*')
            .eq('club_id', clubId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    forceDeletePlayer: async (id: string): Promise<void> => {
        // Fetch player data for audit log before deletion
        const { data: player } = await supabase
            .from('club_players')
            .select('*')
            .eq('id', id)
            .single()

        // Log to audit before force deletion
        if (player) {
            await auditService.logDeletion({
                actionType: 'DELETE',
                entityType: 'player',
                entityId: id,
                entityName: `${player.first_name} ${player.last_name}`,
                clubId: player.club_id,
                entitySnapshot: { ...player, force_delete: true }
            })
        }

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

        // 5. Delete player evaluation scores
        const { error: scoresError } = await supabase
            .from('player_evaluation_scores')
            .delete()
            .eq('player_id', id)

        if (scoresError) {
            // Ignore if table doesn't exist
        }

        // 6. Delete player evaluations
        const { error: evalError } = await supabase
            .from('player_evaluations')
            .delete()
            .eq('player_id', id)

        if (evalError) {
            // Ignore if table doesn't exist
        }

        // Finally delete player
        const { error } = await supabase
            .from('club_players')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    getPlayersWithTeam: async (clubId: string, seasonId: string | null): Promise<(PlayerDB & { team?: { id: string, name: string, category: string, gender: string }, display_position?: string, display_status?: string })[]> => {
        // 1. Get all players (excluding soft-deleted)
        const { data: players, error: playersError } = await supabase
            .from('club_players')
            .select('*')
            .eq('club_id', clubId)
            .is('deleted_at', null)  // Filter out soft-deleted
            .order('first_name', { ascending: true })

        if (playersError) throw playersError

        if (!seasonId || players.length === 0) {
            // No season context - use global position/status as display values
            return players.map(p => ({
                ...p,
                display_position: p.main_position,
                display_status: p.is_active ? 'active' : 'inactive'
            }))
        }

        try {
            // 2. Get assignments for the active season (includes position and status per team)
            const { data: assignments, error: assignmentsError } = await supabase
                .from('player_team_season')
                .select(`
                    player_id,
                    position,
                    status,
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
                // Fallback: return players with global position/status
                return players.map(p => ({
                    ...p,
                    display_position: p.main_position,
                    display_status: p.is_active ? 'active' : 'inactive'
                }))
            }

            // 3. Map assignments to players
            const assignmentMap = new Map()
            assignments?.forEach((a: any) => {
                if (a.teams) {
                    // Normalize the team object to have a 'name' property
                    const team = a.teams
                    const displayName = team.custom_name || `${team.category} ${team.gender === 'female' ? 'Femenino' : team.gender === 'male' ? 'Masculino' : 'Mixto'}`

                    assignmentMap.set(a.player_id, {
                        team: {
                            ...team,
                            name: displayName
                        },
                        position: a.position, // Position from player_team_season
                        status: a.status // Status from player_team_season
                    })
                }
            })

            return players.map(p => {
                const assignment = assignmentMap.get(p.id)
                return {
                    ...p,
                    team: assignment?.team,
                    // Priority: player_team_season.position > club_players.main_position
                    display_position: assignment?.position || p.main_position,
                    // Priority: player_team_season.status > club_players.is_active
                    display_status: assignment?.status || (p.is_active ? 'active' : 'inactive')
                }
            })
        } catch (error) {
            console.error('Unexpected error fetching assignments:', error)
            // Fallback: return players with global position/status
            return players.map(p => ({
                ...p,
                display_position: p.main_position,
                display_status: p.is_active ? 'active' : 'inactive'
            }))
        }
    }
}
