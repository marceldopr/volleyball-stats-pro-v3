import { X } from 'lucide-react'
import { Match } from '../stores/matchStore'
import { LineupGrid } from './LineupGrid'

interface PlayerSelectionPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlayer: (playerId: string) => void
  match: Match
  actionType: string
  displayRotationOrder: (string | null)[]
  currentRotationOrder: string[]
  estadoSaque: 'myTeamServing' | 'myTeamReceiving'
  isServeAction?: boolean
}

export function PlayerSelectionPopup({
  isOpen,
  onClose,
  onSelectPlayer,
  match,
  actionType,
  displayRotationOrder,
  currentRotationOrder,

  isServeAction = false
}: PlayerSelectionPopupProps) {
  if (!isOpen) return null

  // Get the serving player (position 1 in current rotation)
  const servingPlayerId = currentRotationOrder[0]

  const handlePlayerClick = (playerId: string, position?: number) => {
    // For serve actions, only allow the serving player
    if (isServeAction && playerId !== servingPlayerId) {
      return
    }
    // For block point actions, only allow front row players
    if (actionType === 'punto_bloqueo' && position) {
      if (position !== 4 && position !== 3 && position !== 2) {
        return
      }
    }

    onSelectPlayer(playerId)
    onClose()
  }

  const isPlayerSelectable = (playerId: string, position?: number) => {
    if (isServeAction) {
      return playerId === servingPlayerId
    }
    // For block point actions, only allow front row players (positions 4, 3, 2)
    if (actionType === 'punto_bloqueo' && position) {
      return position === 4 || position === 3 || position === 2
    }
    return true
  }



  const getActionTypeDisplay = (actionType: string) => {
    const actionMap: Record<string, string> = {
      'punto_saque': 'Punto de saque',
      'error_saque': 'Error de saque',
      'punto_ataque': 'Punto de ataque',
      'ataque_bloqueado': 'Ataque bloqueado',
      'error_ataque': 'Error de ataque',
      'punto_bloqueo': 'Punto de bloqueo',
      'error_recepcion': 'Error de recepción',
      'error_generico': 'Error genérico',
      'error_rival': 'Error rival',
      'punto_rival': 'Punto rival'
    }
    return actionMap[actionType] || actionType
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Selecciona la jugadora para la acción
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Display */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-900 text-center font-medium">
            {getActionTypeDisplay(actionType)}
          </p>
          {isServeAction && (
            <p className="text-xs text-orange-600 text-center mt-1">
              Solo puede seleccionar la jugadora que está sacando (zona 1)
            </p>
          )}
          {actionType === 'punto_bloqueo' && (
            <p className="text-xs text-orange-600 text-center mt-1">
              Solo puede seleccionar jugadoras de línea delantera (zonas 4, 3, 2)
            </p>
          )}
        </div>

        {/* Player Selection Grid */}
        <div className="p-6">
          <LineupGrid
            players={displayRotationOrder.map((playerId, idx) => {
              const player = match.players.find(p => p.playerId === playerId)
              return {
                id: playerId || '',
                number: player?.number || 0,
                name: player?.name || '',
                position: player?.position || '',
                isLibero: player?.position === 'L',
                courtPosition: idx === 0 ? 1 : idx === 1 ? 2 : idx === 2 ? 3 : idx === 3 ? 4 : idx === 4 ? 5 : 6 // Map 0-indexed displayRotationOrder to 1-6 court positions
              }
            })}
            onPlayerClick={(playerId, position) => handlePlayerClick(playerId, position)}
            disabledPlayerIds={displayRotationOrder.filter((playerId, idx) =>
              playerId && !isPlayerSelectable(playerId, idx === 3 ? 4 : idx === 2 ? 3 : idx === 1 ? 2 : idx === 4 ? 5 : idx === 5 ? 6 : 1)
            ) as string[]}

            servingPlayerId={currentRotationOrder[0]}
            showCourtLines={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}