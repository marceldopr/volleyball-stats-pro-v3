import { supabase } from '@/lib/supabaseClient'

export interface TeamStanding {
    teamId: string
    teamName: string
    category: string
    gamesPlayed: number
    wins: number
    losses: number
    winPercentage: number
    setsWon: number
    setsLost: number
    setsDiff: number
    pointsWon: number
    pointsLost: number
    pointsDiff: number
}

export const clubRankingsService = {
    /**
     * Obté el rànquing de tots els equips del club per a una temporada
     */
    async getClubStandings(seasonId: string, clubId: string): Promise<TeamStanding[]> {
        try {
            // 1. Obtenir tots els partits acabats de la temporada
            const { data: matches, error: matchesError } = await supabase
                .from('matches')
                .select(`
          id,
          team_id,
          home_away,
          sets_home,
          sets_away,
          points_home,
          points_away,
          winner
        `)
                .eq('club_id', clubId)
                .eq('season_id', seasonId)
                .eq('status', 'finished')

            if (matchesError) throw matchesError

            // 2. Obtenir info dels equips (separadament per evitar problemes de JOIN)
            const { data: teams, error: teamsError } = await supabase
                .from('teams')
                .select('id, custom_name, gender, category_stage')
                .eq('club_id', clubId)

            if (teamsError) throw teamsError

            const teamsMap = new Map<string, any>()
            teams?.forEach(t => teamsMap.set(t.id, t))

            // 3. Map per agregar estadístiques per equip
            const teamStats = new Map<string, TeamStanding>()

            if (!matches) return []

            matches.forEach((match: any) => {
                const teamId = match.team_id
                const teamData = teamsMap.get(teamId)

                if (!teamStats.has(teamId)) {
                    // Construcció del nom: Si no hi ha custom_name, usa categoria + gènere (traduït)
                    let derivedName = 'Equipo Desconocido'
                    if (teamData) {
                        if (teamData.custom_name) {
                            derivedName = teamData.custom_name
                        } else {
                            const gender = teamData.gender === 'male' ? 'Masculí' : teamData.gender === 'female' ? 'Femení' : (teamData.gender || '')
                            derivedName = `${teamData.category_stage || ''} ${gender}`.trim()
                        }
                    }

                    teamStats.set(teamId, {
                        teamId,
                        teamName: derivedName,
                        category: teamData?.category_stage || '',
                        gamesPlayed: 0,
                        wins: 0,
                        losses: 0,
                        winPercentage: 0,
                        setsWon: 0,
                        setsLost: 0,
                        setsDiff: 0,
                        pointsWon: 0,
                        pointsLost: 0,
                        pointsDiff: 0
                    })
                }

                const stats = teamStats.get(teamId)!

                // Calcular resultats del partit des de la perspectiva de l'equip
                const isHome = match.home_away === 'home'
                const setsFor = isHome ? (match.sets_home || 0) : (match.sets_away || 0)
                const setsAgainst = isHome ? (match.sets_away || 0) : (match.sets_home || 0)
                const pointsFor = isHome ? (match.points_home || 0) : (match.points_away || 0)
                const pointsAgainst = isHome ? (match.points_away || 0) : (match.points_home || 0)

                // Determinar guanyador
                let won = false
                if (match.winner) {
                    won = (isHome && match.winner === 'home') || (!isHome && match.winner === 'away')
                } else {
                    won = setsFor > setsAgainst
                }

                // Actualitzar stats
                stats.gamesPlayed++
                if (won) stats.wins++
                else stats.losses++

                stats.setsWon += setsFor
                stats.setsLost += setsAgainst
                stats.pointsWon += pointsFor
                stats.pointsLost += pointsAgainst
            })

            // 4. Calcular derivats (Diff, %) i convertir a array
            const standings: TeamStanding[] = Array.from(teamStats.values()).map(stat => ({
                ...stat,
                setsDiff: stat.setsWon - stat.setsLost,
                pointsDiff: stat.pointsWon - stat.pointsLost,
                winPercentage: stat.gamesPlayed > 0
                    ? Number(((stat.wins / stat.gamesPlayed) * 100).toFixed(1))
                    : 0
            }))

            // 5. Ordenació: Win% > Sets Diff > Points Diff
            return standings.sort((a, b) => {
                if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage
                if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff
                return b.pointsDiff - a.pointsDiff
            })

        } catch (error) {
            console.error('Error calculating club standings:', error)
            return []
        }
    }
}
