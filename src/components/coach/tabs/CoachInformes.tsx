import { BarChart } from 'lucide-react'

interface CoachInformesProps {
    coachId: string
}

export function CoachInformes({ coachId: _coachId }: CoachInformesProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
                <BarChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Informes en desarrollo</h3>
                <p className="text-gray-400">
                    El sistema de informes del DT sobre entrenadores se implementará en la siguiente fase.
                </p>
            </div>
        </div>
    )
}
