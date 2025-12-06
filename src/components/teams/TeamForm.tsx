import { useState } from 'react'
import { X } from 'lucide-react'
import { useTeamStore } from '@/stores/teamStore'

interface TeamFormProps {
  team?: any
  onClose: () => void
}

export function TeamForm({ team, onClose }: TeamFormProps) {
  const { addTeam, updateTeam } = useTeamStore()
  const [formData, setFormData] = useState({
    name: team?.name || '',
    gender: team?.gender || 'female',
    category_stage: team?.category_stage || 'Sénior',
    division_name: team?.division_name || '',
    team_suffix: team?.team_suffix || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const teamData = {
      ...formData,
      players: team?.players || []
    }

    try {
      if (team) {
        await updateTeam(team.id, teamData)
      } else {
        await addTeam(teamData)
      }
      onClose()
    } catch (error) {
      console.error('Error saving team:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {team ? 'Editar Equipo' : 'Nuevo Equipo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Identificador (Opcional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ej: Verd, Taronja, A, Negre, SF..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">
              Este identificador diferencia equipos dentro de la misma categoría (por ejemplo: Taronja, Verd, A, B…). No es necesario si solo hay un equipo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isSubmitting}
              >
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Etapa Formativa
              </label>
              <select
                value={formData.category_stage}
                onChange={(e) => setFormData({ ...formData, category_stage: e.target.value as any })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isSubmitting}
              >
                <option value="Benjamín">Benjamín</option>
                <option value="Alevín">Alevín</option>
                <option value="Infantil">Infantil</option>
                <option value="Cadete">Cadete</option>
                <option value="Juvenil">Juvenil</option>
                <option value="Júnior">Júnior</option>
                <option value="Sénior">Sénior</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                División (Opcional)
              </label>
              <input
                type="text"
                value={formData.division_name}
                onChange={(e) => setFormData({ ...formData, division_name: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ej: 1a Catalana"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sufijo (Opcional)
              </label>
              <input
                type="text"
                value={formData.team_suffix}
                onChange={(e) => setFormData({ ...formData, team_suffix: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ej: A, B, Blau"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-gray-300 hover:text-white hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-600"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : (team ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}