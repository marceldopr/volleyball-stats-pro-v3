import { Activity, AlertCircle, Heart, UserX, UserCheck, Users } from 'lucide-react'

export function SaludDisponibilidadPage() {
    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-8 h-8 text-primary-500" />
                        <h1 className="text-3xl font-bold text-white">Salud & Disponibilidad</h1>
                        <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium">
                            Pronto
                        </span>
                    </div>
                    <p className="text-gray-400">
                        Estado deportivo y disponibilidad de las jugadoras (no clínico).
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Heart className="w-5 h-5 text-red-400" />
                            <span className="text-sm font-medium text-red-400">Lesiones Activas</span>
                        </div>
                        <div className="text-3xl font-bold text-white">—</div>
                    </div>

                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <UserX className="w-5 h-5 text-orange-400" />
                            <span className="text-sm font-medium text-orange-400">No Disponibles</span>
                        </div>
                        <div className="text-3xl font-bold text-white">—</div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-400">Limitadas</span>
                        </div>
                        <div className="text-3xl font-bold text-white">—</div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <UserCheck className="w-5 h-5 text-green-400" />
                            <span className="text-sm font-medium text-green-400">Disponibles</span>
                        </div>
                        <div className="text-3xl font-bold text-white">—</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-900 rounded-lg p-6 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <select disabled className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed">
                            <option>Equipo</option>
                        </select>
                        <select disabled className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed">
                            <option>Estado</option>
                        </select>
                        <select disabled className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg border border-gray-700 opacity-50 cursor-not-allowed">
                            <option>Temporada</option>
                        </select>
                    </div>
                </div>

                {/* Table Placeholder */}
                <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Jugadora</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Equipo</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Estado</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Motivo</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Fecha Inicio</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Fecha Revisión</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-300">Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-12 h-12 text-gray-600" />
                                            <p className="text-gray-400">
                                                Aquí podrás ver y gestionar el estado de salud y disponibilidad de las jugadoras.
                                            </p>
                                            <p className="text-sm text-gray-500">Funcionalidad en desarrollo.</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex justify-center mb-8">
                    <button
                        disabled
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed flex items-center gap-2"
                    >
                        <Activity className="w-5 h-5" />
                        Registrar lesión / cambio de estado
                        <span className="bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded text-xs ml-2">
                            Pronto
                        </span>
                    </button>
                </div>

                {/* Info Message */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-white mb-1">
                                Gestión de salud deportiva
                            </h4>
                            <p className="text-gray-400 text-sm">
                                Esta sección permitirá llevar un registro del estado físico y disponibilidad
                                de las jugadoras para entrenamientos y partidos. No sustituye el seguimiento
                                médico profesional.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
