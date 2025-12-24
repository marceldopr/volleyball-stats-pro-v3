import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchService } from '@/services/matchService'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { teamService } from '@/services/teamService'
import { toast } from 'sonner'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import type { PlayerV2 } from '@/stores/matchStore'
import { getEffectivePlayerDisplayData } from '@/utils/playerEffectiveDisplay'

interface UseMatchDataProps {
    matchId: string | undefined
    loadMatch: (id: string, events: any[], ourSide: 'home' | 'away', teamNames: { home: string; away: string }) => void
    setInitialOnCourtPlayers: (players: PlayerV2[]) => void
    reset: () => void // New prop for safety
}

/**
 * Hook para manejar la carga de datos del partido V2
 * Extrae toda la lógica de carga de partido, equipo, jugadoras y convocaciones
 * Líneas originales: 41, 44-45, 92-207 en LiveMatchScoutingV2.tsx
 */
export function useMatchData({ matchId, loadMatch, setInitialOnCourtPlayers, reset: _reset }: UseMatchDataProps) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [matchData, setMatchData] = useState<any>(null)
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])

    // Load Match & Convocations only once
    useEffect(() => {
        if (!matchId) return

        const init = async () => {
            try {
                setLoading(true)

                // CRITICAL SAFEGUARD: 
                // If we are loading a new match, or restarting the process, 
                // we should clear any potential stale state first.
                // However, doing this unconditionally might flash.
                // Ideally, we reset if the STORE's current ID != matchId.
                // But we don't have access to store ID here directly unless we import store
                // or trust that loadMatch handles it. 
                // Let's rely on loadMatch overwriting key data, but ensure localStorage cleanup.

                // Clean localStorage legacy data
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

                const match = await matchService.getMatch(matchId)
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

                // 3. Load Roster (Context for numbers/roles) - ONLY ACTIVE PLAYERS
                const roster = await playerTeamSeasonService.getActiveRosterByTeamAndSeason(match.team_id, match.season_id)

                // 4. Load Convocations
                const convos = await matchService.getConvocations(matchId)

                // Map all available players merging Roster info
                const players = convos
                    .filter(c => c.status === 'convocado' || c.status === undefined)
                    .map(c => {
                        // ... existing imports

                        // Find roster entry for this player
                        const rosterItem = roster.find(r => r.player_id === c.player_id)
                        const pData = c.club_players || {}

                        // Calculate effective data using unified utility
                        const effectiveData = getEffectivePlayerDisplayData(
                            { id: c.player_id, jersey_number: pData.jersey_number, main_position: pData.main_position },
                            rosterItem,
                            c // convocation data (includes overrides)
                        )

                        const number = effectiveData.jerseyNumber
                        const role = effectiveData.position

                        // Combine first_name + last_name for full name display
                        const fullName = pData.first_name && pData.last_name
                            ? `${pData.first_name} ${pData.last_name}`
                            : pData.first_name || `J${number}`
                        const name = pData.nickname || fullName

                        return {
                            id: c.player_id,
                            name,
                            number,
                            role,
                            firstName: pData.first_name,
                            lastName: pData.last_name,
                            nickname: pData.nickname
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
