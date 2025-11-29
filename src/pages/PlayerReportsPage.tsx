import { useState, useEffect } from 'react'
import { FileText, Filter, Users, Calendar, BarChart2, List } from 'lucide-react'
import { PlayerHistoryTable } from '@/components/reports/PlayerHistoryTable'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { playerReportService, PlayerReportWithDetails } from '@/services/playerReportService'
import { seasonService } from '@/services/seasonService'
import { teamService } from '@/services/teamService'
import { playerTeamSeasonService } from '@/services/playerTeamSeasonService'
import { toast } from 'sonner'

export function PlayerReportsPage() {
    const { profile } = useAuthStore()
    const { isDT, assignedTeamIds } = useCurrentUserRole()

    const [reports, setReports] = useState<PlayerReportWithDetails[]>([])
    const [filteredReports, setFilteredReports] = useState<PlayerReportWithDetails[]>([])
    const [loading, setLoading] = useState(true)

    // Filter state
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
    const [viewMode, setViewMode] = useState<'list' | 'history'>('list')

    // Data for filters
    const [currentSeason, setCurrentSeason] = useState<any>(null)
    const [availableTeams, setAvailableTeams] = useState<any[]>([])
    const [availablePlayers, setAvailablePlayers] = useState<any[]>([])

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!profile?.club_id) return

            try {
                setLoading(true)

                // Get current season - with fallback to most recent season
                let season = null
                try {
                    season = await seasonService.getCurrentSeasonByClub(profile.club_id)
                } catch (error) {
                    console.warn('Could not fetch current season, trying to get all seasons:', error)
                    // Fallback: get all seasons and use the most recent one
                    const allSeasons = await seasonService.getSeasonsByClub(profile.club_id)
                    if (allSeasons && allSeasons.length > 0) {
                        // Sort by start_date descending and take the first one
                        season = allSeasons.sort((a, b) => {
                            const dateA = new Date(a.start_date || a.reference_date)
                            const dateB = new Date(b.start_date || b.reference_date)
                            return dateB.getTime() - dateA.getTime()
                        })[0]
                    }
                }

                if (!season) {
                    toast.error('No hay una temporada activa')
                    setLoading(false)
                    return
                }
                setCurrentSeason(season)

                // Get teams (filtered by role)
                const teams = await teamService.getTeamsByClubAndSeason(profile.club_id, season.id)

                // Filter teams for coaches
                const filteredTeams = isDT
                    ? teams
                    : teams.filter(t => assignedTeamIds.includes(t.id))

                setAvailableTeams(filteredTeams)

                // Fetch reports
                const teamIds = isDT ? undefined : assignedTeamIds
                const reportsData = await playerReportService.getReportsWithDetails(
                    profile.club_id,
                    season.id,
                    teamIds
                )

                setReports(reportsData)
                setFilteredReports(reportsData)

            } catch (error) {
                console.error('Error fetching reports data:', error)
                toast.error('Error al cargar los informes')
            } finally {
                setLoading(false)
            }
        }

        fetchInitialData()
    }, [profile?.club_id, isDT, assignedTeamIds])

    // Fetch players when team is selected
    useEffect(() => {
        const fetchPlayers = async () => {
            if (!selectedTeamId || !currentSeason) {
                setAvailablePlayers([])
                return
            }

            try {
                const players = await playerTeamSeasonService.getRosterByTeamAndSeason(
                    selectedTeamId,
                    currentSeason.id
                )
                setAvailablePlayers(players)
            } catch (error) {
                console.error('Error fetching players:', error)
                toast.error('Error al cargar jugadoras')
            }
        }

        fetchPlayers()
    }, [selectedTeamId, currentSeason])

    // Apply filters
    useEffect(() => {
        let filtered = [...reports]

        if (selectedTeamId) {
            filtered = filtered.filter(r => r.team_id === selectedTeamId)
        }

        if (selectedPlayerId) {
            filtered = filtered.filter(r => r.player_id === selectedPlayerId)
        }

        setFilteredReports(filtered)
    }, [selectedTeamId, selectedPlayerId, reports])

    // Calculate averages
    const calculateTechnicalAverage = (sections: any) => {
        const tech = sections.technical
        const scores = [
            tech.serves,
            tech.reception,
            tech.attack,
            tech.block,
            tech.defense,
            tech.errorImpact
        ]
        const sum = scores.reduce((a, b) => a + b, 0)
        return (sum / scores.length).toFixed(1)
    }

    const calculateMentalAverage = (sections: any) => {
        const att = sections.attitude
        const scores = [
            att.attendance,
            att.intensity,
            att.communication,
            att.adaptation
        ]
        const sum = scores.reduce((a, b) => a + b, 0)
        return (sum / scores.length).toFixed(1)
    }

    const calculateOverallAverage = (sections: any) => {
        const techAvg = parseFloat(calculateTechnicalAverage(sections))
        const mentalAvg = parseFloat(calculateMentalAverage(sections))
        return ((techAvg + mentalAvg) / 2).toFixed(1)
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const handleClearFilters = () => {
        setSelectedTeamId('')
        setSelectedPlayerId('')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando informes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Informes de Jugadoras
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {isDT ? 'Vista completa del club' : 'Informes de tus equipos'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Team Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Equipo
                            </label>
                            <select
                                value={selectedTeamId}
                                onChange={(e) => {
                                    setSelectedTeamId(e.target.value)
                                    setSelectedPlayerId('') // Reset player filter
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">Todos los equipos</option>
                                {availableTeams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Player Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Jugadora
                            </label>
                            <select
                                value={selectedPlayerId}
                                onChange={(e) => setSelectedPlayerId(e.target.value)}
                                disabled={!selectedTeamId}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Todas las jugadoras</option>
                                {availablePlayers.map((item) => (
                                    <option key={item.player.id} value={item.player.id}>
                                        {item.player.first_name} {item.player.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters Button */}
                        <div className="flex items-end">
                            <button
                                onClick={handleClearFilters}
                                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <div className="flex items-center space-x-4">
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <List className="w-4 h-4 mr-2" />
                            Listado
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'history'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Histórico Comparado
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                {viewMode === 'history' ? (
                    selectedPlayerId ? (
                        <PlayerHistoryTable reports={filteredReports} />
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <BarChart2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Selecciona una jugadora
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Para ver el histórico comparado, primero debes seleccionar un equipo y una jugadora en los filtros.
                            </p>
                        </div>
                    )
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {filteredReports.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    No hay informes
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {selectedTeamId || selectedPlayerId
                                        ? 'No se encontraron informes con los filtros seleccionados'
                                        : 'Aún no se han creado informes de jugadoras'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Jugadora
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Equipo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Fecha
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Media Técnica
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Media Mental
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Media Potencial
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Autor
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {filteredReports.map((report) => (
                                            <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Users className="w-5 h-5 text-gray-400 mr-2" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {report.player_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {report.team_name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                                        {formatDate(report.report_date)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        {calculateTechnicalAverage(report.sections)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                        {calculateMentalAverage(report.sections)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                        {calculateOverallAverage(report.sections)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {report.author_name}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Summary */}
                {filteredReports.length > 0 && (
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {filteredReports.length} {filteredReports.length === 1 ? 'informe' : 'informes'}
                        {(selectedTeamId || selectedPlayerId) && ' (filtrados)'}
                    </div>
                )}
            </div>
        </div>
    )
}

