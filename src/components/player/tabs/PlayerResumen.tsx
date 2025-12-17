import { PlayerDB } from '@/services/playerService'

interface PlayerResumenProps {
    player: PlayerDB
}

export function PlayerResumen({ player }: PlayerResumenProps) {
    return (
        <div className="space-y-6">
            {/* Player Info Card */}
            <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Información Básica</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                    <div>
                        <span className="text-sm text-gray-400">Nombre completo:</span>
                        <p className="font-medium text-white">{player.first_name} {player.last_name}</p>
                    </div>
                    <div>
                        <span className="text-sm text-gray-400">Posición principal:</span>
                        <p className="font-medium text-white">
                            {player.main_position === 'OH' && 'Receptora'}
                            {player.main_position === 'MB' && 'Central'}
                            {player.main_position === 'S' && 'Colocadora'}
                            {player.main_position === 'L' && 'Líbero'}
                            {player.main_position === 'OPP' && 'Opuesta'}
                        </p>
                    </div>
                    {player.birth_date && (
                        <div>
                            <span className="text-sm text-gray-400">Fecha de nacimiento:</span>
                            <p className="font-medium text-white">
                                {new Date(player.birth_date).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    )}
                    {player.height_cm && (
                        <div>
                            <span className="text-sm text-gray-400">Altura:</span>
                            <p className="font-medium text-white">{player.height_cm} cm</p>
                        </div>
                    )}
                    {player.dominant_hand && (
                        <div>
                            <span className="text-sm text-gray-400">Mano dominante:</span>
                            <p className="font-medium text-white">
                                {player.dominant_hand === 'right' ? 'Diestra' : 'Zurda'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button className="text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white">
                        <div className="font-medium">Ver datos administrativos</div>
                        <div className="text-sm text-gray-400">Contacto y tutores</div>
                    </button>
                    <button className="text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white">
                        <div className="font-medium">Ver mediciones físicas</div>
                        <div className="text-sm text-gray-400">Altura, peso, salto</div>
                    </button>
                    <button className="text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white">
                        <div className="font-medium">Ver historial de lesiones</div>
                        <div className="text-sm text-gray-400">Lesiones registradas</div>
                    </button>
                    <button className="text-left px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white">
                        <div className="font-medium">Ver informes</div>
                        <div className="text-sm text-gray-400">Reportes técnicos</div>
                    </button>
                </div>
            </div>
        </div>
    )
}
