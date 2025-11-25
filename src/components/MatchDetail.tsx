import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Clock, MapPin, Trophy, Edit3, Trash2, Loader2 } from 'lucide-react'
import { Match, StartingLineup } from '../stores/matchStore'
import { StartersManagement } from './StartersManagement'
import { useMatchStore } from '../stores/matchStore'
import { ConfirmDialog } from './ConfirmDialog'
import { matchService } from '../services/matchService'

interface MatchDetailProps {
  match: Match
  onClose: () => void
}

export function MatchDetail({ match: initialMatch, onClose }: MatchDetailProps) {
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match>(initialMatch)
  const [loading, setLoading] = useState(false)
  const [showStartersModal, setShowStartersModal] = useState(false)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const { updateMatch, deleteMatch } = useMatchStore()

  // Load full details if missing
  useEffect(() => {
    const loadFullDetails = async () => {
      // Check if we need to load details
      // If players or sets are empty, and we have an ID, try to load from Supabase
      const needsLoading = (match.players?.length === 0 || match.sets?.length === 0) && match.id

      if (needsLoading) {
        setLoading(true)
        try {
          const fullDetails = await matchService.getMatchFullDetails(match.id)
          if (fullDetails) {
            setMatch(fullDetails)
          }
        } catch (err) {
          console.error('Error loading match details:', err)
        } finally {
          setLoading(false)
        }
      }
    }

    // Only run if it's a different match ID or if we haven't loaded yet
    if (initialMatch.id === match.id && (match.players?.length === 0 || match.sets?.length === 0)) {
      loadFullDetails()
    }
  }, [initialMatch.id])

  const starters = match.players?.filter(player => player.starter) || []
  const hasStarters = starters.length > 0

  // Auto-open starters modal if no starters defined and match is upcoming
  useEffect(() => {
    if (match.status === 'upcoming' && !hasStarters && !loading) {
      // Only auto-open if we are sure we have loaded data
      if (match.players && match.players.length > 0) {
        setShowStartersModal(true)
        setIsFirstTimeSetup(true)
      }
    }
  }, [match.status, hasStarters, loading, match.players])

  const handleSaveStarters = (starterIds: string[], startingLineup: StartingLineup) => {
    try {
      const updatedPlayers = match.players?.map(player => ({
        ...player,
        starter: starterIds.includes(player.playerId)
      })) || []

      updateMatch(match.id, {
        players: updatedPlayers,
        startingLineup
      })

      // Update local state as well
      setMatch(prev => ({
        ...prev,
        players: updatedPlayers,
        startingLineup
      }))

      // If this is first time setup after creating a match, navigate to live match
      if (isFirstTimeSetup) {
        setShowStartersModal(false)
        onClose() // Close the detail modal first
        navigate(`/matches/${match.id}/live`)
      } else {
        // If just editing existing starters, just close the modal
        setShowStartersModal(false)
      }
    } catch (error) {
      // Error will be handled by the StartersManagement component
      throw error
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'live': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Próximo'
      case 'live': return 'En Vivo'
      case 'completed': return 'Finalizado'
      default: return 'Desconocido'
    }
  }

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    try {
      deleteMatch(match.id)
      onClose() // Close the detail modal after deletion
    } catch (error) {
      alert('No se ha podido eliminar el partido. Inténtalo de nuevo.')
    }
    setDeleteConfirmOpen(false)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
          <p className="text-gray-600">Cargando detalles del partido...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detalle del Partido</h2>
            <p className="text-sm text-gray-600 mt-1">
              {match.opponent} - {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteClick}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar partido"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Trophy className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Match Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{match.time}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{match.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                {getStatusText(match.status)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${match.teamSide === 'local'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
                }`}>
                {match.teamSide === 'local' ? 'Local' : 'Visitante'}
              </span>
            </div>
          </div>

          {match.result && (
            <div className="text-center">
              <span className="text-2xl font-bold text-primary-600">{match.result}</span>
            </div>
          )}
        </div>

        {/* Starters Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Titulares</h3>
            {match.status === 'upcoming' && (
              <button
                onClick={() => setShowStartersModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>{hasStarters ? 'Editar titulares' : 'Definir titulares'}</span>
              </button>
            )}
          </div>

          {hasStarters ? (
            <div className="grid grid-cols-1 gap-2">
              {starters.map((player) => (
                <div key={player.playerId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {player.number}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{player.name}</p>
                    <p className="text-sm text-gray-600">{player.position || 'L'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No hay titulares definidas para este partido</p>
              {match.status === 'upcoming' && (
                <p className="text-sm text-gray-500 mt-2">Haz clic en "Definir titulares" para seleccionar las 6 jugadoras titulares</p>
              )}
            </div>
          )}
        </div>

        {/* Players Section */}
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jugadoras Convocadas</h3>
          <div className="grid grid-cols-2 gap-3">
            {match.players?.map((player) => (
              <div key={player.playerId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {player.number}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{player.name}</p>
                  <p className="text-sm text-gray-600">{player.position || 'L'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-outline"
          >
            Cerrar
          </button>

          {match.status === 'upcoming' && (
            <button
              onClick={() => {
                if (!hasStarters) {
                  setShowStartersModal(true)
                } else {
                  // Navigate to live match
                  window.location.href = `/matches/${match.id}/live`
                }
              }}
              className="btn-primary"
            >
              Comenzar Partido
            </button>
          )}
        </div>
      </div>

      <StartersManagement
        isOpen={showStartersModal}
        onClose={() => setShowStartersModal(false)}
        match={match}
        onSave={handleSaveStarters}
        isFirstTimeSetup={isFirstTimeSetup}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar partido"
        message="¿Seguro que quieres eliminar este partido? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmButtonClassName="btn-primary bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  )
}