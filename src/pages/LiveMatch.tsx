import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMatchStore } from '../stores/matchStore'
import { LiveMatchScouting } from '../components/LiveMatchScouting'
import { MatchWizard } from '../components/MatchWizard'

export function LiveMatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { matches, updateMatch } = useMatchStore()
  // const { teams } = useTeamStore() // Not needed for now
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(3)
  
  const match = matches.find(m => m.id === id)
  // const myTeam = teams.find(t => t.id === match?.teamId)
  
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

  // Check if match has starting lineup configured
  if (!match.startingLineup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Titulares no configuradas
          </h1>
          <p className="text-gray-600 mb-6">
            Debes configurar las titulares antes de comenzar el partido.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Volver atrás
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
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