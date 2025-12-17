import { useState, useEffect } from 'react'
import { playerEvaluationService, PlayerEvaluationDB } from '@/services/playerEvaluationService'
import { supabase } from '@/lib/supabaseClient'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { getRatingLabel } from '@/constants/evaluationScale'
import { Calendar, Users, Award, TrendingUp, MessageSquare } from 'lucide-react'

interface PlayerInformesProps {
    playerId: string
}

interface EvaluationWithDetails extends PlayerEvaluationDB {
    teams?: { custom_name: string; category: string; category_stage: string; gender: string; club_id: string }
    seasons?: { name: string }
    coach?: { full_name: string }
}

export function PlayerInformes({ playerId }: PlayerInformesProps) {
    const [evaluations, setEvaluations] = useState<EvaluationWithDetails[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadEvaluations()
    }, [playerId])

    const loadEvaluations = async () => {
        try {
            setLoading(true)
            const data = await playerEvaluationService.getPlayerEvaluationHistory(playerId) as EvaluationWithDetails[]

            console.log('[PlayerInformes] Raw evaluations:', data)

            // Always fetch teams, seasons, and coaches manually
            if (data.length > 0) {
                const teamIds = [...new Set(data.map(e => e.team_id))]
                const seasonIds = [...new Set(data.map(e => e.season_id))]

                console.log('[PlayerInformes] Fetching teams:', teamIds, 'seasons:', seasonIds)

                // Fetch teams
                const { data: teamsData, error: teamsError } = await supabase
                    .from('teams')
                    .select('id, custom_name, category, category_stage, gender, club_id')
                    .in('id', teamIds)

                console.log('[PlayerInformes] Teams:', teamsData, 'error:', teamsError)

                // Fetch seasons
                const { data: seasonsData } = await supabase
                    .from('seasons')
                    .select('id, name')
                    .in('id', seasonIds)

                console.log('[PlayerInformes] Seasons:', seasonsData)

                // Fetch coach assignments
                const { data: coachAssignments } = await supabase
                    .from('coach_team_assignments')
                    .select('team_id, season_id, user_id')
                    .in('team_id', teamIds)
                    .in('season_id', seasonIds)

                console.log('[PlayerInformes] Coach assignments:', coachAssignments)

                // Get coach profiles
                const coachUserIds = [...new Set((coachAssignments || []).map(ca => ca.user_id))]
                let coachProfiles: { id: string; full_name: string }[] = []
                if (coachUserIds.length > 0) {
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', coachUserIds)
                    coachProfiles = profilesData || []
                }

                console.log('[PlayerInformes] Coach profiles:', coachProfiles)

                // Create maps
                const teamMap = new Map((teamsData || []).map(t => [t.id, t]))
                const seasonMap = new Map((seasonsData || []).map(s => [s.id, s]))
                const coachProfileMap = new Map(coachProfiles.map(p => [p.id, p]))
                const coachMap = new Map(
                    (coachAssignments || []).map(ca => [`${ca.team_id}|${ca.season_id}`, ca.user_id])
                )

                // Enrich evaluations
                data.forEach(evaluation => {
                    const team = teamMap.get(evaluation.team_id)
                    const season = seasonMap.get(evaluation.season_id)
                    const coachUserId = coachMap.get(`${evaluation.team_id}|${evaluation.season_id}`)
                    const coachProfile = coachUserId ? coachProfileMap.get(coachUserId) : null

                    evaluation.teams = team || undefined
                    evaluation.seasons = season || undefined
                    evaluation.coach = coachProfile || undefined
                })

                console.log('[PlayerInformes] Enriched evaluations:', data)
            }

            setEvaluations(data)
        } catch (error) {
            console.error('Error loading evaluations:', error)
        } finally {
            setLoading(false)
        }
    }

    const getPhaseLabel = (phase: string) => {
        const labels: Record<string, string> = {
            start: 'Inicio',
            mid: 'Mitad',
            end: 'Final'
        }
        return labels[phase] || phase
    }

    const getRoleLabel = (role?: string) => {
        const labels: Record<string, string> = {
            starter: 'Titular',
            rotation: 'Rotación',
            specialist: 'Especialista',
            development: 'Desarrollo'
        }
        return role ? labels[role] || role : '—'
    }

    const getRatingStars = (rating?: number | null) => {
        if (rating === null || rating === undefined) return '☆☆☆☆☆'
        const validRating = Math.max(0, Math.min(5, rating))
        return '⭐'.repeat(validRating) + '☆'.repeat(5 - validRating)
    }

    const getAverageRating = (evaluation: PlayerEvaluationDB) => {
        const ratings = [
            evaluation.service_rating,
            evaluation.reception_rating,
            evaluation.attack_rating,
            evaluation.block_rating,
            evaluation.defense_rating,
            evaluation.error_impact_rating
        ].filter(r => r !== null && r !== undefined) as number[]

        if (ratings.length === 0) return 0
        return ratings.reduce((a, b) => a + b, 0) / ratings.length
    }

    // Group by season
    const groupedBySeasonTeam = evaluations.reduce((acc, evaluation) => {
        const seasonName = evaluation.seasons?.name || 'Temporada desconocida'
        const teamName = evaluation.teams ? getTeamDisplayName(evaluation.teams) : 'Equipo desconocido'
        const coachName = evaluation.coach?.full_name || 'Sin asignar'
        const key = `${seasonName}|${teamName}`

        if (!acc[key]) {
            acc[key] = {
                season: seasonName,
                team: teamName,
                coachName: coachName,
                category: evaluation.teams?.category || '',
                evaluations: []
            }
        }
        acc[key].evaluations.push(evaluation)
        return acc
    }, {} as Record<string, { season: string; team: string; coachName: string; category: string; evaluations: EvaluationWithDetails[] }>)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-400">Cargando evaluaciones...</div>
            </div>
        )
    }

    if (evaluations.length === 0) {
        return (
            <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sin evaluaciones</h3>
                <p className="text-gray-400">
                    Esta jugadora aún no tiene evaluaciones registradas.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Los coaches pueden crear evaluaciones desde la vista de equipo.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Award className="w-5 h-5 text-blue-400" />
                        <h3 className="font-semibold text-white">Total Evaluaciones</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{evaluations.length}</p>
                </div>

                <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-green-400" />
                        <h3 className="font-semibold text-white">Temporadas</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">
                        {new Set(evaluations.map(e => e.season_id)).size}
                    </p>
                </div>

                <div className="bg-gray-800 dark border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Última Evaluación</h3>
                    </div>
                    <p className="text-sm font-medium text-white">
                        {new Date(evaluations[0].created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </p>
                </div>
            </div>

            {/* Evaluations by Season/Team */}
            {Object.values(groupedBySeasonTeam).map(({ season, team, coachName, evaluations: groupEvals }) => (
                <div key={`${season}-${team}`} className="bg-gray-800 dark border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-5 h-5 text-primary-400" />
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white">{team}</h2>
                            <p className="text-sm text-gray-400">
                                {coachName} • {season}
                            </p>
                        </div>
                    </div>

                    {/* Phases */}
                    <div className="space-y-4">
                        {groupEvals.sort((a, b) => {
                            const phaseOrder: Record<string, number> = { start: 1, mid: 2, end: 3 }
                            return phaseOrder[a.phase] - phaseOrder[b.phase]
                        }).map((evaluation) => (
                            <div
                                key={evaluation.id}
                                className="bg-gray-700/30 border border-gray-600/30 rounded-lg p-4"
                            >
                                {/* Phase Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm font-medium border border-primary-500/30">
                                            {getPhaseLabel(evaluation.phase)}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            {new Date(evaluation.created_at).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-400">Promedio: </span>
                                        <span className="font-semibold text-white">
                                            {getAverageRating(evaluation).toFixed(1)}/5
                                        </span>
                                    </div>
                                </div>

                                {/* Ratings Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                    <div className="bg-gray-800/50 rounded p-2">
                                        <div className="text-xs text-gray-400 mb-1">Servicio</div>
                                        <div className="text-sm font-medium text-white">
                                            {getRatingStars(evaluation.service_rating)}
                                        </div>
                                        {evaluation.service_rating && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {getRatingLabel(evaluation.service_rating)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-800/50 rounded p-2">
                                        <div className="text-xs text-gray-400 mb-1">Recepción</div>
                                        <div className="text-sm font-medium text-white">
                                            {getRatingStars(evaluation.reception_rating)}
                                        </div>
                                        {evaluation.reception_rating && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {getRatingLabel(evaluation.reception_rating)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-800/50 rounded p-2">
                                        <div className="text-xs text-gray-400 mb-1">Ataque</div>
                                        <div className="text-sm font-medium text-white">
                                            {getRatingStars(evaluation.attack_rating)}
                                        </div>
                                        {evaluation.attack_rating && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {getRatingLabel(evaluation.attack_rating)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-800/50 rounded p-2">
                                        <div className="text-xs text-gray-400 mb-1">Bloqueo</div>
                                        <div className="text-sm font-medium text-white">
                                            {getRatingStars(evaluation.block_rating)}
                                        </div>
                                        {evaluation.block_rating && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {getRatingLabel(evaluation.block_rating)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-800/50 rounded p-2">
                                        <div className="text-xs text-gray-400 mb-1">Defensa</div>
                                        <div className="text-sm font-medium text-white">
                                            {getRatingStars(evaluation.defense_rating)}
                                        </div>
                                        {evaluation.defense_rating && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {getRatingLabel(evaluation.defense_rating)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-800/50 rounded p-2">
                                        <div className="text-xs text-gray-400 mb-1">Imp. Errores</div>
                                        <div className="text-sm font-medium text-white">
                                            {getRatingStars(evaluation.error_impact_rating)}
                                        </div>
                                        {evaluation.error_impact_rating && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {getRatingLabel(evaluation.error_impact_rating)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Role & Text Fields */}
                                {evaluation.role_in_team && (
                                    <div className="mb-3">
                                        <span className="text-xs text-gray-400">Rol en equipo: </span>
                                        <span className="text-sm font-medium text-white">
                                            {getRoleLabel(evaluation.role_in_team)}
                                        </span>
                                    </div>
                                )}

                                {evaluation.competitive_mindset && (
                                    <div className="mb-3">
                                        <div className="text-xs text-gray-400 mb-1">Mentalidad Competitiva</div>
                                        <p className="text-sm text-gray-300 italic">
                                            "{evaluation.competitive_mindset}"
                                        </p>
                                    </div>
                                )}

                                {evaluation.coach_recommendation && (
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Recomendación del Coach</div>
                                        <p className="text-sm text-gray-300 italic">
                                            "{evaluation.coach_recommendation}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
