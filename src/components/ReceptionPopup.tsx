import { useState } from 'react'
import { X, ArrowRightLeft } from 'lucide-react'
import { Match } from '../stores/matchStore'
import { LineupGrid } from './LineupGrid'

interface ReceptionPopupProps {
  isOpen: boolean
  onClose: () => void
  onSelectReception: (playerId: string | null, rating: number | null, isOpponentServiceError: boolean) => void
  onUndo?: () => void
  onRequestSubstitution?: () => void
  match: Match
  displayRotationOrder: (string | null)[]
  currentRotationOrder: string[]
}

export function ReceptionPopup({
  isOpen,
  onClose,
  onSelectReception,
  onUndo,
  onRequestSubstitution,
  match,
  displayRotationOrder,
  currentRotationOrder,
}: ReceptionPopupProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [showRatingStep, setShowRatingStep] = useState(false)

  if (!isOpen) return null

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayer(playerId)
    setShowRatingStep(true)
  }

  const handleOpponentServiceError = () => {
    // Opponent service error - no player selection, no rating
    onSelectReception(null, null, true)
    resetState()
  }

  const handleRatingClick = (rating: number) => {
    if (selectedPlayer) {
      onSelectReception(selectedPlayer, rating, false)
      resetState()
    }
  }

  const handleBackToPlayerSelection = () => {
    setSelectedPlayer(null)
    setShowRatingStep(false)
  }

  const resetState = () => {
    setSelectedPlayer(null)
    setShowRatingStep(false)
    onClose()
  }



  const getPlayerById = (playerId: string | null) => {
    if (!playerId) return null
    return match.players.find(p => p.playerId === playerId) || null
  }



  if (showRatingStep && selectedPlayer) {
    // Rating selection step
    const selectedPlayerData = getPlayerById(selectedPlayer)

    return (
      <div className="modal-overlay">
        <div className="modal-container max-w-md">
          {/* Header - Flex with Space Between */}
          <div className="modal-header flex justify-between items-center">
            <h3 className="modal-title">Calidad de recepción</h3>
            <button
              onClick={onUndo || resetState}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
              title="Deshacer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Player Info */}
          <div className="modal-body">
            <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Jugadora receptora:</p>
              <p className="font-bold text-gray-900 text-lg">
                #{selectedPlayerData?.number} {selectedPlayerData?.name}
              </p>
              <span className="badge-position mt-1 inline-block">
                {selectedPlayerData?.position}
              </span>
            </div>

            {/* Rating Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[0, 1, 2, 3, 4].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRatingClick(rating)}
                  className={`touch - target rounded - lg font - bold text - lg transition - all transform hover: scale - 105 ${rating === 0
                    ? 'bg-danger-500 hover:bg-danger-600 text-white'
                    : rating === 1
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : rating === 2
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : rating === 3
                          ? 'bg-primary-500 hover:bg-primary-600 text-white'
                          : 'bg-accent-500 hover:bg-accent-600 text-white'
                    } `}
                >
                  {rating}
                </button>
              ))}
            </div>

            {/* Rating descriptions */}
            <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
              <div><strong className="text-danger-600">0:</strong> Error de recepción (ace)</div>
              <div><strong className="text-orange-600">1:</strong> Mala recepción</div>
              <div><strong className="text-yellow-600">2:</strong> Recepción media</div>
              <div><strong className="text-primary-600">3:</strong> Buena recepción</div>
              <div><strong className="text-accent-600">4:</strong> Recepción perfecta</div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              onClick={handleBackToPlayerSelection}
              className="btn-secondary w-full"
            >
              Atrás
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Player selection step
  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-lg">
        {/* Header - Flex with Space Between */}
        <div className="modal-header flex justify-between items-center">
          <h3 className="modal-title">Selecciona jugadora</h3>
          <button
            onClick={resetState}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Selection Grid */}
        <div className="modal-body">
          <LineupGrid
            players={displayRotationOrder.map((playerId, idx) => {
              const player = getPlayerById(playerId)
              return {
                id: playerId || '',
                number: player?.number || 0,
                name: player?.name || '',
                position: player?.position || '',
                isLibero: player?.position === 'L',
                courtPosition: idx + 1
              }
            })}
            onPlayerClick={(playerId) => handlePlayerClick(playerId)}

            servingPlayerId={currentRotationOrder[0]}
            showCourtLines={false}
          />

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleOpponentServiceError}
              className="btn-action-success w-full touch-target"
            >
              Saque fallado rival
            </button>

            {/* Substitution Button */}
            {onRequestSubstitution && (
              <button
                onClick={onRequestSubstitution}
                className="btn-action-accent w-full touch-target flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Realizar sustitución</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            onClick={onUndo || resetState}
            className="btn-secondary w-full"
          >
            ↶ Deshacer
          </button>
        </div>
      </div>
    </div>
  )
}