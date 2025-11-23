import { X, AlertTriangle } from 'lucide-react'

interface LiberoValidationModalProps {
    isOpen: boolean
    onClose: () => void
    liberoCount: number
    onNavigateToTeams: () => void
    language?: 'ca' | 'es'
}

export function LiberoValidationModal({
    isOpen,
    onClose,
    liberoCount,
    onNavigateToTeams,
    language = 'es'
}: LiberoValidationModalProps) {
    if (!isOpen) return null

    const translations = {
        ca: {
            title: 'Massa líberos convocades',
            message: `Només es poden convocar 2 líberos per partit.\nActualment n'hi ha ${liberoCount}.\nSi us plau, ajusta les posicions de les jugadores abans de continuar.`,
            buttonTeams: 'Tornar a Equips',
            buttonClose: 'Tancar'
        },
        es: {
            title: 'Demasiadas líberos convocadas',
            message: `Solo se pueden convocar 2 líberos por partido.\nActualmente hay ${liberoCount}.\nPor favor, ajusta las posiciones de las jugadoras antes de continuar.`,
            buttonTeams: 'Volver a Equipos',
            buttonClose: 'Cerrar'
        }
    }

    const t = translations[language]

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-800 whitespace-pre-line">
                            {t.message}
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            {language === 'ca'
                                ? 'Pots canviar la posició de les jugadores a la pàgina d\'Equips.'
                                : 'Puedes cambiar la posición de las jugadoras en la página de Equipos.'}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="btn-outline"
                    >
                        {t.buttonClose}
                    </button>
                    <button
                        onClick={onNavigateToTeams}
                        className="btn-primary"
                    >
                        {t.buttonTeams}
                    </button>
                </div>
            </div>
        </div>
    )
}
