import { useState, useEffect } from 'react'
import { FileText, Plus, Calendar, User, X } from 'lucide-react'
import { reportService, PlayerReportDB } from '../../services/reportService'
import { useAuthStore } from '../../stores/authStore'

interface PlayerReportsProps {
    playerId: string
}

export function PlayerReports({ playerId }: PlayerReportsProps) {
    const { profile } = useAuthStore()
    const [reports, setReports] = useState<PlayerReportDB[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewReportForm, setShowNewReportForm] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0], // Today's date
        content: ''
    })
    const [saving, setSaving] = useState(false)

    // Load reports
    useEffect(() => {
        loadReports()
    }, [playerId, profile?.club_id])

    const loadReports = async () => {
        if (!profile?.club_id) return

        try {
            setLoading(true)
            const data = await reportService.getReportsByPlayer(profile.club_id, playerId)
            setReports(data)
        } catch (error) {
            console.error('Error loading reports:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateReport = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!profile?.club_id || !profile?.id) {
            alert('Error: No se pudo obtener la información del usuario')
            return
        }

        if (!formData.title.trim() || !formData.content.trim()) {
            alert('Por favor completa todos los campos')
            return
        }

        try {
            setSaving(true)
            await reportService.createPlayerReport({
                club_id: profile.club_id,
                player_id: playerId,
                author_user_id: profile.id,
                date: formData.date,
                title: formData.title,
                content: formData.content
            })

            // Reset form
            setFormData({
                title: '',
                date: new Date().toISOString().split('T')[0],
                content: ''
            })
            setShowNewReportForm(false)

            // Reload reports
            await loadReports()
        } catch (error) {
            console.error('Error creating report:', error)
            alert('Error al crear el informe. Por favor, inténtalo de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getContentPreview = (content: string, maxLength: number = 150) => {
        if (content.length <= maxLength) return content
        return content.substring(0, maxLength) + '...'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Cargando informes...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Informes de seguimiento
                </h2>
                <button
                    onClick={() => setShowNewReportForm(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo informe
                </button>
            </div>

            {/* New Report Form Modal */}
            {showNewReportForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Nuevo Informe</h3>
                            <button
                                onClick={() => setShowNewReportForm(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleCreateReport} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Título
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input-field"
                                    placeholder="Ej: Evaluación técnica - Enero 2024"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contenido
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="input-field min-h-[200px] resize-y"
                                    placeholder="Escribe aquí el contenido del informe..."
                                    required
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowNewReportForm(false)}
                                    className="btn-outline"
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Guardando...' : 'Guardar informe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reports List */}
            {reports.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No hay informes registrados</p>
                    <p className="text-sm text-gray-500">
                        Crea el primer informe para esta jugadora
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            {/* Report Header */}
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {report.title}
                                </h3>
                            </div>

                            {/* Report Meta */}
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(report.date)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    <span>{profile?.full_name || 'Autor desconocido'}</span>
                                </div>
                            </div>

                            {/* Report Content Preview */}
                            <p className="text-gray-700 whitespace-pre-wrap">
                                {getContentPreview(report.content)}
                            </p>

                            {/* Show full content if it was truncated */}
                            {report.content.length > 150 && (
                                <button
                                    className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
                                    onClick={() => {
                                        // TODO: Implement full report view modal
                                        alert('Funcionalidad de vista completa próximamente')
                                    }}
                                >
                                    Ver más
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
