import { useState, useEffect } from 'react'
import { X, Save, Eye } from 'lucide-react'
import type { PlayerDB } from '@/services/playerService'
import type { TeamDB } from '@/services/teamService'
import type { SeasonDB } from '@/services/seasonService'
import type { PlayerEvaluationDB, PlayerEvaluationInput } from '@/services/playerEvaluationService'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { RatingInput } from './RatingInput'

interface PlayerEvaluationModalProps {
    isOpen: boolean
    onClose: () => void
    player: PlayerDB
    team: TeamDB
    season: SeasonDB
    phase: 'start' | 'mid' | 'end'
    existingEvaluation?: PlayerEvaluationDB | null
    onSave: (data: PlayerEvaluationInput) => Promise<void>
    mode?: 'edit' | 'view'  // NEW: Determines if form is editable
}

const PHASE_LABELS = {
    start: 'Inicio de Temporada',
    mid: 'Mitad de Temporada',
    end: 'Final de Temporada'
}

const ROLE_OPTIONS = [
    { value: 'starter', label: 'Titular' },
    { value: 'rotation', label: 'Rotación' },
    { value: 'specialist', label: 'Especialista' },
    { value: 'development', label: 'En desarrollo' }
]

export function PlayerEvaluationModal({
    isOpen,
    onClose,
    player,
    team,
    season,
    phase,
    existingEvaluation,
    onSave,
    mode = 'edit'
}: PlayerEvaluationModalProps) {
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<Partial<PlayerEvaluationInput>>({
        service_rating: undefined,
        reception_rating: undefined,
        attack_rating: undefined,
        block_rating: undefined,
        defense_rating: undefined,
        error_impact_rating: undefined,
        role_in_team: undefined,
        competitive_mindset: '',
        coach_recommendation: ''
    })

    const isViewMode = mode === 'view'

    useEffect(() => {
        if (existingEvaluation) {
            setFormData({
                service_rating: existingEvaluation.service_rating,
                reception_rating: existingEvaluation.reception_rating,
                attack_rating: existingEvaluation.attack_rating,
                block_rating: existingEvaluation.block_rating,
                defense_rating: existingEvaluation.defense_rating,
                error_impact_rating: existingEvaluation.error_impact_rating,
                role_in_team: existingEvaluation.role_in_team,
                competitive_mindset: existingEvaluation.competitive_mindset || '',
                coach_recommendation: existingEvaluation.coach_recommendation || ''
            })
        } else {
            setFormData({
                service_rating: undefined,
                reception_rating: undefined,
                attack_rating: undefined,
                block_rating: undefined,
                defense_rating: undefined,
                error_impact_rating: undefined,
                role_in_team: undefined,
                competitive_mindset: '',
                coach_recommendation: ''
            })
        }
    }, [existingEvaluation, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isViewMode) return

        setSaving(true)

        try {
            await onSave({
                player_id: player.id,
                team_id: team.id,
                season_id: season.id,
                phase: phase,
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {isViewMode && (
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {isViewMode ? 'Ver Evaluación' : 'Evaluación'}: {PHASE_LABELS[phase]}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {player.first_name} {player.last_name} • {getTeamDisplayName(team)} • {season.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Block 1: Performance Ratings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Rendimiento (1-3)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RatingInput
                                label="Saque"
                                value={formData.service_rating}
                                onChange={(val) => setFormData({ ...formData, service_rating: val })}
                                disabled={isViewMode}
                            />
                            <RatingInput
                                label="Recepción"
                                value={formData.reception_rating}
                                onChange={(val) => setFormData({ ...formData, reception_rating: val })}
                                disabled={isViewMode}
                            />
                            <RatingInput
                                label="Ataque"
                                value={formData.attack_rating}
                                onChange={(val) => setFormData({ ...formData, attack_rating: val })}
                                disabled={isViewMode}
                            />
                            <RatingInput
                                label="Bloqueo"
                                value={formData.block_rating}
                                onChange={(val) => setFormData({ ...formData, block_rating: val })}
                                disabled={isViewMode}
                            />
                            <RatingInput
                                label="Defensa"
                                value={formData.defense_rating}
                                onChange={(val) => setFormData({ ...formData, defense_rating: val })}
                                disabled={isViewMode}
                            />
                            <RatingInput
                                label="Impacto de Errores"
                                value={formData.error_impact_rating}
                                onChange={(val) => setFormData({ ...formData, error_impact_rating: val })}
                                disabled={isViewMode}
                            />
                        </div>
                    </div>

                    {/* Block 2: Role */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Rol en el Equipo
                        </h3>
                        <select
                            value={formData.role_in_team || ''}
                            onChange={(e) => setFormData({ ...formData, role_in_team: e.target.value as any })}
                            className="input-field w-full"
                            disabled={isViewMode}
                        >
                            <option value="">Selecciona un rol</option>
                            {ROLE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Block 3: Competitive Mindset */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Mentalidad / Actitud Competitiva
                        </h3>
                        <div className="relative">
                            <textarea
                                value={formData.competitive_mindset}
                                onChange={(e) => setFormData({ ...formData, competitive_mindset: e.target.value })}
                                placeholder="Describe la mentalidad competitiva de la jugadora..."
                                className="input-field w-full"
                                rows={3}
                                maxLength={200}
                                disabled={isViewMode}
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                                {formData.competitive_mindset?.length || 0} / 200
                            </div>
                        </div>
                    </div>

                    {/* Block 4: Coach Recommendation */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                            Recomendaciones para Próximo Entrenador
                        </h3>
                        <div className="relative">
                            <textarea
                                value={formData.coach_recommendation}
                                onChange={(e) => setFormData({ ...formData, coach_recommendation: e.target.value })}
                                placeholder="Ej: Tiene potencial para subir a Juvenil si mantiene constancia en recepción"
                                className="input-field w-full"
                                rows={3}
                                maxLength={250}
                                disabled={isViewMode}
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                                {formData.coach_recommendation?.length || 0} / 250
                            </div>
                        </div>
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
                        {isViewMode ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!isViewMode && (
                        <button
                            onClick={handleSubmit}
                            className="btn-primary flex items-center gap-2"
                            disabled={saving}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Guardar Evaluación'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
