import { MatchPlayer } from '../stores/matchStore'
import { Users } from 'lucide-react'

interface PlayerListProps {
  players: MatchPlayer[]
  onDragStart: (playerId: string) => void
  onDragEnd: () => void
  isDragging: string | null
}

export function PlayerList({ players, onDragStart, onDragEnd, isDragging }: PlayerListProps) {
  const getPositionColor = (position: string) => {
    switch (position) {
      case 'S': return 'bg-blue-100 text-blue-800'
      case 'OH': return 'bg-green-100 text-green-800'
      case 'MB': return 'bg-yellow-100 text-yellow-800'
      case 'OPP': return 'bg-purple-100 text-purple-800'
      case 'L': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPositionName = (position: string) => {
    switch (position) {
      case 'S': return 'S'
      case 'OH': return 'OH'
      case 'MB': return 'MB'
      case 'OPP': return 'OPP'
      case 'L': return 'L'
      default: return position
    }
  }

  return (
    <div className="bg-white rounded-lg p-4">

      {players.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Todas las jugadoras están asignadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
          {players.map((player) => (
            <div
              key={player.playerId}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', player.playerId)
                onDragStart(player.playerId)
              }}
              onDragEnd={onDragEnd}
              className={`
                p-2 border rounded-lg cursor-move transition-all flex items-center gap-3
                ${isDragging === player.playerId
                  ? 'border-primary-500 bg-primary-50 scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              title={`Arrastra ${player.name} a una posición del campo`}
            >
              {/* Player Number Circle */}
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white flex-shrink-0">
                {player.number}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm truncate">{player.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${getPositionColor(player.position)}`}>
                    {getPositionName(player.position)}
                  </span>
                  {player.starter && (
                    <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">TITULAR</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}