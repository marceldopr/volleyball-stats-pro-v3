import { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { Match, StartingLineup } from '../stores/matchStore'
import { useTeamStore } from '../stores/teamStore'
import { VolleyballCourt } from './VolleyballCourt'
import { LiberoSlot } from './LiberoSlot'
import { PlayerSelectionModal } from './PlayerSelectionModal'

interface StartersManagementProps {
  isOpen: boolean
  onClose: () => void
  match: Match
  onSave: (starters: string[], startingLineup: StartingLineup) => void
  isFirstTimeSetup?: boolean
  currentSet?: number
  onNavigateBack?: () => void
  onServeSelection?: (weServeFirst: boolean) => void
  sacadorInicialSet5?: 'local' | 'visitor' | null
}

export function StartersManagement({ isOpen, onClose, match, onSave, currentSet, onNavigateBack, onServeSelection, sacadorInicialSet5 }: StartersManagementProps) {
  const [startingLineup, setStartingLineup] = useState<StartingLineup>({
    position1: null,
    position2: null,
    position3: null,
    position4: null,
    position5: null,
    position6: null,
    libero: null
  })
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)
  const [error, setError] = useState<string>('')
  const { teams } = useTeamStore()
  const [serveSelection, setServeSelection] = useState<'local' | 'visitor' | null>(sacadorInicialSet5 || null)

  const selectedTeam = teams.find(team => team.id === match.teamId)
  const matchPlayers = match.players || []

  useEffect(() => {
    if (isOpen && matchPlayers) {
      // Load existing starting lineup if available
      if (match.startingLineup) {
        setStartingLineup(match.startingLineup)
      }
    }
  }, [isOpen, matchPlayers, match.startingLineup])

  const handlePositionClick = (positionId: string) => {
    setSelectedPosition(positionId)
    setIsPlayerModalOpen(true)
  }

  const handleLiberoClick = () => {
    setSelectedPosition('libero')
    setIsPlayerModalOpen(true)
  }

  const handlePlayerSelect = (playerId: string) => {
    if (!selectedPosition) return

    // Check if player is already in another position
    const currentPosition = Object.entries(startingLineup).find(
      ([_, player]) => player === playerId
    )

    if (currentPosition) {
      // Swap: remove from old position, add to new position
      const [oldPosition] = currentPosition
      setStartingLineup(prev => ({
        ...prev,
        [oldPosition]: startingLineup[selectedPosition as keyof StartingLineup],
        [selectedPosition]: playerId
      }))
    } else {
      // Direct assignment
      setStartingLineup(prev => ({
        ...prev,
        [selectedPosition]: playerId
      }))
    }

    setIsPlayerModalOpen(false)
    setSelectedPosition(null)
  }

  const getPlayerById = (playerId: string) => {
    return matchPlayers.find(player => player.playerId === playerId)
  }

  const getSelectedStarters = () => {
    const positionPlayers = Object.values(startingLineup).filter(Boolean) as string[]
    return positionPlayers
  }

  const getFieldStartersCount = () => {
    // Only count field positions (1-6), exclude libero
    const fieldPositions = [
      startingLineup.position1,
      startingLineup.position2,
      startingLineup.position3,
      startingLineup.position4,
      startingLineup.position5,
      startingLineup.position6
    ].filter(Boolean) as string[]
    return fieldPositions.length
  }

  const getAvailablePlayers = () => {
    const isLiberoSelection = selectedPosition === 'libero'


    return matchPlayers.filter(player => {
      // Don't show already selected players (except current position)
      const isInOtherPosition = Object.entries(startingLineup).some(
        ([pos, playerId]) => playerId === player.playerId && pos !== selectedPosition
      )

      if (isInOtherPosition) return false

      // Libero slot: only show liberos
      if (isLiberoSelection) {
        return player.position === 'L'
      }

      // Other slots: exclude liberos
      return player.position !== 'L'
    })
  }

  const handleServeSelection = (weServeFirst: boolean) => {
    const miEquipo = match.teamSide
    const equipoContrario = miEquipo === 'local' ? 'visitante' : 'local'
    const startingServer = weServeFirst ? miEquipo : equipoContrario

    // Convert to store format ('visitante' -> 'visitor')
    const startingServerForStore = startingServer === 'visitante' ? 'visitor' : startingServer

    setServeSelection(startingServerForStore)
    if (onServeSelection) {
      onServeSelection(weServeFirst)
    }
  }

  const handleSave = () => {
    setError('') // Clear previous errors

    const fieldStartersCount = getFieldStartersCount()

    if (fieldStartersCount !== 6) {
      setError('Debes seleccionar exactamente 6 jugadoras titulares en el campo.')
      return
    }

    // For Set 5, require serve selection
    if (currentSet === 5 && !serveSelection) {
      setError('Debes seleccionar quién saca primero en el Set 5.')
      return
    }

    try {
      const selectedStarters = getSelectedStarters()
      onSave(selectedStarters, startingLineup)
      // The onSave function now handles navigation/closing based on context
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ha ocurrido un error al guardar las titulares. Inténtalo de nuevo.')
    }
  }

  if (!isOpen || !selectedTeam) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Seleccionar Titulares{currentSet ? ` – Set ${currentSet}` : ''}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona las 6 jugadoras titulares para comenzar el partido
            </p>
          </div>
          <button
            onClick={() => {
              setError('')
              onClose()
              // Navigate back if the function is provided
              if (onNavigateBack) {
                onNavigateBack()
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Serve Selection for Set 5 */}
          {currentSet === 5 && (
            <div className="mb-6 space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">¿Quién saca primero?</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleServeSelection(true)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${serveSelection === (match.teamSide === 'local' ? 'local' : 'visitor')
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {selectedTeam.name}
                </button>
                <button
                  onClick={() => handleServeSelection(false)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${serveSelection === (match.teamSide === 'local' ? 'visitor' : 'local')
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {match.opponent || 'Equipo Rival'}
                </button>
              </div>
              {!serveSelection && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Debes seleccionar quién saca primero
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Visual Court */}
          <div className="mb-6">
            {/* Volleyball Court */}
            <VolleyballCourt
              startingLineup={startingLineup}
              onPositionClick={handlePositionClick}
              getPlayerById={getPlayerById}
            />

            {/* Libero Management - positioned below the court */}
            <div className="mt-4 flex justify-center">
              <LiberoSlot
                liberoId={startingLineup.libero}
                onLiberoClick={handleLiberoClick}
                getPlayerById={getPlayerById}
              />
            </div>
          </div>

          {/* Player Selection Modal */}
          <PlayerSelectionModal
            isOpen={isPlayerModalOpen}
            onClose={() => {
              setIsPlayerModalOpen(false)
              setSelectedPosition(null)
            }}
            onSelectPlayer={handlePlayerSelect}
            availablePlayers={getAvailablePlayers()}
            currentSelection={selectedPosition ? startingLineup[selectedPosition as keyof StartingLineup] : null}
            positionLabel={
              selectedPosition === 'libero'
                ? 'Seleccionar Líbero'
                : `Seleccionar Jugadora - Posición ${selectedPosition?.replace('position', '')}`
            }
            isLiberoSlot={selectedPosition === 'libero'}
          />

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <Users className="w-4 h-4 inline mr-1" />
              Titulares seleccionadas: {getFieldStartersCount()} de 6
            </p>
          </div>

          {getFieldStartersCount() !== 6 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-800">
                Debes seleccionar exactamente 6 jugadoras titulares en el campo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={() => {
              setError('')
              // Primero ejecutar la navegación hacia atrás para restaurar el modal de fin de set
              if (onNavigateBack) {
                onNavigateBack()
              }
              // Después cerrar este modal de titulares (seguridad)
              onClose()
            }}
            className="btn-outline"
          >
            Hacia atrás
          </button>

          <button
            onClick={handleSave}
            disabled={getFieldStartersCount() !== 6}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar titulares
          </button>
        </div>
      </div>
    </div>
  )
}