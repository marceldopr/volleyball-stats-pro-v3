import { X, Building2 } from 'lucide-react'
import { useState } from 'react'
import { Space } from '@/types/spacesTypes'
import { Button } from '@/components/ui/Button'

interface SpaceModalProps {
    isOpen: boolean
    onClose: () => void
    space?: Space
    onSave?: (space: Partial<Space>) => void
}

export function SpaceModal({ isOpen, onClose, space, onSave }: SpaceModalProps) {
    const [name, setName] = useState(space?.name || '')
    const [type, setType] = useState<'interior' | 'exterior'>(space?.type || 'interior')
    const [capacity, setCapacity] = useState<string>(space?.capacity?.toString() || '')
    const [notes, setNotes] = useState(space?.notes || '')
    const [isActive, setIsActive] = useState(space?.isActive ?? true)

    if (!isOpen) return null

    const handleSave = () => {
        if (onSave) {
            onSave({
                name,
                type,
                capacity: capacity ? parseInt(capacity, 10) : undefined,
                notes,
                isActive
            })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary-500" />
                        <h2 className="text-xl font-semibold text-white">
                            {space ? 'Editar espacio' : 'Añadir espacio'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Pista 1, Gimnasio, Patio exterior..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Ejemplos: Pista 1, Gimnasio, Patio exterior...
                        </p>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tipo
                        </label>
                        <div className="flex gap-2 bg-gray-900 rounded-lg p-1">
                            <button
                                onClick={() => setType('interior')}
                                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${type === 'interior'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Interior
                            </button>
                            <button
                                onClick={() => setType('exterior')}
                                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${type === 'exterior'
                                        ? 'bg-primary-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Exterior
                            </button>
                        </div>
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Capacidad (opcional)
                        </label>
                        <input
                            type="number"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            placeholder="Ej: 20"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Notas (opcional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Información adicional..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">
                            Activo
                        </label>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary-500' : 'bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
                    <Button variant="secondary" size="md" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleSave}
                        disabled={!name.trim()}
                    >
                        Guardar
                    </Button>
                </div>
            </div>
        </div>
    )
}
