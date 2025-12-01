import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { PlayerDB } from '@/services/playerService'
import type { TeamDB } from '@/services/teamService'
import type { SeasonDB } from '@/services/seasonService'
import type { PlayerEvaluationDB, PlayerEvaluationInput } from '@/services/playerEvaluationService'

interface PlayerEvaluationModalProps {
    isOpen: boolean
    onClose: () => void
    player: PlayerDB
    team: TeamDB
    season: SeasonDB
    evaluationType: 'start' | 'mid' | 'end'
    existingEvaluation?: PlayerEvaluationDB | null
    onSave: (data: PlayerEvaluationInput) => Promise<void>
}

const EVALUATION_TYPE_LABELS = {
    start: 'Inicio de Temporada',
    mid: 'Mitad de Temporada',
    end: 'Final de Temporada'
}

const LEVEL_OPTIONS = [
    { value: 'below', label: 'Por debajo del nivel de la categoría' },
    { value: 'in_line', label: 'En línea con la categoría' },
    { value: 'above', label: 'Por encima de la categoría' }
]

const ROLE_OPTIONS = [
    { value: 'key_player', label: 'Pieza clave' },
    { value: 'rotation', label: 'Rotación importante' },
    { value: 'development', label: 'En desarrollo / soporte' }
]

export function PlayerEvaluationModal({
    isOpen,
    onClose,
    player,
    team,
    season,
    evaluationType,
    existingEvaluation,
    onSave
}: PlayerEvaluationModalProps) {
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<Partial<PlayerEvaluationInput>>({
        level_overall: undefined,
        tech_comment: '',
        tactic_comment: '',
        physical_comment: '',
        mental_comment: '',
        role_in_team: undefined,
        coach_recommendation: ''
    })

    useEffect(() => {
        if (existingEvaluation) {
            setFormData({
                level_overall: existingEvaluation.level_overall,
                tech_comment: existingEvaluation.tech_comment || '',
                tactic_comment: existingEvaluation.tactic_comment || '',
                physical_comment: existingEvaluation.physical_comment || '',
                mental_comment: existingEvaluation.mental_comment || '',
                role_in_team: existingEvaluation.role_in_team,
                coach_recommendation: existingEvaluation.coach_recommendation || ''
            })
        } else {
            setFormData({
                level_overall: undefined,
                tech_comment: '',
                tactic_comment: '',
                physical_comment: '',
                mental_comment: '',
                role_in_team: undefined,
                coach_recommendation: ''
            })
        }
    }, [existingEvaluation, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            await onSave({
                player_id: player.id,
                team_id: team.id,
                season_id: season.id,
                evaluation_type: evaluationType,
                ...formData
            } as PlayerEvaluationInput)
            onClose()
        } catch (error) {
            console.error('Error saving evaluation:', error)
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Evaluación: {EVALUATION_TYPE_LABELS[evaluationType]}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {player.first_name} {player.last_name} • {team.name} • {season.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Level Overall */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Nivel General
                        </label>
                        <select
                            value={formData.level_overall || ''}
                            onChange={(e) => setFormData({ ...formData, level_overall: e.target.value as any })}
                            className="input-field w-full"
                        >
                            <option value="">Selecciona un nivel</option>
                            {LEVEL_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Technical Comment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Técnica
                        </label>
                        <textarea
                            value={formData.tech_comment}
                            onChange={(e) => setFormData({ ...formData, tech_comment: e.target.value })}
                            placeholder="Ej: Buen saque flotante, mejorar recepción en línea 5"
                            className="input-field w-full"
                            rows={2}
                        />
                    </div>

                    {/* Tactical Comment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Táctica / Lectura de Juego
                        </label>
                        <textarea
                            value={formData.tactic_comment}
                            onChange={(e) => setFormData({ ...formData, tactic_comment: e.target.value })}
                            placeholder="Ej: Buena lectura de bloqueo, mejorar cobertura"
                            className="input-field w-full"
                            rows={2}
                        />
                    </div>

                    {/* Physical Comment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Físico / Condición
                        </label>
                        <textarea
                            value={formData.physical_comment}
                            onChange={(e) => setFormData({ ...formData, physical_comment: e.target.value })}
                            placeholder="Ej: Buena explosividad, trabajar resistencia"
                            className="input-field w-full"
                            rows={2}
                        />
                    </div>

                    {/* Mental Comment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Mentalidad / Actitud Competitiva
                        </label>
                        <textarea
                            value={formData.mental_comment}
                            onChange={(e) => setFormData({ ...formData, mental_comment: e.target.value })}
                            placeholder="Ej: Muy competitiva, gestionar mejor la frustración"
                            className="input-field w-full"
                            rows={2}
                        />
                    </div>

                    {/* Role in Team */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Rol en el Equipo
                        </label>
                        <select
                            value={formData.role_in_team || ''}
                            onChange={(e) => setFormData({ ...formData, role_in_team: e.target.value as any })}
                            className="input-field w-full"
                        >
                            <option value="">Selecciona un rol</option>
                            {ROLE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Coach Recommendation */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Recomendaciones para Próximo Entrenador
                        </label>
                        <textarea
                            value={formData.coach_recommendation}
                            onChange={(e) => setFormData({ ...formData, coach_recommendation: e.target.value })}
                            placeholder="Ej: Tiene potencial para subir a Juvenil si mantiene constancia en recepción"
                            className="input-field w-full"
                            rows={3}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="btn-primary flex items-center gap-2"
                        disabled={saving}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar Evaluación'}
                    </button>
                </div>
            </div>
        </div>
    )
}
