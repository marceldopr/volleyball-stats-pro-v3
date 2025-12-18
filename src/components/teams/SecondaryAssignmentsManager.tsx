
import { useState, useEffect } from 'react'
import { Plus, Trash2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { playerTeamSeasonService, PlayerTeamSeasonDB } from '@/services/playerTeamSeasonService'
import { playerService, PlayerDB } from '@/services/playerService'
import { toast } from 'sonner'
import { useRoleScope } from '@/hooks/useRoleScope'
import { supabase } from '@/lib/supabaseClient'

interface SecondaryAssignmentsManagerProps {
    teamId: string
    seasonId: string
    clubId: string
}

export function SecondaryAssignmentsManager({ teamId, seasonId, clubId }: SecondaryAssignmentsManagerProps) {
    const { isDT } = useRoleScope()
    // Extend type to include primary_info
    const [assignments, setAssignments] = useState<(PlayerTeamSeasonDB & { primary_info?: any })[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [availablePlayers, setAvailablePlayers] = useState<PlayerDB[]>([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        loadAssignments()
    }, [teamId, seasonId])

    const loadAssignments = async () => {
        try {
            setLoading(true)
            // 1. Fetch mixed roster, filter for secondary
            const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(teamId, seasonId)
            const secondaries = roster.filter(p => p.assignment_type === 'secondary')

            // 2. Fetch PRIMARY info for these players
            if (secondaries.length > 0) {
                const playerIds = secondaries.map(p => p.player_id)
                const { data: primaryData, error } = await supabase
                    .from('player_team_season')
                    .select(`
                        player_id,
                        jersey_number,
                        position,
                        teams (
                            custom_name, 
                            category, 
                            gender,
                            club_identifiers (name)
                        )
                    `)
                    .in('player_id', playerIds)
                    .eq('season_id', seasonId)
                    // We want to find the assignment that IS NOT this doubling one.
                    .neq('team_id', teamId)

                if (!error && primaryData) {
                    const primaryMap = new Map(primaryData.map(p => [p.player_id, p]))
                    // Mutate the objects to add primary_info
                    secondaries.forEach((sec: any) => {
                        sec.primary_info = primaryMap.get(sec.player_id)
                    })
                }
            }

            setAssignments(secondaries)
        } catch (error) {
            console.error('Error loading secondary assignments:', error)
            toast.error('Error al cargar doblajes')
        } finally {
            setLoading(false)
        }
    }

    const getTeamName = (teamData: any) => {
        if (!teamData) return 'Desconocido'
        if (teamData.custom_name) return teamData.custom_name

        const genderMap: Record<string, string> = {
            'female': 'Femenino',
            'male': 'Masculino',
            'mixed': 'Mixto'
        }
        const genderLabel = genderMap[teamData.gender] || teamData.gender
        const identifier = teamData.club_identifiers?.name

        let name = teamData.category
        if (identifier) {
            name += ` ${identifier}`
        }
        name += ` ${genderLabel}`

        return name
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        try {
            // Fetch all club players
            // Ideally we should have a service method to search players not in this team
            // For now, fetching all and filtering client side for simplicity in MVP
            const allPlayers = await playerService.getPlayersByClub(clubId)

            // Filter: Name matches AND Not already in assignments (primary or secondary for this team)
            const roster = await playerTeamSeasonService.getRosterByTeamAndSeason(teamId, seasonId)
            const existingIds = new Set(roster.map(r => r.player_id))

            const filtered = allPlayers.filter(p =>
                !existingIds.has(p.id) &&
                (p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            setAvailablePlayers(filtered)
        } catch (error) {
            console.error('Error searching players:', error)
        } finally {
            setSearching(false)
        }
    }

    const handleAddAssignment = async (playerId: string) => {
        try {
            // We need to use supabase client directly or add a method to service
            // Since we added `addSecondaryAssignment` to plan but maybe not service yet?
            // Let's check service... wait, I haven't added `addSecondaryAssignment` to service details in previous step!
            // I only updated `getRoster...`. I need to add write methods to `playerTeamSeasonService`.
            // I will use direct Supabase here if service is missing, or update service first.
            // BETTER: Update Service first. But to safe time I might do logic here then refactor. 
            // actually, I can just use the supabase client import if I export it or import it here.
            // But let's assume I'll add it to service for cleanliness.

            await playerTeamSeasonService.addSecondaryAssignment({
                player_id: playerId,
                team_id: teamId,
                season_id: seasonId,
                club_id: clubId,
                notes: 'Added via Team Dashboard'
            })

            toast.success('Jugadora añadida como doblaje')
            setShowAddModal(false)
            setSearchQuery('')
            setAvailablePlayers([])
            loadAssignments()
        } catch (error) {
            console.error('Error adding assignment:', error)
            toast.error('Error al añadir doblaje')
        }
    }

    const handleRemoveAssignment = async (secondaryId: string) => {
        if (!window.confirm('¿Estás seguro de quitar este doblaje?')) return
        try {
            await playerTeamSeasonService.removeSecondaryAssignment(secondaryId)
            toast.success('Doblabje eliminado')
            loadAssignments()
        } catch (error) {
            console.error('Error removing assignment:', error)
            toast.error('Error al eliminar')
        }
    }

    const getPositionLabel = (code: string | null | undefined) => {
        if (!code) return 'Sin asignar'
        const map: Record<string, string> = {
            'S': 'Colocadora',
            'OH': 'Receptora',
            'MB': 'Central',
            'OPP': 'Opuesta',
            'L': 'Líbero'
        }
        return map[code] || code
    }

    if (loading) return <div className="p-4 text-center text-gray-500">Cargando doblajes...</div>

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    Jugadoras en Doblatge
                </h3>
                {isDT && (
                    <Button size="sm" variant="secondary" onClick={() => setShowAddModal(true)} icon={Plus}>
                        Añadir Doblatge
                    </Button>
                )}
            </div>

            {assignments.length === 0 ? (
                <div className="text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    No hay jugadoras de otros equipos doblando en este equipo.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900/30 rounded-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs">
                                    {assignment.jersey_number || assignment.primary_info?.jersey_number || '#'}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                                        {assignment.player?.first_name} {assignment.player?.last_name}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-xs text-gray-500 font-medium">
                                            {getPositionLabel(assignment.primary_info?.position || assignment.player?.main_position)}
                                        </div>
                                        {assignment.primary_info?.teams && (
                                            <div className="text-[10px] text-gray-400">
                                                {getTeamName(assignment.primary_info.teams)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {isDT && (
                                <button
                                    onClick={() => assignment.secondary_id && handleRemoveAssignment(assignment.secondary_id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Eliminar doblaje"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-xl">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Añadir Jugadora (Doblatge)</h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 input bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                                placeholder="Buscar por nombre..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={searching} variant="primary">
                                {searching ? '...' : 'Buscar'}
                            </Button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                            {availablePlayers.map(player => (
                                <div key={player.id} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                                    <div>
                                        <div className="font-medium text-sm text-gray-900 dark:text-white">{player.first_name} {player.last_name}</div>
                                        <div className="text-xs text-gray-500">{player.birth_date}</div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleAddAssignment(player.id)}>
                                        Añadir
                                    </Button>
                                </div>
                            ))}
                            {availablePlayers.length === 0 && searchQuery && !searching && (
                                <p className="text-center text-sm text-gray-500 py-2">No se encontraron jugadoras disponibles.</p>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
