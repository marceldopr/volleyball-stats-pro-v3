import { useState } from 'react'
import { X } from 'lucide-react'
import { Player, useTeamStore } from '@/stores/teamStore'
import { toast } from 'sonner'

interface PlayerEditFormProps {
  player: Player
  teamId: string
  onClose: () => void
  onSave: () => void
}

export function PlayerEditForm({ player, teamId, onClose, onSave }: PlayerEditFormProps) {
  const { updatePlayer, teams } = useTeamStore()
  const [formData, setFormData] = useState({
    name: player.name,
    number: player.number,
    role: player.role,
    height: player.height?.toString() || '',
    weight: player.weight?.toString() || '',
    dominant: player.dominant || 'right',
    notes: player.notes || '',
    isActive: player.isActive,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roles = [
    { value: 'S', label: 'Colocadora (S)' },
    { value: 'OH', label: 'Extremo (OH)' },
    { value: 'MB', label: 'Central (MB)' },
    { value: 'OPP', label: 'Opuesto (OPP)' },
    { value: 'L', label: 'Libero (L)' },
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio'
    }

    if (!formData.number.trim()) {
      newErrors.number = 'El número es obligatorio'
    } else if (isNaN(Number(formData.number)) || Number(formData.number) < 1 || Number(formData.number) > 99) {
      newErrors.number = 'El número debe ser entre 1 y 99'
    } else {
      // Verificar que el número sea único en el equipo
      const currentTeam = teams.find(team => team.id === teamId)
      if (currentTeam) {
        const existingPlayerWithNumber = currentTeam.players.find(
          p => p.number === formData.number && p.id !== player.id
        )
        if (existingPlayerWithNumber) {
          newErrors.number = 'Este número ya está en uso'
        }
      }
    }

    if (!formData.role) {
      newErrors.role = 'El rol es obligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await updatePlayer(teamId, player.id, {
        name: formData.name.trim(),
        number: formData.number,
        role: formData.role as Player['role'],
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        dominant: formData.dominant as Player['dominant'],
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
      })

      toast.success('Jugadora actualizada correctamente')
      onSave()
      onClose()
    } catch (error) {
      toast.error('Error al actualizar la jugadora')
      console.error('Error updating player:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Editar Jugadora</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la jugadora *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Ej: María García"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número *
              </label>
              <input
                type="number"
                name="number"
                value={formData.number}
                onChange={handleInputChange}
                min="1"
                max="99"
                className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.number ? 'border-red-500' : ''}`}
                placeholder="Ej: 10"
                disabled={isSubmitting}
              />
              {errors.number && <p className="text-red-400 text-sm mt-1">{errors.number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${errors.role ? 'border-red-500' : ''}`}
                disabled={isSubmitting}
              >
                <option value="">Seleccionar rol</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="text-red-400 text-sm mt-1">{errors.role}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Altura (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                min="100"
                max="250"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ej: 180"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Peso (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                min="30"
                max="150"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ej: 70"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dominante
            </label>
            <select
              name="dominant"
              value={formData.dominant}
              onChange={handleInputChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={isSubmitting}
            >
              <option value="right">Derecha</option>
              <option value="left">Izquierda</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Información adicional sobre la jugadora..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="mr-2 w-4 h-4 text-primary-600 bg-gray-900 border-gray-700 rounded focus:ring-primary-500"
              disabled={isSubmitting}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-300">
              Jugadora activa
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-600"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}