import { useState, useEffect } from 'react'
import { playerEvaluationService, PlayerEvaluationDB } from '@/services/playerEvaluationService'
import { supabase } from '@/lib/supabaseClient'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { getRatingLabel } from '@/constants/evaluationScale'
import { Calendar, Award, TrendingUp, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

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
    const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())

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

    const toggleExpand = (reportId: string) => {
        const newExpanded = new Set(expandedReports)
        if (newExpanded.has(reportId)) {
            newExpanded.delete(reportId)
        } else {
            newExpanded.add(reportId)
        }
        setExpandedReports(newExpanded)
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

    const getRatingColor = (rating: number | null | undefined) => {
        if (rating === null || rating === undefined) return 'bg-gray-600'
        const roundedRating = Math.round(rating)
        if (roundedRating <= 1) return 'bg-red-500'
        if (roundedRating === 2) return 'bg-orange-500'
        if (roundedRating === 3) return 'bg-yellow-500'
        if (roundedRating === 4) return 'bg-lime-500'
        return 'bg-green-600' // 5 - darker green
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
        <div className="space-y-4">
            {/* Header Stats - More Compact */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800 dark border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-semibold text-gray-400">TOTAL</h3>
                    </div>
                    <p className="text-2xl font-bold text-white">{evaluations.length}</p>
                </div>

                <div className="bg-gray-800 dark border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-green-400" />
                        <h3 className="text-xs font-semibold text-gray-400">TEMPORADAS</h3>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {new Set(evaluations.map(e => e.season_id)).size}
                    </p>
                </div>

                <div className="bg-gray-800 dark border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        <h3 className="text-xs font-semibold text-gray-400">ÚLTIMA</h3>
                    </div>
                    <p className="text-xs font-medium text-white">
                        {new Date(evaluations[0].created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit'
                        })}
                    </p>
                </div>
            </div>

            {/* Compact Evaluation Cards */}
            <div className="space-y-2">
                {Object.values(groupedBySeasonTeam).flatMap(({ season, team, evaluations: groupEvals }) =>
                    groupEvals.sort((a, b) => {
                        const phaseOrder: Record<string, number> = { start: 1, mid: 2, end: 3 }
                        return phaseOrder[a.phase] - phaseOrder[b.phase]
                    }).map((evaluation) => {
                        const isExpanded = expandedReports.has(evaluation.id)
                        const avgRating = getAverageRating(evaluation)

                        return (
                            <div
                                key={evaluation.id}
                                className="bg-gray-800 dark border border-gray-700 rounded-lg overflow-hidden transition-all"
                            >
                                {/* Compact Header - Always Visible */}
                                <button
                                    onClick={() => toggleExpand(evaluation.id)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700/30 transition-colors text-left"
                                >
                                    {/* Team Badge */}
                                    <div className="flex-shrink-0">
                                        <div className="text-xs font-semibold text-primary-400">{team}</div>
                                        <div className="text-xs text-gray-500">{season}</div>
                                    </div>

                                    {/* Phase Badge */}
                                    <span className="flex-shrink-0 px-2 py-1 bg-primary-500/20 text-primary-300 rounded text-xs font-medium border border-primary-500/30">
                                        {getPhaseLabel(evaluation.phase)}
                                    </span>

                                    {/* Date */}
                                    <div className="flex-shrink-0 text-xs text-gray-400 w-20">
                                        {new Date(evaluation.created_at).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit'
                                        })}
                                    </div>

                                    {/* Role */}
                                    <div className="flex-shrink-0 text-xs text-gray-300 w-24">
                                        {getRoleLabel(evaluation.role_in_team)}
                                    </div>

                                    {/* Average */}
                                    <div className="flex-shrink-0 text-sm font-semibold text-white w-12">
                                        {avgRating.toFixed(1)}/5
                                    </div>

                                    {/* Mini Skill Indicators - Labeled Badges */}
                                    <div className="flex gap-1 flex-1 flex-wrap">
                                        <div
                                            className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${getRatingColor(evaluation.service_rating)}`}
                                            title={`Servicio: ${evaluation.service_rating || 0}/5 - ${getRatingLabel(evaluation.service_rating || 0)}`}
                                        >
                                            Servicio
                                        </div>
                                        <div
                                            className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${getRatingColor(evaluation.reception_rating)}`}
                                            title={`Recepción: ${evaluation.reception_rating || 0}/5 - ${getRatingLabel(evaluation.reception_rating || 0)}`}
                                        >
                                            Recepción
                                        </div>
                                        <div
                                            className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${getRatingColor(evaluation.attack_rating)}`}
                                            title={`Ataque: ${evaluation.attack_rating || 0}/5 - ${getRatingLabel(evaluation.attack_rating || 0)}`}
                                        >
                                            Ataque
                                        </div>
                                        <div
                                            className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${getRatingColor(evaluation.block_rating)}`}
                                            title={`Bloqueo: ${evaluation.block_rating || 0}/5 - ${getRatingLabel(evaluation.block_rating || 0)}`}
                                        >
                                            Bloqueo
                                        </div>
                                        <div
                                            className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${getRatingColor(evaluation.defense_rating)}`}
                                            title={`Defensa: ${evaluation.defense_rating || 0}/5 - ${getRatingLabel(evaluation.defense_rating || 0)}`}
                                        >
                                            Defensa
                                        </div>
                                        <div
                                            className={`px-1.5 py-0.5 rounded text-white text-xs font-semibold ${getRatingColor(evaluation.error_impact_rating)}`}
                                            title={`Imp. Errores: ${evaluation.error_impact_rating || 0}/5 - ${getRatingLabel(evaluation.error_impact_rating || 0)}`}
                                        >
                                            Errores
                                        </div>
                                    </div>

                                    {/* Expand Icon */}
                                    <div className="flex-shrink-0 text-gray-400">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-4 py-2 border-t border-gray-700 bg-gray-700/20">
                                        {/* Compact Inline Ratings Grid - 3 columns */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 mb-2">
                                            {/* Servicio */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400 w-16 flex-shrink-0">Servicio</span>
                                                <span className="text-white text-sm">{getRatingStars(evaluation.service_rating)}</span>
                                                {evaluation.service_rating && (
                                                    <span className="text-gray-500 text-xs truncate">
                                                        {getRatingLabel(evaluation.service_rating)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Recepción */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400 w-16 flex-shrink-0">Recepción</span>
                                                <span className="text-white text-sm">{getRatingStars(evaluation.reception_rating)}</span>
                                                {evaluation.reception_rating && (
                                                    <span className="text-gray-500 text-xs truncate">
                                                        {getRatingLabel(evaluation.reception_rating)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Ataque */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400 w-16 flex-shrink-0">Ataque</span>
                                                <span className="text-white text-sm">{getRatingStars(evaluation.attack_rating)}</span>
                                                {evaluation.attack_rating && (
                                                    <span className="text-gray-500 text-xs truncate">
                                                        {getRatingLabel(evaluation.attack_rating)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Bloqueo */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400 w-16 flex-shrink-0">Bloqueo</span>
                                                <span className="text-white text-sm">{getRatingStars(evaluation.block_rating)}</span>
                                                {evaluation.block_rating && (
                                                    <span className="text-gray-500 text-xs truncate">
                                                        {getRatingLabel(evaluation.block_rating)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Defensa */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400 w-16 flex-shrink-0">Defensa</span>
                                                <span className="text-white text-sm">{getRatingStars(evaluation.defense_rating)}</span>
                                                {evaluation.defense_rating && (
                                                    <span className="text-gray-500 text-xs truncate">
                                                        {getRatingLabel(evaluation.defense_rating)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Imp. Errores */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-gray-400 w-16 flex-shrink-0">Imp. Err.</span>
                                                <span className="text-white text-sm">{getRatingStars(evaluation.error_impact_rating)}</span>
                                                {evaluation.error_impact_rating && (
                                                    <span className="text-gray-500 text-xs truncate">
                                                        {getRatingLabel(evaluation.error_impact_rating)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Unified Comments Block */}
                                        {(evaluation.competitive_mindset || evaluation.coach_recommendation) && (
                                            <div className="space-y-1 pt-2 border-t border-gray-700/50">
                                                {evaluation.competitive_mindset && (
                                                    <div className="flex gap-2">
                                                        <span className="text-xs text-gray-400 flex-shrink-0">Mentalidad:</span>
                                                        <p className="text-xs text-gray-300 italic">"{evaluation.competitive_mindset}"</p>
                                                    </div>
                                                )}
                                                {evaluation.coach_recommendation && (
                                                    <div className="flex gap-2">
                                                        <span className="text-xs text-gray-400 flex-shrink-0">Coach:</span>
                                                        <p className="text-xs text-gray-300 italic">"{evaluation.coach_recommendation}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
