import { PlayerDB } from '@/services/playerService'
import { Users, AlertCircle, TrendingUp } from 'lucide-react'

interface PlayerResumenProps {
    player: PlayerDB
    currentSeason: { id: string } | null
    hasInjury: boolean
}

export function PlayerResumen({ player, currentSeason, hasInjury }: PlayerResumenProps) {
    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-primary-400" />
                        <h3 className="font-semibold text-white">Estado</h3>
                    </div>
                    <p className={`text-2xl font-bold ${player.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                        {player.is_active ? 'Activa' : 'Inactiva'}
                    </p>
                    {hasInjury && (
                        <p className="text-sm text-orange-400 mt-1 flex items-center gap-1">
                            🩹 Lesión activa
                        </p>
                    )}
                </div>

                <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <h3 className="font-semibold text-white">Temporada Actual</h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {currentSeason ? '2024/25' : '—'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {currentSeason ? 'En curso' : 'Sin temporada activa'}
                    </p>
                </div>

                <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Disponibilidad</h3>
                    </div>
                    <p className={`text-2xl font-bold ${!hasInjury && player.is_active ? 'text-green-400' : 'text-orange-400'
                        }`}>
                        {!hasInjury && player.is_active ? 'Disponible' : 'No disponible'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {hasInjury ? 'Por lesión' : !player.is_active ? 'Inactiva' : 'Para convocatorias'}
                    </p>
                </div>
            </div>

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
                            {player.main_position === 'OH' && 'Opuesta'}
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
