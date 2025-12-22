import { useState } from 'react'
import { Edit, Save } from 'lucide-react'
import type { CoachDB } from '@/types/Coach'
import { coachService } from '@/services/coachService'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'

interface CoachInformacionPersonalProps {
    coach: CoachDB
}

export function CoachInformacionPersonal({ coach }: CoachInformacionPersonalProps) {
    const { isDT } = useCurrentUserRole()
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        phone: coach.phone || '',
        email: coach.email || '',
        notes_internal: coach.notes_internal || ''
    })

    const handleSave = async () => {
        setSaving(true)
        try {
            await coachService.updateCoach(coach.id, formData)
            toast.success('Información actualizada')
            setIsEditing(false)
        } catch (error) {
            console.error('Error updating coach:', error)
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Información de Contacto</h2>
                    {isDT && (
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={isEditing ? Save : Edit}
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                            disabled={saving}
                        >
                            {isEditing ? 'Guardar' : 'Editar'}
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input w-full"
                                placeholder="email@ejemplo.com"
                            />
                        ) : (
                            <p className="text-white">{coach.email || 'No especificado'}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input w-full"
                                placeholder="+34 600 123 456"
                            />
                        ) : (
                            <p className="text-white">{coach.phone || 'No especificado'}</p>
                        )}
                    </div>
                </div>

                {/* Internal Notes (DT only) */}
                {isDT && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Notas Internas (solo DT)
                        </label>
                        {isEditing ? (
                            <textarea
                                value={formData.notes_internal}
                                onChange={(e) => setFormData({ ...formData, notes_internal: e.target.value })}
                                className="input w-full h-24 resize-none"
                                placeholder="Notas privadas del DT sobre este entrenador..."
                            />
                        ) : (
                            <p className="text-white">{coach.notes_internal || 'Sin notas'}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
