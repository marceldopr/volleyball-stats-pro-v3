import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { playerReportService } from '@/services/playerReportService'
import { X } from 'lucide-react'

interface PlayerReportFormProps {
    playerId: string
    teamId: string
    seasonId: string
    matchId?: string
    onSaved?: () => void
    onCancel?: () => void
}

export function PlayerReportForm({
    playerId,
    teamId,
    seasonId,
    matchId,
    onSaved,
    onCancel
}: PlayerReportFormProps) {
    const { profile } = useAuthStore()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Technical section (1-5)
    const [serves, setServes] = useState(3)
    const [reception, setReception] = useState(3)
    const [attack, setAttack] = useState(3)
    const [block, setBlock] = useState(3)
    const [defense, setDefense] = useState(3)
    const [errorImpact, setErrorImpact] = useState(3)

    // Role section
    const [roleStatus, setRoleStatus] = useState<'titular' | 'rotacion' | 'suplente' | 'no_convocada'>('titular')

    // Attitude section (1-5)
    const [attendance, setAttendance] = useState(3)
    const [intensity, setIntensity] = useState(3)
    const [communication, setCommunication] = useState(3)
    const [adaptation, setAdaptation] = useState(3)

    // Recommendation section
    const [recommendation, setRecommendation] = useState<'mantener' | 'probar_superior' | 'trabajar_area' | 'reposo_tecnico'>('mantener')

    // Final comment
    const [finalComment, setFinalComment] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!profile?.club_id || !profile?.id) {
            setError('Error: No se pudo obtener la información del usuario')
            return
        }

        try {
            setSaving(true)

            await playerReportService.createReport({
                club_id: profile.club_id,
                player_id: playerId,
                team_id: teamId,
                season_id: seasonId,
                match_id: matchId || null,
                report_date: new Date().toISOString().split('T')[0],
                created_by: profile.id,
                sections: {
                    technical: {
                        serves,
                        reception,
                        attack,
                        block,
                        defense,
                        errorImpact
                    },
                    role: {
                        status: roleStatus
                    },
                    attitude: {
                        attendance,
                        intensity,
                        communication,
                        adaptation
                    },
                    recommendation: {
                        next: recommendation
                    }
                },
                final_comment: finalComment.trim() || undefined
            })

            onSaved?.()
        } catch (err) {
            console.error('[PlayerReportForm] Error al crear informe', err)
            setError('Error al guardar el informe. Por favor, inténtalo de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Nuevo Informe Estructurado</h3>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    type="button"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Technical Section */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Evaluación Técnica</h4>

                    <SliderField label="Saque" value={serves} onChange={setServes} />
                    <SliderField label="Recepción" value={reception} onChange={setReception} />
                    <SliderField label="Ataque" value={attack} onChange={setAttack} />
                    <SliderField label="Bloqueo" value={block} onChange={setBlock} />
                    <SliderField label="Defensa" value={defense} onChange={setDefense} />
                    <SliderField label="Impacto de Errores" value={errorImpact} onChange={setErrorImpact} />
                </div>

                {/* Role Section */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Rol en el Equipo</h4>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                        <select
                            value={roleStatus}
                            onChange={(e) => setRoleStatus(e.target.value as typeof roleStatus)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="titular">Titular</option>
                            <option value="rotacion">Rotación</option>
                            <option value="suplente">Suplente</option>
                            <option value="no_convocada">No Convocada</option>
                        </select>
                    </div>
                </div>

                {/* Attitude Section */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Actitud y Compromiso</h4>

                    <SliderField label="Asistencia / Compromiso" value={attendance} onChange={setAttendance} />
                    <SliderField label="Intensidad" value={intensity} onChange={setIntensity} />
                    <SliderField label="Comunicación" value={communication} onChange={setCommunication} />
                    <SliderField label="Adaptación" value={adaptation} onChange={setAdaptation} />
                </div>

                {/* Recommendation Section */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Recomendación</h4>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Próxima Acción</label>
                        <select
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value as typeof recommendation)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="mantener">Mantener</option>
                            <option value="probar_superior">Probar en Categoría Superior</option>
                            <option value="trabajar_area">Trabajar Área Específica</option>
                            <option value="reposo_tecnico">Reposo Técnico</option>
                        </select>
                    </div>
                </div>

                {/* Final Comment */}
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Comentario Final</h4>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observaciones ({finalComment.length}/200)
                        </label>
                        <textarea
                            value={finalComment}
                            onChange={(e) => setFinalComment(e.target.value.slice(0, 200))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px] resize-y"
                            placeholder="Comentarios adicionales sobre el rendimiento de la jugadora..."
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : 'Guardar Informe'}
                    </button>
                </div>
            </form>
        </div>
    )
}

// Helper component for slider fields
function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <span className="text-sm font-semibold text-primary-600">{value}</span>
            </div>
            <input
                type="range"
                min="1"
                max="5"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
            </div>
        </div>
    )
}
