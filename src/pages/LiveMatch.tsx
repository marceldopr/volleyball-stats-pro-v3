import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMatchStore } from '../stores/matchStore'
import { LiveMatchScouting } from '../components/LiveMatchScouting'
import { MatchWizard } from '../components/MatchWizard'

import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'


export function LiveMatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { matches, updateMatch } = useMatchStore()


  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(3)
  const [team, setTeam] = useState<any>(null)
  const [season, setSeason] = useState<any>(null)

  const match = matches.find(m => m.id === id)

  // Fetch related team and season when match changes
  useEffect(() => {
    const fetchRelated = async () => {
      if (!match) return
      try {
        if (match.team_id) {
          const t = await teamService.getTeamById(match.team_id)
          setTeam(t)
        }
        if (match.season_id) {
          const s = await seasonService.getSeasonById(match.season_id)
          setSeason(s)
        }
      } catch (err) {
        console.error('Error loading team/season for live match', err)
      }
    }
    fetchRelated()
  }, [match])

  // Handle case where match is not found
  if (!match) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Partido no encontrado</h1>
          <p className="text-gray-400">El partido que estás buscando no existe.</p>
        </div>
      </div>
    )
  }



  return (
    <>
      {/* Header with team and season info */}
      <div className="p-4 bg-gray-100 border-b">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-lg font-medium text-gray-800">
            {team ? `Equipo: ${team.name}` : 'Equipo: —'}
          </div>
          <div className="text-sm text-gray-600">
            {season ? `Temporada: ${season.name}` : 'Temporada: —'}
          </div>
        </div>
      </div>

      <LiveMatchScouting
        match={match}
        onUpdateMatch={updateMatch}
        onNavigateToMatches={() => navigate('/matches')}
        onNavigateToWizardStep={(step) => {
          setWizardStep(step)
          setShowWizard(true)
        }}
      />

      {showWizard && (
        <MatchWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          initialStep={wizardStep}
          matchId={id}
        />
      )}
    </>
  )
}