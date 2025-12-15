/**
 * RosterPlanningTab - Player-Team assignment for next season
 * 
 * Implements:
 * - Continuity pre-assignments from previous season
 * - Hard block: Cannot assign to lower category
 * - Soft warning: Can assign to higher category with override
 * - Bulk confirmation for valid continuities
 * - DB-based category calculation (source of truth from club_categories)
 */

import { useState, useEffect, useMemo } from 'react'
import { AlertCircle, Check, Users, X, AlertTriangle, Search, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TeamDB } from '@/services/teamService'
import { PlayerDB } from '@/services/playerService'
import { playerTeamSeasonService, PlayerTeamSeasonDB } from '@/services/playerTeamSeasonService'
import { categoryService, CategoryDB } from '@/services/categoryService'
import {
    getExpectedCategoryFromDB,
    validateAssignmentFromDB,
    getCategoryIndexFromDB,
    AssignmentStatus,
    CategoryResult
} from '@/utils/categoryUtils'
import { getTeamDisplayName } from '@/utils/teamDisplay'
import { toast } from 'sonner'

// Extended player info with assignment data
interface PlayerWithAssignment extends PlayerDB {
    expectedCategory: CategoryResult
    previousTeam: TeamDB | null
    previousTeamName: string | null
    previousTeamCategory: string | null
    proposedTeam: TeamDB | null
    assignedTeam: TeamDB | null
    status: AssignmentStatus
    assignmentId?: string
}

interface RosterPlanningTabProps {
    teams: TeamDB[]
    players: PlayerDB[]
    previousSeasonId: string | null
    nextSeasonId: string
    seasonStartDate: string
    clubId: string
}

type FilterType = 'all' | 'pending_confirmation' | 'pending' | 'needs_review' | 'exception' | 'assigned'

export function RosterPlanningTab({
    teams,
    players,
    previousSeasonId,
    nextSeasonId,
    seasonStartDate,
    clubId
}: RosterPlanningTabProps) {
    const [playerAssignments, setPlayerAssignments] = useState<Map<string, PlayerWithAssignment>>(new Map())
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithAssignment | null>(null)
    const [showAssignmentModal, setShowAssignmentModal] = useState(false)
    const [pendingWarning, setPendingWarning] = useState<{
        player: PlayerWithAssignment
        team: TeamDB
        message: string
    } | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<FilterType>('all')
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [loading, setLoading] = useState(true)
    const [categories, setCategories] = useState<CategoryDB[]>([])

    // Load categories and assignments
    useEffect(() => {
        async function loadData() {
            if (!clubId) return
            setLoading(true)
            try {
                // Load categories from DB (source of truth)
                const cats = await categoryService.getCategoriesByClub(clubId)
                setCategories(cats)

                // Get previous season assignments if available
                let previousAssignments: (PlayerTeamSeasonDB & { team?: any })[] = []
                if (previousSeasonId) {
                    previousAssignments = await playerTeamSeasonService.getPlayerAssignmentsBySeasonWithTeams(previousSeasonId)
                }
                const prevAssignmentMap = new Map(previousAssignments.map(a => [a.player_id, a]))

                // Get next season assignments if any exist
                let nextAssignments: (PlayerTeamSeasonDB & { team?: any })[] = []
                if (nextSeasonId) {
                    nextAssignments = await playerTeamSeasonService.getPlayerAssignmentsBySeasonWithTeams(nextSeasonId)
                }
                const nextAssignmentMap = new Map(nextAssignments.map(a => [a.player_id, a]))

                // Build player assignments state
                const assignmentsMap = new Map<string, PlayerWithAssignment>()

                for (const player of players) {
                    // Calculate expected category from DB (source of truth)
                    const expectedCategory = getExpectedCategoryFromDB(
                        player.birth_date,
                        seasonStartDate,
                        player.gender,
                        cats
                    )

                    const prevAssignment = prevAssignmentMap.get(player.id)
                    const nextAssignment = nextAssignmentMap.get(player.id)

                    // Previous team info
                    let previousTeam: TeamDB | null = null
                    let previousTeamCategory: string | null = null
                    let previousTeamName: string | null = null

                    if (prevAssignment?.team) {
                        previousTeam = teams.find(t =>
                            t.category_stage === prevAssignment.team.category_stage &&
                            t.gender === prevAssignment.team.gender
                        ) || null

                        // Normalize identifier if array (supabase join quirk)
                        const rawTeam = prevAssignment.team as any
                        const teamForDisplay = {
                            ...rawTeam,
                            identifier: Array.isArray(rawTeam.identifier) ? rawTeam.identifier[0] : rawTeam.identifier
                        }

                        previousTeamCategory = prevAssignment.team.category_stage
                        previousTeamName = getTeamDisplayName(teamForDisplay)
                    }

                    // Determine proposed team and status
                    let proposedTeam: TeamDB | null = null
                    let assignedTeam: TeamDB | null = null
                    let status: AssignmentStatus = 'pending'

                    if (nextAssignment) {
                        assignedTeam = teams.find(t => t.id === nextAssignment.team_id) || null
                        status = (nextAssignment.status as AssignmentStatus) || 'assigned'
                    } else if (previousTeam && previousTeamCategory && expectedCategory.found) {
                        // Check if continuity is valid using DB categories
                        const prevCategoryIndex = getCategoryIndexFromDB(previousTeamCategory, cats.filter(c => c.gender === player.gender))
                        const expectedIndex = getCategoryIndexFromDB(expectedCategory.name, cats.filter(c => c.gender === player.gender))

                        if (prevCategoryIndex >= expectedIndex) {
                            proposedTeam = previousTeam
                            status = 'pending_confirmation'
                        } else {
                            status = 'needs_review'
                            proposedTeam = teams.find(t =>
                                t.category_stage === expectedCategory.name &&
                                t.gender === player.gender
                            ) || null
                        }
                    } else {
                        status = 'pending'
                        proposedTeam = teams.find(t =>
                            t.category_stage === expectedCategory.name &&
                            t.gender === player.gender
                        ) || null
                    }

                    assignmentsMap.set(player.id, {
                        ...player,
                        expectedCategory,
                        previousTeam,
                        previousTeamCategory,
                        previousTeamName,
                        proposedTeam,
                        assignedTeam,
                        status,
                        assignmentId: nextAssignment?.id
                    })
                }

                setPlayerAssignments(assignmentsMap)
            } catch (error) {
                console.error('Error loading data:', error)
                toast.error('Error al cargar datos')
            } finally {
                setLoading(false)
            }
        }

        if (players.length > 0 && clubId) {
            loadData()
        }
    }, [players, teams, previousSeasonId, nextSeasonId, seasonStartDate, clubId])

    // Filter players
    const filteredPlayers = useMemo(() => {
        return Array.from(playerAssignments.values()).filter(player => {
            const matchesSearch = searchQuery === '' ||
                `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = filterStatus === 'all' || player.status === filterStatus
            const matchesCategory = filterCategory === 'all' ||
                player.expectedCategory.name === filterCategory
            return matchesSearch && matchesStatus && matchesCategory
        })
    }, [playerAssignments, searchQuery, filterStatus, filterCategory])

    // Stats
    const stats = useMemo(() => {
        const all = Array.from(playerAssignments.values())
        return {
            total: all.length,
            pendingConfirmation: all.filter(p => p.status === 'pending_confirmation').length,
            pending: all.filter(p => p.status === 'pending').length,
            needsReview: all.filter(p => p.status === 'needs_review').length,
            assigned: all.filter(p => p.status === 'assigned').length,
            exception: all.filter(p => p.status === 'exception').length
        }
    }, [playerAssignments])

    // Get unique categories
    const availableCategories = useMemo(() => {
        const cats = new Set(Array.from(playerAssignments.values()).map(p => p.expectedCategory.name))
        return Array.from(cats).filter(c => c !== 'Sin categoría definida').sort()
    }, [playerAssignments])

    // Assign player to team
    const assignToTeam = (player: PlayerWithAssignment, team: TeamDB, withOverride = false) => {
        const validation = validateAssignmentFromDB(
            player.birth_date,
            player.gender,
            seasonStartDate,
            team.category_stage,
            categories
        )

        if (validation.type === 'blocked') {
            toast.error(validation.message)
            return
        }

        if (validation.type === 'warning' && !withOverride) {
            setPendingWarning({ player, team, message: validation.message })
            return
        }

        const newStatus: AssignmentStatus = validation.type === 'warning' ? 'exception' : 'assigned'
        const updated = new Map(playerAssignments)
        updated.set(player.id, {
            ...player,
            assignedTeam: team,
            status: newStatus
        })
        setPlayerAssignments(updated)

        setShowAssignmentModal(false)
        setSelectedPlayer(null)
        setPendingWarning(null)

        toast.success(`${player.first_name} asignada a ${getTeamDisplayName(team)}${newStatus === 'exception' ? ' (excepción)' : ''}`)
    }

    // Confirm continuity or proposal
    const confirmContinuity = (player: PlayerWithAssignment) => {
        if (!player.proposedTeam) return

        const updated = new Map(playerAssignments)
        updated.set(player.id, {
            ...player,
            assignedTeam: player.proposedTeam,
            status: 'assigned'
        })
        setPlayerAssignments(updated)
        toast.success(`Asignación confirmada: ${player.first_name}`)
    }

    // Confirm all valid continuities
    const confirmAllContinuities = async () => {
        const toConfirm = Array.from(playerAssignments.values())
            .filter(p => (p.status === 'pending_confirmation' || p.status === 'needs_review') && p.proposedTeam)

        if (toConfirm.length === 0) {
            toast.info('No hay propuestas pendientes de confirmar')
            return
        }

        const updated = new Map(playerAssignments)
        for (const player of toConfirm) {
            updated.set(player.id, {
                ...player,
                assignedTeam: player.proposedTeam,
                status: 'assigned'
            })
        }
        setPlayerAssignments(updated)
        toast.success(`${toConfirm.length} propuestas confirmadas`)
    }

    // Remove assignment
    const removeAssignment = (playerId: string) => {
        const player = playerAssignments.get(playerId)
        if (!player) return

        const updated = new Map(playerAssignments)
        updated.set(playerId, {
            ...player,
            assignedTeam: null,
            status: player.previousTeam ? 'pending_confirmation' : 'pending'
        })
        setPlayerAssignments(updated)
    }

    // Check if team is valid for player
    const isTeamBlocked = (player: PlayerWithAssignment, team: TeamDB): boolean => {
        const validation = validateAssignmentFromDB(
            player.birth_date,
            player.gender,
            seasonStartDate,
            team.category_stage,
            categories
        )
        return validation.type === 'blocked'
    }

    // Status badge
    const StatusBadge = ({ status }: { status: AssignmentStatus }) => {
        const config = {
            pending_confirmation: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Pend. confirmación' },
            pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Pendiente' },
            assigned: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Asignada' },
            exception: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Excepción' },
            needs_review: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Revisión' }
        }[status]

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
                {config.label}
            </span>
        )
    }

    if (loading) {
        return (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto animate-spin mb-4" />
                <p className="text-gray-400">Cargando asignaciones...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with stats */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Asignación de Plantillas</h3>
                        <p className="text-gray-400 text-sm">
                            Gestiona las asignaciones para la próxima temporada
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        icon={CheckCircle2}
                        onClick={confirmAllContinuities}
                        disabled={stats.pendingConfirmation === 0 && stats.needsReview === 0}
                    >
                        Confirmar todas ({stats.pendingConfirmation + stats.needsReview})
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-3 mb-6">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`p-3 rounded-lg border transition-colors ${filterStatus === 'all' ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-700 hover:border-gray-600'}`}
                    >
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-gray-400">Total</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending_confirmation')}
                        className={`p-3 rounded-lg border transition-colors ${filterStatus === 'pending_confirmation' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-gray-900 border-gray-700 hover:border-blue-500/30'}`}
                    >
                        <p className="text-2xl font-bold text-blue-400">{stats.pendingConfirmation}</p>
                        <p className="text-xs text-blue-400">Confirmación</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus('needs_review')}
                        className={`p-3 rounded-lg border transition-colors ${filterStatus === 'needs_review' ? 'bg-red-500/20 border-red-500/50' : 'bg-gray-900 border-gray-700 hover:border-red-500/30'}`}
                    >
                        <p className="text-2xl font-bold text-red-400">{stats.needsReview}</p>
                        <p className="text-xs text-red-400">Revisión</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus('assigned')}
                        className={`p-3 rounded-lg border transition-colors ${filterStatus === 'assigned' ? 'bg-green-500/20 border-green-500/50' : 'bg-gray-900 border-gray-700 hover:border-green-500/30'}`}
                    >
                        <p className="text-2xl font-bold text-green-400">{stats.assigned}</p>
                        <p className="text-xs text-green-400">Asignadas</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus('exception')}
                        className={`p-3 rounded-lg border transition-colors ${filterStatus === 'exception' ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-gray-900 border-gray-700 hover:border-yellow-500/30'}`}
                    >
                        <p className="text-2xl font-bold text-yellow-400">{stats.exception}</p>
                        <p className="text-xs text-yellow-400">Excepciones</p>
                    </button>
                </div>

                {/* Search and category filter */}
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar jugadora..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">Todas las categorías</option>
                        {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Players table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Jugadora</th>
                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Cat. Esperada</th>
                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Eq. Anterior</th>
                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Propuesta</th>
                            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Estado</th>
                            <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredPlayers.map(player => (
                            <tr key={player.id} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="text-white font-medium">{player.first_name} {player.last_name}</p>
                                    <p className="text-xs text-gray-500">{player.gender === 'female' ? 'F' : 'M'}</p>
                                </td>
                                <td className="px-4 py-3">
                                    {player.expectedCategory.found ? (
                                        <>
                                            <span className="text-primary-400 font-medium">{player.expectedCategory.name}</span>
                                            <p className="text-xs text-gray-500">{player.expectedCategory.ageRange}</p>
                                        </>
                                    ) : (
                                        <span className="text-red-400 text-sm">{player.expectedCategory.name}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {player.previousTeamName ? (
                                        <span className="text-gray-300">{player.previousTeamName}</span>
                                    ) : (
                                        <span className="text-gray-500 italic">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {player.assignedTeam ? (
                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                                            {getTeamDisplayName(player.assignedTeam)}
                                        </span>
                                    ) : player.proposedTeam ? (
                                        <span className="text-gray-400">{getTeamDisplayName(player.proposedTeam)}</span>
                                    ) : (
                                        <span className="text-gray-500 italic">Sin propuesta</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={player.status} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {(player.status === 'pending_confirmation' || player.status === 'needs_review') && player.proposedTeam && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                icon={Check}
                                                onClick={() => confirmContinuity(player)}
                                            >
                                                Confirmar
                                            </Button>
                                        )}
                                        {player.assignedTeam && (
                                            <button
                                                onClick={() => removeAssignment(player.id)}
                                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Quitar asignación"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!player.assignedTeam && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedPlayer(player)
                                                    setShowAssignmentModal(true)
                                                }}
                                            >
                                                Cambiar
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredPlayers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No se encontraron jugadoras con los filtros seleccionados
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {showAssignmentModal && selectedPlayer && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">
                                Asignar a {selectedPlayer.first_name}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAssignmentModal(false)
                                    setSelectedPlayer(null)
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-gray-900 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-gray-500">Categoría esperada:</span>
                                <span className="text-primary-400 font-medium">
                                    {selectedPlayer.expectedCategory.name}
                                    {selectedPlayer.expectedCategory.ageRange && (
                                        <span className="text-gray-500 ml-1">({selectedPlayer.expectedCategory.ageRange})</span>
                                    )}
                                </span>
                                {selectedPlayer.previousTeam && (
                                    <>
                                        <span className="text-gray-500">Equipo anterior:</span>
                                        <span className="text-gray-300">{selectedPlayer.previousTeamName}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {teams.filter(t => t.gender === selectedPlayer.gender).map(team => {
                                const blocked = isTeamBlocked(selectedPlayer, team)
                                const isRecommended = team.category_stage === selectedPlayer.expectedCategory.name
                                const expectedIndex = getCategoryIndexFromDB(selectedPlayer.expectedCategory.name, categories.filter(c => c.gender === selectedPlayer.gender))
                                const teamIndex = getCategoryIndexFromDB(team.category_stage, categories.filter(c => c.gender === selectedPlayer.gender))
                                const isWarning = !blocked && !isRecommended && teamIndex > expectedIndex

                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => assignToTeam(selectedPlayer, team)}
                                        disabled={blocked}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${blocked
                                            ? 'bg-gray-900/50 border-red-500/30 cursor-not-allowed opacity-60'
                                            : isRecommended
                                                ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                                                : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Users className={`w-5 h-5 ${blocked ? 'text-red-400' : 'text-gray-400'}`} />
                                            <div className="text-left">
                                                <p className={`font-medium ${blocked ? 'text-gray-500' : 'text-white'}`}>
                                                    {getTeamDisplayName(team)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {team.category_stage} • {team.gender === 'female' ? 'Femenino' : 'Masculino'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {blocked && (
                                                <span className="flex items-center gap-1 text-xs text-red-400">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Bloqueado
                                                </span>
                                            )}
                                            {isWarning && (
                                                <span className="flex items-center gap-1 text-xs text-yellow-400">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Superior
                                                </span>
                                            )}
                                            {isRecommended && (
                                                <span className="flex items-center gap-1 text-xs text-green-400">
                                                    <Check className="w-3 h-3" />
                                                    Recomendado
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Confirmation Modal */}
            {pendingWarning && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-yellow-500/50 max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white">Confirmar asignación</h3>
                        </div>

                        <p className="text-gray-300 mb-4">{pendingWarning.message}</p>

                        <div className="bg-gray-900 rounded-lg p-4 mb-6">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-gray-500">Jugadora:</span>
                                <span className="text-white">{pendingWarning.player.first_name} {pendingWarning.player.last_name}</span>
                                <span className="text-gray-500">Equipo destino:</span>
                                <span className="text-white">{getTeamDisplayName(pendingWarning.team)}</span>
                                <span className="text-gray-500">Categoría equipo:</span>
                                <span className="text-yellow-400">{pendingWarning.team.category_stage}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setPendingWarning(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={() => assignToTeam(pendingWarning.player, pendingWarning.team, true)}
                            >
                                Continuar (Override)
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
