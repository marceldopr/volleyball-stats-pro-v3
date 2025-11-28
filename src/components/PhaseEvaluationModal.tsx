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
    const [saving, setSaving] = useState(false)

    if (!isOpen) return null

    const handleSave = async () => {
        if (!status || !reasons.trim() || !nextAdjustments.trim()) {
            alert('Por favor, completa todos los campos obligatorios')
            return
        }

        setSaving(true)
        try {
            await onSave({
                status,
                reasons: reasons.trim(),
                match_impact: matchImpact.trim(),
                next_adjustments: nextAdjustments.trim()
            })
            onClose()
        } catch (error) {
            console.error('Error saving evaluation:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Evaluar Fase {phase.phase_number} — {phase.phase_name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Captura el resultado de la fase y los ajustes para la siguiente
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* 1️⃣ Estado de cumplimiento */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                            1️⃣ ¿Se ha cumplido el objetivo de la fase? *
                        </label>
                        <div className="space-y-2">
                            <button
                                onClick={() => setStatus('Cumplido')}
                                className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${status === 'Cumplido'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-green-300'
                                    }`}
                            >
                                <CheckCircle className={`w-5 h-5 ${status === 'Cumplido' ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${status === 'Cumplido' ? 'text-green-900' : 'text-gray-700'}`}>
                                    ✔️ Cumplido
                                </span>
                            </button>
                            <button
                                onClick={() => setStatus('Parcial')}
                                className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${status === 'Parcial'
                                        ? 'border-yellow-500 bg-yellow-50'
                                        : 'border-gray-200 hover:border-yellow-300'
                                    }`}
                            >
                                <AlertCircle className={`w-5 h-5 ${status === 'Parcial' ? 'text-yellow-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${status === 'Parcial' ? 'text-yellow-900' : 'text-gray-700'}`}>
                                    ⚠️ Parcial
                                </span>
                            </button>
                            <button
                                onClick={() => setStatus('No Cumplido')}
                                className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${status === 'No Cumplido'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 hover:border-red-300'
                                    }`}
                            >
                                <XCircle className={`w-5 h-5 ${status === 'No Cumplido' ? 'text-red-600' : 'text-gray-400'}`} />
                                <span className={`font-medium ${status === 'No Cumplido' ? 'text-red-900' : 'text-gray-700'}`}>
                                    ❌ No Cumplido
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 2️⃣ Motivos / Evidencias */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            2️⃣ ¿Qué factores han llevado a este resultado? *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Ejemplos: "Recepción mejoró pero seguimos sufriendo zona 1" · "Central 2 más consistente"
                        </p>
                        <textarea
                            value={reasons}
                            onChange={(e) => setReasons(e.target.value)}
                            placeholder="Describe los factores principales (máximo 3-6 líneas)"
                            className="input-field w-full"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-400 mt-1">{reasons.length}/500 caracteres</p>
                    </div>

                    {/* 3️⃣ Impacto observado en partido */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            3️⃣ ¿En qué situaciones lo notaste o apareció?
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Ejemplos: "Contra rivales altos sufrimos mucho" · "Bloqueo mejor cuando entró L2"
                        </p>
                        <textarea
                            value={matchImpact}
                            onChange={(e) => setMatchImpact(e.target.value)}
                            placeholder="Describe situaciones reales de partido (máximo 3-6 líneas)"
                            className="input-field w-full"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-400 mt-1">{matchImpact.length}/500 caracteres</p>
                    </div>

                    {/* 4️⃣ Ajustes para la siguiente fase */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            4️⃣ ¿Qué cambios aplicarás ahora? *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Ejemplos: "Priorizar ataque rápido por centro" · "Trabajar recepción corta a zona 1"
                        </p>
                        <textarea
                            value={nextAdjustments}
                            onChange={(e) => setNextAdjustments(e.target.value)}
                            placeholder="Define los ajustes concretos para la siguiente fase (máximo 3-6 líneas)"
                            className="input-field w-full"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-400 mt-1">{nextAdjustments.length}/500 caracteres</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-500">* Campos obligatorios</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="btn-outline"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-primary"
                            disabled={saving || !status || !reasons.trim() || !nextAdjustments.trim()}
                        >
                            {saving ? 'Guardando...' : 'Guardar Evaluación'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
