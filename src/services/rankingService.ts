import { supabase } from '@/lib/supabaseClient'
import { getTeamDisplayName } from '@/utils/teamDisplay'

export interface RankingFilter {
    clubId: string
    seasonId: string
    teamId?: string
    categoryId?: string // Will filter teams by category
    gender?: string
    limit?: number
}

export interface PlayerRankingStats {
    playerId: string
    playerName: string
    teamId: string
    teamName: string
    matchesCaught: number
    setsPlayed: number

    // Points
    totalPoints: number
    pointsPerSet: number

    // Serve
    serveAces: number
    serveErrors: number
    serveAttempts: number
    serveEfficiency: number // (Aces - Errors) / Attempts

    // Attack
    attackKills: number
    attackErrors: number
    attackAttempts: number
    attackEfficiency: number // (Kills - Errors) / Attempts
    attackKillColors: number // Kills / Attempts

    // Block
    blockPoints: number

    // Reception
    receptionAttempts: number
    receptionErrors: number
    receptionEfficiency: number // (Attempts - Errors) / Attempts (Simple version for now)
}

export const rankingService = {
    /**
     * Get aggregated rankings for the club/team
     */
    async getRankings({
        clubId,
        seasonId,
        teamId,
        categoryId,
        gender,
        limit: _limit = 50
    }: RankingFilter): Promise<PlayerRankingStats[]> {

        let query = supabase
            .from('match_player_set_stats')
            .select(`
                *,
                match:matches!inner(id, status, match_date),
                player:club_players!inner(id, first_name, last_name),
                team:teams!inner(id, custom_name, category_stage, gender)
            `)
            .eq('season_id', seasonId)
            .eq('match.status', 'finished') // Only finished matches

        // Filters
        if (teamId) {
            query = query.eq('team_id', teamId)
        } else {
            // If no specific team, ensure we filter by club via the team relation or if table has club_id (it does usually)
            // match_player_set_stats has season_id, but team_id links to teams which has club_id
            // Let's filter by the team's club_id to be safe and explicit
            // However, Supabase inner join filtering slightly tricky on nested unless using !inner which we did.
            query = query.eq('team.club_id', clubId)
        }

        if (categoryId) {
            query = query.eq('team.category_stage', categoryId)
        }

        if (gender) {
            query = query.eq('team.gender', gender)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching ranking stats:', error)
            throw error
        }

        if (!data) return []

        // Aggregation in Memory
        // Map<playerId, Stats>
        const agg = new Map<string, PlayerRankingStats>()

        data.forEach((row: any) => {
            const pid = row.player_id

            if (!agg.has(pid)) {
                // Use utility function for consistent team name display
                const teamDisplayName = getTeamDisplayName({
                    category_stage: row.team.category_stage,
                    category: row.team.category,
                    custom_name: row.team.custom_name,
                    gender: row.team.gender,
                    identifier: row.team.identifier
                })

                agg.set(pid, {
                    playerId: pid,
                    playerName: `${row.player.first_name} ${row.player.last_name}`,
                    teamId: row.team.id,
                    teamName: teamDisplayName,
                    matchesCaught: 0, // Will calculate unique matches
                    setsPlayed: 0,

                    totalPoints: 0,
                    pointsPerSet: 0,

                    serveAces: 0,
                    serveErrors: 0,
                    serveAttempts: 0,
                    serveEfficiency: 0,

                    attackKills: 0,
                    attackErrors: 0,
                    attackAttempts: 0,
                    attackEfficiency: 0,
                    attackKillColors: 0,

                    blockPoints: 0,

                    receptionAttempts: 0,
                    receptionErrors: 0,
                    receptionEfficiency: 0
                })
            }

            const stats = agg.get(pid)!

            // Accumulate
            stats.setsPlayed += 1

            // Points (approximated as Kills + Aces + Blocks if no total column, but let's assume valid columns)
            // match_player_set_stats usually has explicit columns
            stats.serveAces += row.aces || 0
            stats.serveErrors += row.serve_errors || 0
            stats.serveAttempts += row.serves || 0

            stats.attackKills += row.kills || 0
            stats.attackErrors += row.attack_errors || 0
            stats.attackAttempts += row.attacks || 0

            stats.blockPoints += row.blocks || 0

            stats.receptionAttempts += row.receptions || 0
            stats.receptionErrors += row.reception_errors || 0

            // Total points logic
            const derivedPoints = (row.kills || 0) + (row.aces || 0) + (row.blocks || 0)
            stats.totalPoints += derivedPoints
        })

        // Final Calculations (Averages & Efficiencies)
        // Also we need to count unique matches per player if we want exact "Matches Played" count
        // But since we iterated sets, we can't easily count matches without a secondary Set/Map tracking.
        // Let's do a quick pass for matches count or just assume sets is enough for now. 
        // Better: distinct match IDs per player.

        const playerMatches = new Map<string, Set<string>>()
        data.forEach((row: any) => {
            if (!playerMatches.has(row.player_id)) {
                playerMatches.set(row.player_id, new Set())
            }
            playerMatches.get(row.player_id)!.add(row.match_id)
        })

        const result = Array.from(agg.values()).map(stat => {
            const matches = playerMatches.get(stat.playerId)?.size || 0
            stat.matchesCaught = matches

            // Points per set
            stat.pointsPerSet = stat.setsPlayed > 0
                ? Number((stat.totalPoints / stat.setsPlayed).toFixed(2))
                : 0

            // Serve Efficiency: (Aces - Errors) / Attempts
            stat.serveEfficiency = stat.serveAttempts > 0
                ? Number(((stat.serveAces - stat.serveErrors) / stat.serveAttempts).toFixed(3))
                : 0

            // Attack Efficiency: (Kills - Errors) / Attempts
            stat.attackEfficiency = stat.attackAttempts > 0
                ? Number(((stat.attackKills - stat.attackErrors) / stat.attackAttempts).toFixed(3))
                : 0

            // Kill %: Kills / Attempts
            stat.attackKillColors = stat.attackAttempts > 0
                ? Number((stat.attackKills / stat.attackAttempts).toFixed(3))
                : 0

            // Reception Efficiency: (Attempts - Errors) / Attempts
            // NOTE: This treats everything not an error as "Positive". 
            // Ideally we subtract only "Errors" from total. 
            stat.receptionEfficiency = stat.receptionAttempts > 0
                ? Number(((stat.receptionAttempts - stat.receptionErrors) / stat.receptionAttempts).toFixed(3))
                : 0

            return stat
        })

        return result
    }
}
