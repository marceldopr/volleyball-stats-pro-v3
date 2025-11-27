import { useState, useEffect } from 'react'
import { Plus, FileText, Filter, Calendar, User, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'
import { coachReportService } from '@/services/coachReportService'
import { CoachReportDB } from '@/types/CoachReport'
import { seasonService } from '@/services/seasonService'
import { toast } from 'sonner'

export function CoachReportsPage() {
    const { profile } = useAuthStore()
    const { isDT } = useCurrentUserRole()

    const [reports, setReports] = useState<CoachReportDB[]>([])
    const [filteredReports, setFilteredReports] = useState<CoachReportDB[]>([])
    const [loading, setLoading] = useState(true)

    // Filter state
    const [selectedCoachId, setSelectedCoachId] = useState<string>('')
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')

    // Data for filters
    const [seasons, setSeasons] = useState<any[]>([])
    const [coaches, setCoaches] = useState<any[]>([])

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        coach_id: '',
        season_id: '',
        asistencia: 3,
        metodologia: 3,
        comunicacion: 3,
        clima_equipo: 3,
        notas: '',
        fecha: new Date().toISOString().split('T')[0]
    })

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.club_id) return

            try {
                setLoading(true)

                // Get seasons
                const seasonsData = await seasonService.getSeasonsByClub(profile.club_id)
                setSeasons(seasonsData)

                // Get current season
                let currentSeason = null
                try {
                    currentSeason = await seasonService.getCurrentSeasonByClub(profile.club_id)
                } catch {
                    if (seasonsData.length > 0) {
                        currentSeason = seasonsData.sort((a, b) => {
                            const dateA = new Date(a.start_date || a.reference_date)
                            const dateB = new Date(b.start_date || b.reference_date)
                            return dateB.getTime() - dateA.getTime()
                        })[0]
                    }
                }

                if (currentSeason) {
                    setSelectedSeasonId(currentSeason.id)
                    setFormData(prev => ({ ...prev, season_id: currentSeason.id }))
                }

                // Get coaches (profiles with role 'coach')
                const { data: coachesData, error } = await (await import('@/lib/supabaseClient')).supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('club_id', profile.club_id)
                    .eq('role', 'coach')
                    .order('full_name', { ascending: true })

                if (error) throw error
                setCoaches(coachesData || [])

                // Fetch reports for current season
                if (currentSeason) {
                    const reportsData = await coachReportService.getReportsByClubSeason(
                        profile.club_id,
                        currentSeason.id
                    )
                    setReports(reportsData)
                    setFilteredReports(reportsData)
                }

            } catch (error) {
                console.error('Error fetching data:', error)
                toast.error('Error al cargar los datos')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [profile?.club_id])

    // Apply filters
    useEffect(() => {
        let filtered = [...reports]

        if (selectedCoachId) {
            filtered = filtered.filter(r => r.coach_id === selectedCoachId)
        }

        if (selectedSeasonId) {
            filtered = filtered.filter(r => r.season_id === selectedSeasonId)
        }

        setFilteredReports(filtered)
    }, [selectedCoachId, selectedSeasonId, reports])

    // Handle season filter change
    const handleSeasonChange = async (seasonId: string) => {
        setSelectedSeasonId(seasonId)

        if (!profile?.club_id || !seasonId) return

        try {
            const reportsData = await coachReportService.getReportsByClubSeason(
                profile.club_id,
                seasonId
            )
            setReports(reportsData)
        } catch (error) {
            console.error('Error fetching reports:', error)
            toast.error('Error al cargar informes')
        }
    }

    const handleOpenModal = () => {
        setFormData({
            coach_id: '',
            season_id: selectedSeasonId || '',
            asistencia: 3,
            metodologia: 3,
            comunicacion: 3,
            clima_equipo: 3,
            notas: '',
            fecha: new Date().toISOString().split('T')[0]
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!profile?.club_id) {
            toast.error('Error: No se ha identificado el club')
            return
        }

        if (!formData.coach_id || !formData.season_id) {
            toast.error('Selecciona un entrenador y una temporada')
            return
        }

        setSubmitting(true)
        try {
            await coachReportService.createReport({
                club_id: profile.club_id,
                created_by: profile.id,
                ...formData
            })

            toast.success('Informe creado correctamente')
            setShowModal(false)

            // Reload reports
            const reportsData = await coachReportService.getReportsByClubSeason(
                profile.club_id,
                formData.season_id
            )
            setReports(reportsData)
        } catch (error) {
            console.error('Error creating report:', error)
            toast.error('Error al crear el informe')
        } finally {
            setSubmitting(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const getCoachName = (coachId: string) => {
        const coach = coaches.find(c => c.id === coachId)
        return coach?.full_name || 'Desconocido'
    }

    const calculateAverage = (report: CoachReportDB) => {
        return ((report.asistencia + report.metodologia + report.comunicacion + report.clima_equipo) / 4).toFixed(1)
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Informes de Entrenadores
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {isDT ? 'Gestión de evaluaciones de entrenadores' : 'Vista de informes'}
                                </p>
                            </div>
                        </div>
                        {isDT && (
                            <button
                                onClick={handleOpenModal}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Nuevo Informe
                            </button>
                        )}
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
                        {/* Season Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Temporada
                            </label>
                            <select
                                value={selectedSeasonId}
                                onChange={(e) => handleSeasonChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">Todas las temporadas</option>
                                {seasons.map((season) => (
                                    <option key={season.id} value={season.id}>
                                        {season.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Coach Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Entrenador
                            </label>
                            <select
                                value={selectedCoachId}
                                onChange={(e) => setSelectedCoachId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">Todos los entrenadores</option>
                                {coaches.map((coach) => (
                                    <option key={coach.id} value={coach.id}>
                                        {coach.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters */}
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSelectedCoachId('')
                                    // Keep season filter
                                }}
                                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {filteredReports.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No hay informes
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {selectedCoachId || selectedSeasonId
                                    ? 'No se encontraron informes con los filtros seleccionados'
                                    : 'Aún no se han creado informes de entrenadores'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Entrenador
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Fecha
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Asistencia
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Metodología
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Comunicación
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Clima Equipo
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Media
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredReports.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <User className="w-5 h-5 text-gray-400 mr-2" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {getCoachName(report.coach_id)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                                    {formatDate(report.fecha)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {report.asistencia}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                    {report.metodologia}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    {report.comunicacion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                    {report.clima_equipo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                    {calculateAverage(report)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {filteredReports.length > 0 && (
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {filteredReports.length} {filteredReports.length === 1 ? 'informe' : 'informes'}
                    </div>
                )}
            </div>

            {/* Create Report Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Nuevo Informe de Entrenador
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Coach Select */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Entrenador *
                                    </label>
                                    <select
                                        required
                                        value={formData.coach_id}
                                        onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {coaches.map((coach) => (
                                            <option key={coach.id} value={coach.id}>
                                                {coach.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fecha *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.fecha}
                                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Rating Fields */}
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                    Evaluación (1-5)
                                </h3>

                                {/* Asistencia */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Asistencia
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formData.asistencia}
                                        onChange={(e) => setFormData({ ...formData, asistencia: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>1</span>
                                        <span className="font-medium text-primary-600">{formData.asistencia}</span>
                                        <span>5</span>
                                    </div>
                                </div>

                                {/* Metodología */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Metodología
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formData.metodologia}
                                        onChange={(e) => setFormData({ ...formData, metodologia: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>1</span>
                                        <span className="font-medium text-primary-600">{formData.metodologia}</span>
                                        <span>5</span>
                                    </div>
                                </div>

                                {/* Comunicación */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Comunicación
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formData.comunicacion}
                                        onChange={(e) => setFormData({ ...formData, comunicacion: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>1</span>
                                        <span className="font-medium text-primary-600">{formData.comunicacion}</span>
                                        <span>5</span>
                                    </div>
                                </div>

                                {/* Clima de Equipo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Clima de Equipo
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={formData.clima_equipo}
                                        onChange={(e) => setFormData({ ...formData, clima_equipo: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>1</span>
                                        <span className="font-medium text-primary-600">{formData.clima_equipo}</span>
                                        <span>5</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Notas
                                </label>
                                <textarea
                                    value={formData.notas}
                                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 resize-none"
                                    placeholder="Observaciones adicionales..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    disabled={submitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Guardando...' : 'Crear Informe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
