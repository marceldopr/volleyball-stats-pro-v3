import type { CoachDB } from '@/types/Coach'

interface CoachResumenProps {
    coach: CoachDB
}

export function CoachResumen({ coach: _coach }: CoachResumenProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Resumen del Entrenador</h2>
                <p className="text-gray-400">
                    Componente de resumen en desarrollo. Aquí se mostrarán equipos actuales, última actividad y estadísticas básicas.
                </p>
            </div>
        </div>
    )
}
