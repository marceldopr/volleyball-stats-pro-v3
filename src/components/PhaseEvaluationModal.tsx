import { useState } from 'react'
import { X, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { PhaseEvaluationDB } from '@/services/phaseEvaluationService'

interface PhaseEvaluationModalProps {
    isOpen: boolean
    onClose: () => void
    phase: {
        id: string
        phase_number: number
        phase_name: string
        team_id: string
        season_id: string
    }
    existingEvaluation: PhaseEvaluationDB | null
    onSave: (evaluation: {
        status: 'Cumplido' | 'Parcial' | 'No Cumplido'
        reasons: string
        match_impact: string
        next_adjustments: string
        dominant_weakness: string
        trend: 'improving' | 'declining' | 'stable'
    }) => Promise<void>
}

export function PhaseEvaluationModal({
    isOpen,
    onClose,
    phase,
    existingEvaluation,
    onSave
}: PhaseEvaluationModalProps) {
    const [status, setStatus] = useState<'Cumplido' | 'Parcial' | 'No Cumplido' | ''>(
        existingEvaluation?.status || ''
    )
    const [reasons, setReasons] = useState(existingEvaluation?.reasons || '')
    const [matchImpact, setMatchImpact] = useState(existingEvaluation?.match_impact || '')
    const [nextAdjustments, setNextAdjustments] = useState(existingEvaluation?.next_adjustments || '')
    const [dominantWeakness, setDominantWeakness] = useState(existingEvaluation?.dominant_weakness || '')
    const [trend, setTrend] = useState<'improving' | 'declining' | 'stable' | ''>(existingEvaluation?.trend || '')
    const [saving, setSaving] = useState(false)

    if (!isOpen) return null

    const handleSave = async () => {
        if (!status || !reasons.trim() || !nextAdjustments.trim() || !dominantWeakness.trim() || !trend) {
            alert('Por favor, completa todos los campos obligatorios')
            return
        }

        setSaving(true)
        try {
            await onSave({
                status,
                reasons: reasons.trim(),
                match_impact: matchImpact.trim(),
                next_adjustments: nextAdjustments.trim(),
                dominant_weakness: dominantWeakness.trim(),
                trend
            })
            onClose()
        } catch (error) {
            console.error('Error saving evaluation:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            Evaluar Fase {phase.phase_number} — {phase.phase_name}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Captura el resultado de la fase y los ajustes para la siguiente
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* 1️⃣ Estado de cumplimiento */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-3">
                            1️⃣ ¿Se ha cumplido el objetivo de la fase? *
                        </label>
                        <div className="space-y-2">
                            <button
                                onClick={() => setStatus('Cumplido')}
                                className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${status === 'Cumplido'
                                    ? 'border-green-500 bg-green-900/20'
                                    : 'border-gray-700 hover:border-green-500/50 bg-gray-900'
                                    }`}
                            >
                                <CheckCircle className={`w-5 h-5 ${status === 'Cumplido' ? 'text-green-500' : 'text-gray-500'}`} />
                                <span className={`font-medium ${status === 'Cumplido' ? 'text-green-400' : 'text-gray-300'}`}>
                                    ✔️ Cumplido
                                </span>
                            </button>
                            <button
                                onClick={() => setStatus('Parcial')}
                                className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${status === 'Parcial'
                                    ? 'border-yellow-500 bg-yellow-900/20'
                                    : 'border-gray-700 hover:border-yellow-500/50 bg-gray-900'
                                    }`}
                            >
                                <AlertCircle className={`w-5 h-5 ${status === 'Parcial' ? 'text-yellow-500' : 'text-gray-500'}`} />
                                <span className={`font-medium ${status === 'Parcial' ? 'text-yellow-400' : 'text-gray-300'}`}>
                                    ⚠️ Parcial
                                </span>
                            </button>
                            <button
                                onClick={() => setStatus('No Cumplido')}
                                className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${status === 'No Cumplido'
                                    ? 'border-red-500 bg-red-900/20'
                                    : 'border-gray-700 hover:border-red-500/50 bg-gray-900'
                                    }`}
                            >
                                <XCircle className={`w-5 h-5 ${status === 'No Cumplido' ? 'text-red-500' : 'text-gray-500'}`} />
                                <span className={`font-medium ${status === 'No Cumplido' ? 'text-red-400' : 'text-gray-300'}`}>
                                    ❌ No Cumplido
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 2️⃣ Motivos / Evidencias */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            2️⃣ ¿Qué factores han llevado a este resultado? *
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Ejemplos: "Recepción mejoró pero seguimos sufriendo zona 1" · "Central 2 más consistente"
                        </p>
                        <textarea
                            value={reasons}
                            onChange={(e) => setReasons(e.target.value)}
                            placeholder="Describe los factores principales (máximo 3-6 líneas)"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">{reasons.length}/500 caracteres</p>
                    </div>

                    {/* 3️⃣ Impacto observado en partido */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            3️⃣ ¿En qué situaciones lo notaste o apareció?
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Ejemplos: "Contra rivales altos sufrimos mucho" · "Bloqueo mejor cuando entró L2"
                        </p>
                        <textarea
                            value={matchImpact}
                            onChange={(e) => setMatchImpact(e.target.value)}
                            placeholder="Describe situaciones reales de partido (máximo 3-6 líneas)"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">{matchImpact.length}/500 caracteres</p>
                    </div>

                    {/* 4️⃣ Ajustes para la siguiente fase */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            4️⃣ ¿Qué cambios aplicarás ahora? *
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Ejemplos: "Priorizar ataque rápido por centro" · "Trabajar recepción corta a zona 1"
                        </p>
                        <textarea
                            value={nextAdjustments}
                            onChange={(e) => setNextAdjustments(e.target.value)}
                            placeholder="Define los ajustes concretos para la siguiente fase (máximo 3-6 líneas)"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-500 mt-1">{nextAdjustments.length}/500 caracteres</p>
                    </div>

                    {/* 5️⃣ Problema Dominante */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            5️⃣ ¿Cuál es el problema dominante? *
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Identifica la mayor limitación real en una frase concisa (máx. 100 caracteres)
                        </p>
                        <input
                            type="text"
                            value={dominantWeakness}
                            onChange={(e) => setDominantWeakness(e.target.value)}
                            placeholder="Ej: Recepción corta débil"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            maxLength={100}
                        />
                        <p className="text-xs text-gray-500 mt-1">{dominantWeakness.length}/100 caracteres</p>
                    </div>

                    {/* 6️⃣ Tendencia */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-3">
                            6️⃣ ¿Cuál es la tendencia de evolución? *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setTrend('improving')}
                                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${trend === 'improving'
                                    ? 'border-green-500 bg-green-900/20'
                                    : 'border-gray-700 hover:border-green-500/50 bg-gray-900'
                                    }`}
                            >
                                <span className="text-2xl">↑</span>
                                <span className={`text-sm font-medium ${trend === 'improving' ? 'text-green-400' : 'text-gray-300'}`}>
                                    Mejorando
                                </span>
                            </button>
                            <button
                                onClick={() => setTrend('stable')}
                                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${trend === 'stable'
                                    ? 'border-gray-500 bg-gray-700'
                                    : 'border-gray-700 hover:border-gray-500 bg-gray-900'
                                    }`}
                            >
                                <span className="text-2xl">—</span>
                                <span className={`text-sm font-medium ${trend === 'stable' ? 'text-white' : 'text-gray-300'}`}>
                                    Estable
                                </span>
                            </button>
                            <button
                                onClick={() => setTrend('declining')}
                                className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${trend === 'declining'
                                    ? 'border-red-500 bg-red-900/20'
                                    : 'border-gray-700 hover:border-red-500/50 bg-gray-900'
                                    }`}
                            >
                                <span className="text-2xl">↓</span>
                                <span className={`text-sm font-medium ${trend === 'declining' ? 'text-red-400' : 'text-gray-300'}`}>
                                    Empeorando
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900">
                    <p className="text-xs text-gray-500">* Campos obligatorios</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="text-gray-300 hover:text-white hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-600"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving || !status || !reasons.trim() || !nextAdjustments.trim() || !dominantWeakness.trim() || !trend}
                        >
                            {saving ? 'Guardando...' : 'Guardar Evaluación'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
