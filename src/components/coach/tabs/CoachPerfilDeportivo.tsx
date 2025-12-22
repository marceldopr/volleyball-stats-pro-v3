import type { CoachDB } from '@/types/Coach'

interface CoachPerfilDeportivoProps {
    coach: CoachDB
}

export function CoachPerfilDeportivo({ coach: _coach }: CoachPerfilDeportivoProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Perfil Deportivo</h2>
                <p className="text-gray-400">
                    Componente en desarrollo. Aquí se mostrarán titulaciones, especialidades y roles.
                </p>
            </div>
        </div>
    )
}
