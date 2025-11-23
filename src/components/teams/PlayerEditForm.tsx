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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      updatePlayer(teamId, player.id, {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Editar Jugadora</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la jugadora *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Ej: María García"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número *
              </label>
              <input
                type="number"
                name="number"
                value={formData.number}
                onChange={handleInputChange}
                min="1"
                max="99"
                className={`input w-full ${errors.number ? 'border-red-500' : ''}`}
                placeholder="Ej: 10"
              />
              {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`input w-full ${errors.role ? 'border-red-500' : ''}`}
              >
                <option value="">Seleccionar rol</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                min="100"
                max="250"
                className="input w-full"
                placeholder="Ej: 180"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                min="30"
                max="150"
                className="input w-full"
                placeholder="Ej: 70"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dominante
            </label>
            <select
              name="dominant"
              value={formData.dominant}
              onChange={handleInputChange}
              className="input w-full"
            >
              <option value="right">Derecha</option>
              <option value="left">Izquierda</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="input w-full"
              placeholder="Información adicional sobre la jugadora..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Jugadora activa
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn-primary"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}