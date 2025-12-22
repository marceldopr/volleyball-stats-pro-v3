import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { coachService } from '@/services/coachService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface CreateCoachModalProps {
    onClose: () => void
    onSuccess: () => void
}

export function CreateCoachModal({ onClose, onSuccess }: CreateCoachModalProps) {
    const { profile } = useAuthStore()
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!profile?.club_id) {
            toast.error('No se pudo identificar el club')
            return
        }

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            toast.error('Nombre y apellidos son obligatorios')
            return
        }

        setSubmitting(true)
        try {
            await coachService.createCoach({
                club_id: profile.club_id,
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                email: formData.email.trim() || null,
                phone: formData.phone.trim() || null,
                status: 'active'
            })

            toast.success('Entrenador creado correctamente')
            onSuccess()
        } catch (error) {
            console.error('Error creating coach:', error)
            toast.error('Error al crear el entrenador')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Nuevo Entrenador
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="input w-full"
                            placeholder="Ej: Juan"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Apellidos *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            className="input w-full"
                            placeholder="Ej: García López"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email (opcional)
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="input w-full"
                            placeholder="Ej: juan.garcia@club.com"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Teléfono (opcional)
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="input w-full"
                            placeholder="Ej: +34 600 123 456"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary text-sm font-medium"
                            disabled={submitting}
                        >
                            Cancelar
                        </button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={submitting}
                        >
                            {submitting ? 'Creando...' : 'Crear Entrenador'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
