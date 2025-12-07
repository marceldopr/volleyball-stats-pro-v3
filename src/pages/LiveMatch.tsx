import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMatchStore } from '../stores/matchStore'
import { LiveMatchScouting } from '../components/LiveMatchScouting'
import { StartersManagement } from '../components/StartersManagement'

import { matchService } from '../services/matchService'
import { matchConvocationService } from '../services/matchConvocationService'
import { teamService } from '../services/teamService'
import { getTeamDisplayName } from '../utils/teamDisplay'


export function LiveMatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { matches, updateMatch, updateStartingServerSet1, updateStarters, updateStartingLineup } = useMatchStore()

  const [loading, setLoading] = useState(true)
  const [fetchedMatch, setFetchedMatch] = useState<any>(null)
  const [teamName, setTeamName] = useState<string>('')

  // Try to find match in store first
  const storeMatch = matches.find(m => m.id === id)
  const match = storeMatch || fetchedMatch

  useEffect(() => {
    const loadMatch = async () => {
      if (storeMatch) {
        setLoading(false)
        return
      }

      if (!id) {
        console.error('LiveMatch: No match ID provided in URL')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('LiveMatch: Fetching match from Supabase, ID:', id)

        // Fetch full details from Supabase
        const fullMatch = await matchService.getMatchFullDetails(id)

        if (fullMatch) {
          console.log('LiveMatch: Match loaded successfully from Supabase:', fullMatch)
          setFetchedMatch(fullMatch)

          // Add match to store so updateMatch calls will work
          useMatchStore.setState(state => {
            const existingIndex = state.matches.findIndex(m => m.id === fullMatch.id)
            if (existingIndex >= 0) {
              const updatedMatches = [...state.matches]
              updatedMatches[existingIndex] = fullMatch
              return { matches: updatedMatches }
            } else {
              return { matches: [...state.matches, fullMatch] }
            }
          })
        } else {
          console.error('LiveMatch: Match not found in Supabase, ID:', id)
        }
      } catch (err) {
        console.error('LiveMatch: Error loading match from Supabase:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMatch()
  }, [id, storeMatch])

  // Load team name
  useEffect(() => {
    const loadTeamName = async () => {
      if (!match?.teamId) return

      try {
        const team = await teamService.getTeamById(match.teamId)
        if (team) {
          setTeamName(getTeamDisplayName(team))
        }
      } catch (err) {
        console.error('Error loading team name:', err)
      }
    }

    loadTeamName()
  }, [match?.teamId])

  const handleSaveStarters = async (starters: string[], startingLineup: any, serveSelection?: 'local' | 'visitor' | null) => {
    if (!match) return

    try {
      // Update match_convocations to mark starters
      for (const playerId of starters) {
        const convocations = await matchConvocationService.getConvocationsByMatch(match.id)
        const convocation = convocations.find((c: any) => c.player_id === playerId)
        if (convocation) {
          await matchConvocationService.updateConvocation(convocation.id, {
            role_in_match: 'starter'
          })
        }
      }

      // Update local store with starters and lineup
      updateStarters(match.id, starters)
      updateStartingLineup(match.id, startingLineup)

      // For Set 1: Create the set if it doesn't exist
      if (match.currentSet === 1) {
        const set1Exists = match.sets.some((s: any) => s.number === 1)
        if (!set1Exists) {
          const set1 = {
            id: `${match.id}-set1`,
            number: 1,
            homeScore: 0,
            awayScore: 0,
            status: 'in_progress' as const
          }

          // Add Set 1 to the match
          updateMatch(match.id, {
            sets: [...match.sets, set1]
          })
        }
      }

      // Save serve selection if provided (for Set 1)
      if (match.currentSet === 1 && serveSelection) {
        // Create a special action to store the serve selection
        // This avoids the need for a dedicated column in the matches table
        const serveAction = {
          id: Date.now().toString(),
          set: 1,
          equipo: serveSelection === 'local' ? 'local' : 'visitante',
          tipo: 'initial_serve_selection',
          timestamp: new Date().toISOString(),
          serveSelection: serveSelection
        }

        // Append to existing actions and save to DB
        // Note: match.acciones is from store, matchService expects 'actions' property for DB
        const currentActions = match.acciones || []
        await matchService.updateMatch(match.id, {
          actions: [...currentActions, serveAction]
        })

        // Update local store with serve selection
        updateStartingServerSet1(match.id, serveSelection)
      }

      // No need to reload or set state, the store update will trigger re-render
      // and isSet1SetupComplete will become true

    } catch (err) {
      console.error('Error saving starters:', err)
      alert('Error al guardar las titulares.')
    }
  }

  // Determine if Set 1 setup is complete
  const isSet1SetupComplete = useMemo(() => {
    if (!match) return false
    // If it's not set 1, we assume setup is handled or done
    if (match.currentSet !== 1) return true

    // For Set 1, we strictly require starting lineup AND serve selection
    const hasLineup = !!match.startingLineup
    const hasServeSelection = !!match.sacadorInicialSet1

    return hasLineup && hasServeSelection
  }, [match])

  // Handle case where match is not found
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando partido...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Partido no encontrado</h1>
          <p className="text-gray-400 mb-2">El partido que estás buscando no existe o no se ha podido cargar.</p>
          <button
            onClick={() => navigate('/matches')}
            className="px-4 py-2 bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Volver a partidos
          </button>
        </div>
      </div>
    )
  }

  // Blocking render: If setup is not complete, show StartersManagement ONLY
  if (!isSet1SetupComplete) {
    return (
      <div className="min-h-screen bg-gray-900">
        <StartersManagement
          isOpen={true}
          onClose={() => navigate('/matches')}
          match={match}
          onSave={handleSaveStarters}
          currentSet={1}
          teamName={teamName}
        />
      </div>
    )
  }

  // Only render LiveMatchScouting when setup is complete
  return (
    <LiveMatchScouting
      match={match}
      onUpdateMatch={updateMatch}
      onNavigateToMatches={() => navigate('/matches')}
    />
  )
}
