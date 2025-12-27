import { FileText, Hammer } from 'lucide-react'

export function PlanningActivePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Temporada activa
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Planificación estratégica
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="bg-primary-50 dark:bg-primary-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Hammer className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Pronto
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Esta sección está en construcción. Aquí podrás gestionar la planificación activa de la temporada.
                    </p>
                </div>
            </div>
        </div>
    )
}
