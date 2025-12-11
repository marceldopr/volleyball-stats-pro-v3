import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchServiceV2 } from '@/services/matchServiceV2'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { teamService } from '@/services/teamService'
import { toast } from 'sonner'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import type { PlayerV2 } from '@/stores/matchStoreV2'

interface UseMatchDataProps {
    matchId: string | undefined
    loadMatch: (id: string, events: any[], ourSide: 'home' | 'away', teamNames: { home: string; away: string }) => void
    setInitialOnCourtPlayers: (players: PlayerV2[]) => void
}

/**
 * Hook para manejar la carga de datos del partido V2
 * Extrae toda la lógica de carga de partido, equipo, jugadoras y convocaciones
 * Líneas originales: 41, 44-45, 92-207 en LiveMatchScoutingV2.tsx
 */
export function useMatchData({ matchId, loadMatch, setInitialOnCourtPlayers }: UseMatchDataProps) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [matchData, setMatchData] = useState<any>(null)
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])

    // Load Match & Convocations only once
    // Original: líneas 92-207
    useEffect(() => {
        if (!matchId) return

        const init = async () => {
            try {
                setLoading(true)

                // CRITICAL FIX: Clear cached team names from localStorage
                // This prevents old "Local"/"Visitante" from being restored
                const stored = localStorage.getItem('match-store-v2')
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored)
                        if (parsed.state?.derivedState) {
                            delete parsed.state.derivedState.homeTeamName
                            delete parsed.state.derivedState.awayTeamName
                            localStorage.setItem('match-store-v2', JSON.stringify(parsed))
                        }
                    } catch (e) {
                        console.error('Error cleaning localStorage:', e)
                    }
                }

                const match = await matchServiceV2.getMatchV2(matchId)
                if (!match) throw new Error('Match not found')

                setMatchData(match)

                // 1. Determine Our Side
                const ourSide = match.home_away === 'home' ? 'home' : 'away'

                // 2. Load full team data to get complete name (like Matches.tsx does)
                const team = await teamService.getTeamById(match.team_id)
                const teamName = team ? getTeamDisplayName(team) : 'Nuestro Equipo'
                const opponentName = match.opponent_name || 'Rival'

                const homeTeamName = ourSide === 'home' ? teamName : opponentName
                const awayTeamName = ourSide === 'away' ? teamName : opponentName

                // 3. Load Match into Store
                loadMatch(match.id, match.actions || [], ourSide, { home: homeTeamName, away: awayTeamName })

                // 3. Load Roster (Context for numbers/roles)
                const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(match.team_id, match.season_id)

                // 4. Load Convocations
                const convos = await matchServiceV2.getConvocationsV2(matchId)

                // Map all available players merging Roster info
                const players = convos
                    .filter(c => c.status === 'convocado' || c.status === undefined)
                    .map(c => {
                        // Find roster entry for this player to get the correct season number/role
                        const rosterItem = roster.find(r => r.player_id === c.player_id)
                        const pData = c.club_players || {}

                        // Priority: Roster Number > Player Profile Number > '?'
                        const number = rosterItem?.jersey_number || pData.jersey_number || '?'

                        // Priority: Custom Match Role > Roster Role > Player Profile Position > '?'
                        // Priority: Custom Match Role (if not generic) > Roster Role > Player Profile Position > '?'
                        let effectiveRole = c.role_in_match
                        if (effectiveRole && (effectiveRole.toLowerCase() === 'starter' || effectiveRole.toLowerCase() === 'convocado')) {
                            effectiveRole = null
                        }

                        let rosterRole = rosterItem?.role
                        if (rosterRole && (rosterRole.toLowerCase() === 'starter' || rosterRole.toLowerCase() === 'convocado')) {
                            rosterRole = null
                        }

                        const rawRole = effectiveRole || rosterRole || pData.main_position || '?'

                        // Map Spanish/Full names to Codes
                        const roleMap: Record<string, string> = {
                            'Central': 'MB',
                            'Receptora': 'OH',
                            'Receptor': 'OH',
                            'Punta': 'OH',
                            'Opuesta': 'OPP',
                            'Opuesto': 'OPP',
                            'Colocadora': 'S',
                            'Colocador': 'S',
                            'Armadora': 'S',
                            'Líbero': 'L',
                            'Libero': 'L'
                        }

                        const role = roleMap[rawRole] || rawRole && roleMap[Object.keys(roleMap).find(k => rawRole.includes(k)) || ''] || rawRole

                        const name = pData.nickname || pData.first_name || `J${number}`

                        return {
                            id: c.player_id,
                            name,
                            number,
                            role
                        }
                    })

                setAvailablePlayers(players)

                // Initialize store with players for fallback
                setInitialOnCourtPlayers(players.slice(0, 6).map(p => ({ ...p, role: p.role || '?' })))

            } catch (error) {
                console.error('Error loading match V2:', error)
                toast.error('Error al cargar partido')
                navigate('/matches')
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [matchId, navigate, loadMatch, setInitialOnCourtPlayers])

    return {
        loading,
        matchData,
        availablePlayers
    }
}
