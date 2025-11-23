import { X } from 'lucide-react';
import { MatchPlayer } from '../stores/matchStore'
import { PlayerCard } from './PlayerCard'

interface PlayerSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectPlayer: (playerId: string) => void
    availablePlayers: MatchPlayer[]
    currentSelection?: string | null
    positionLabel: string
    isLiberoSlot?: boolean
}

export function PlayerSelectionModal({
    isOpen,
    onClose,
    onSelectPlayer,
    availablePlayers,
    currentSelection,
    positionLabel,
    isLiberoSlot = false,
}: PlayerSelectionModalProps) {
    if (!isOpen) return null

    const handlePlayerClick = (playerId: string) => {
        onSelectPlayer(playerId)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">{positionLabel}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Subtitle */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm text-gray-600">
                        {isLiberoSlot
                            ? 'Selecciona una líbero para esta posición'
                            : 'Selecciona una jugadora para esta posición'}
                    </p>
                </div>
                {/* Player Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {availablePlayers.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">
                                {isLiberoSlot ? 'No hay líberos disponibles' : 'No hay jugadoras disponibles'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availablePlayers.map((player) => {
                                const isSelected = currentSelection === player.playerId
                                return (
                                    <PlayerCard
                                        key={player.playerId}
                                        player={{
                                            id: player.playerId,
                                            number: player.number,
                                            name: player.name,
                                            position: player.position,
                                        }}
                                        size="medium"
                                        isSelected={isSelected}
                                        onClick={() => handlePlayerClick(player.playerId)}
                                    />
                                )
                            })}
                        </div>
                    )}
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
