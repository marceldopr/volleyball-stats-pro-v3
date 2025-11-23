import { useState } from 'react'
import { MatchPlayer } from '../stores/matchStore'

interface LiberoConfig {
  liberoId: string
  replacesPlayerId: string
  backRowPositions: number[]
}

interface LiberoManagementProps {
  players: MatchPlayer[]
  liberos: MatchPlayer[]
  liberoConfig: LiberoConfig[]
  onLiberoConfigChange: (config: LiberoConfig[]) => void
  getPlayerById: (playerId: string) => MatchPlayer | undefined
}

export function LiberoManagement({ 
  players, 
  liberos, 
  liberoConfig, 
  onLiberoConfigChange,
  getPlayerById
}: LiberoManagementProps) {
  const [selectedLibero, setSelectedLibero] = useState<string>('')
  const [selectedMB, setSelectedMB] = useState<string>('')
  const [selectedPositions, setSelectedPositions] = useState<number[]>([])

  const middleBlockers = players.filter(player => player.position === 'MB')
  const availableLiberos = liberos.filter(libero => 
    !liberoConfig.some(config => config.liberoId === libero.playerId)
  )

  const handleAddLiberoConfig = () => {
    if (selectedLibero && selectedMB && selectedPositions.length > 0) {
      const newConfig: LiberoConfig = {
        liberoId: selectedLibero,
        replacesPlayerId: selectedMB,
        backRowPositions: selectedPositions
      }
      onLiberoConfigChange([...liberoConfig, newConfig])
      
      // Reset form
      setSelectedLibero('')
      setSelectedMB('')
      setSelectedPositions([])
    }
  }

  const handleRemoveLiberoConfig = (liberoId: string) => {
    onLiberoConfigChange(liberoConfig.filter(config => config.liberoId !== liberoId))
  }

  const togglePosition = (position: number) => {
    setSelectedPositions(prev => 
      prev.includes(position) 
        ? prev.filter(p => p !== position)
        : [...prev, position]
    )
  }

  return (
    <div className="bg-white rounded-lg p-4">
      <h4 className="text-md font-medium text-gray-900 mb-3">Configuración del Líbero</h4>
      <p className="text-xs text-gray-600 mb-4">
        El líbero sustituye a un central en la línea de atrás según el reglamento oficial.
      </p>

      {/* Add new libero configuration */}
      {availableLiberos.length > 0 && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Líbero
              </label>
              <select
                value={selectedLibero}
                onChange={(e) => setSelectedLibero(e.target.value)}
                className="input w-full"
              >
                <option value="">Selecciona líbero...</option>
                {availableLiberos.map(libero => (
                  <option key={libero.playerId} value={libero.playerId}>
                    #{libero.number} {libero.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sustituye a (MB)
              </label>
              <select
                value={selectedMB}
                onChange={(e) => setSelectedMB(e.target.value)}
                className="input w-full"
              >
                <option value="">Selecciona central...</option>
                {middleBlockers.map(mb => (
                  <option key={mb.playerId} value={mb.playerId}>
                    #{mb.number} {mb.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posiciones traseras
              </label>
              <div className="flex space-x-2">
                {[1, 5, 6].map(pos => (
                  <button
                    key={pos}
                    onClick={() => togglePosition(pos)}
                    className={`
                      px-3 py-1 rounded text-sm font-medium transition-colors
                      ${selectedPositions.includes(pos)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleAddLiberoConfig}
            disabled={!selectedLibero || !selectedMB || selectedPositions.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Añadir configuración
          </button>
        </div>
      )}

      {/* Current libero configurations */}
      {liberoConfig.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-900">Configuraciones actuales:</h5>
          {liberoConfig.map((config, index) => {
            const libero = getPlayerById(config.liberoId)
            const mb = getPlayerById(config.replacesPlayerId)
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600">L</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      #{libero?.number} {libero?.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Sustituye a #{mb?.number} {mb?.name} en posiciones {config.backRowPositions.join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveLiberoConfig(config.liberoId)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Quitar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {liberos.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            No hay líberos en la convocatoria. El líbero es opcional según el reglamento.
          </p>
        </div>
      )}
    </div>
  )
}