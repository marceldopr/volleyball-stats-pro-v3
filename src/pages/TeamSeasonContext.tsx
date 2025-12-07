import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Target, Users, Zap, FileText, Brain, Plus, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { seasonService } from '../services/seasonService'
import { teamService } from '../services/teamService'
import { teamSeasonContextService } from '../services/teamSeasonContextService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export function TeamSeasonContext() {
    const { teamId } = useParams<{ teamId: string }>()
    const navigate = useNavigate()
    const { profile } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [team, setTeam] = useState<any>(null)
    const [currentSeason, setCurrentSeason] = useState<any>(null)

    // Form state
    const [primaryGoal, setPrimaryGoal] = useState('')
    const [secondaryGoals, setSecondaryGoals] = useState<string[]>([])
    const [trainingFocus, setTrainingFocus] = useState<string[]>([])
    const [roleHierarchy, setRoleHierarchy] = useState('')
    const [defaultRotationNotes, setDefaultRotationNotes] = useState('')
    const [internalRules, setInternalRules] = useState<string[]>([])
    const [staffNotes, setStaffNotes] = useState('')

    // Temporary inputs for adding items
    const [newSecondaryGoal, setNewSecondaryGoal] = useState('')
    const [newTrainingFocus, setNewTrainingFocus] = useState('')
    const [newInternalRule, setNewInternalRule] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            if (!teamId || !profile?.club_id) return

            try {
                setLoading(true)

                // Get team
                const teamData = await teamService.getTeamById(teamId)
                setTeam(teamData)

                // Get current season
                const season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                setCurrentSeason(season)

                if (season) {
                    // Get existing context
                    const existingContext = await teamSeasonContextService.getContextByTeamAndSeason(teamId, season.id)

                    if (existingContext) {
                        setPrimaryGoal(existingContext.primary_goal || '')
                        setSecondaryGoals(existingContext.secondary_goals || [])
                        setTrainingFocus(existingContext.training_focus || [])
                        setRoleHierarchy(existingContext.role_hierarchy || '')
                        setDefaultRotationNotes(existingContext.default_rotation_notes || '')
                        setInternalRules(existingContext.internal_rules || [])
                        setStaffNotes(existingContext.staff_notes || '')
                    }
                }
            } catch (error) {
                console.error('Error loading team season context:', error)
                toast.error('Error al cargar el contexto de temporada')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [teamId, profile?.club_id])

    const handleSave = async () => {
        if (!teamId || !currentSeason) {
            toast.error('No se puede guardar: falta equipo o temporada')
            return
        }

        try {
            setSaving(true)

            await teamSeasonContextService.upsertContext({
                team_id: teamId,
                season_id: currentSeason.id,
                primary_goal: primaryGoal,
                secondary_goals: secondaryGoals,
                training_focus: trainingFocus,
                role_hierarchy: roleHierarchy,
                default_rotation_notes: defaultRotationNotes,
                internal_rules: internalRules,
                staff_notes: staffNotes,
            })

            toast.success('Contexto guardado correctamente')
        } catch (error) {
            console.error('Error saving context:', error)
            toast.error('Error al guardar el contexto')
        } finally {
            setSaving(false)
        }
    }

    const addSecondaryGoal = () => {
        if (newSecondaryGoal.trim()) {
            setSecondaryGoals([...secondaryGoals, newSecondaryGoal.trim()])
            setNewSecondaryGoal('')
        }
    }

    const removeSecondaryGoal = (index: number) => {
        setSecondaryGoals(secondaryGoals.filter((_, i) => i !== index))
    }

    const addTrainingFocus = () => {
        if (newTrainingFocus.trim()) {
            setTrainingFocus([...trainingFocus, newTrainingFocus.trim()])
            setNewTrainingFocus('')
        }
    }

    const removeTrainingFocus = (index: number) => {
        setTrainingFocus(trainingFocus.filter((_, i) => i !== index))
    }

    const addInternalRule = () => {
        if (newInternalRule.trim()) {
            setInternalRules([...internalRules, newInternalRule.trim()])
            setNewInternalRule('')
        }
    }

    const removeInternalRule = (index: number) => {
        setInternalRules(internalRules.filter((_, i) => i !== index))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-500">Cargando contexto de temporada...</div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Button
                        variant="secondary"
                        size="md"
                        icon={ArrowLeft}
                        onClick={() => navigate('/teams')}
                        className="mb-4"
                    >
                        Volver a Equipos
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Contexto de Temporada</h1>
                    <p className="text-gray-600 mt-1">
                        {team?.name} • {currentSeason?.name}
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    icon={Save}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

            {/* A) Objetivos de la temporada */}
            <div className="card">
                <div className="flex items-center gap-3 mb-4">
                    <Target className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-bold text-gray-900">Objetivos de la Temporada</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Objetivo Principal
                        </label>
                        <input
                            type="text"
                            value={primaryGoal}
                            onChange={(e) => setPrimaryGoal(e.target.value)}
                            placeholder="Ej: Entrar en fase de ascenso"
                            className="input-field w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Objetivos Secundarios
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newSecondaryGoal}
                                onChange={(e) => setNewSecondaryGoal(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addSecondaryGoal()}
                                placeholder="Ej: Consolidar recepción con remate de segundo tiempo"
                                className="input-field flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={Plus}
                                onClick={addSecondaryGoal}
                            >
                                {''}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {secondaryGoals.map((goal, index) => (
                                <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                    <span className="flex-1 text-gray-700">{goal}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={X}
                                        onClick={() => removeSecondaryGoal(index)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        {''}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* B) Roles y jerarquías */}
            <div className="card">
                <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-bold text-gray-900">Roles y Jerarquías</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Descripción de Roles
                        </label>
                        <textarea
                            value={roleHierarchy}
                            onChange={(e) => setRoleHierarchy(e.target.value)}
                            placeholder="Ej: Titulares por defecto: Colocadora 1, Centrales 2 y 3, Receptoras 4 y 5, Opuesta 6. Líbero 1 entra por Central 2."
                            className="input-field w-full"
                            rows={4}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Notas de Rotación Habitual
                        </label>
                        <textarea
                            value={defaultRotationNotes}
                            onChange={(e) => setDefaultRotationNotes(e.target.value)}
                            placeholder="Ej: Rotación preferente: 4-3 con colocadora en zona 1. Cambios habituales en zona 6."
                            className="input-field w-full"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* C) Prioridad técnica */}
            <div className="card">
                <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-bold text-gray-900">Prioridades Técnicas</h2>
                </div>

                <div>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={newTrainingFocus}
                            onChange={(e) => setNewTrainingFocus(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addTrainingFocus()}
                            placeholder="Ej: Recepción compacta, Bloqueo en zona 2"
                            className="input-field flex-1"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={Plus}
                            onClick={addTrainingFocus}
                        >
                            {''}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {trainingFocus.map((focus, index) => (
                            <div
                                key={index}
                                className="inline-flex items-center gap-2 bg-primary-100 text-primary-800 px-3 py-1.5 rounded-full text-sm font-medium"
                            >
                                <span>{focus}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={X}
                                    onClick={() => removeTrainingFocus(index)}
                                    className="hover:text-primary-900"
                                >
                                    {''}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* D) Reglas internas */}
            <div className="card">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-bold text-gray-900">Reglas Internas</h2>
                </div>

                <div>
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            value={newInternalRule}
                            onChange={(e) => setNewInternalRule(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addInternalRule()}
                            placeholder="Ej: 80% asistencia mínima"
                            className="input-field flex-1"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={Plus}
                            onClick={addInternalRule}
                        >
                            {''}
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {internalRules.map((rule, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                <span className="flex-1 text-gray-700">• {rule}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={X}
                                    onClick={() => removeInternalRule(index)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    {''}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* E) Notas del staff */}
            <div className="card">
                <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6 text-primary-600" />
                    <h2 className="text-xl font-bold text-gray-900">Notas del Staff</h2>
                </div>

                <div>
                    <textarea
                        value={staffNotes}
                        onChange={(e) => setStaffNotes(e.target.value)}
                        placeholder="Observaciones contextuales, perfil psicológico del grupo, ajustes previstos..."
                        className="input-field w-full"
                        rows={6}
                    />
                </div>
            </div>
        </div>
    )
}

