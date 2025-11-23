import { MatchPlayer } from '../stores/matchStore'
import { PlayerCard } from './PlayerCard'

interface LiberoSlotProps {
  liberoId: string | null
  onLiberoClick: () => void
  getPlayerById: (playerId: string) => MatchPlayer | undefined
}

export function LiberoSlot({
  liberoId,
  onLiberoClick,
  getPlayerById
}: LiberoSlotProps) {
  const player = liberoId ? getPlayerById(liberoId) : undefined
  const isOccupied = !!player
  const isNotLibero = player && player.position !== 'L'

  return (
    <div className="flex justify-center">
      <button
        onClick={onLiberoClick}
        className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
        title={isOccupied ? `Cambiar líbero` : `Seleccionar líbero`}
      >
        {/* Occupied state - using PlayerCard */}
        {isOccupied && player && (
          <div className="flex flex-col items-center">
            <PlayerCard
              player={{
                id: player.playerId,
                number: player.number,
                name: player.name,
                position: player.position
              }}
              size="small"
            />

            {/* Warning if not libero */}
            {isNotLibero && (
              <div className="text-[10px] text-yellow-600 font-bold mt-1">
                ⚠️ No es L
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isOccupied && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-xl font-bold shadow-lg border-2 border-dashed border-gray-400 mb-1">
              +
            </div>
            <span className="px-2 py-0.5 rounded-full text-[7px] font-bold uppercase mb-0.5 bg-gray-100 text-gray-400">
              Líbero
            </span>
            <span className="text-[10px] font-bold text-gray-400 truncate max-w-[80px]">
              Seleccionar
            </span>
          </div>
        )}
      </button>
    </div>
  )
}