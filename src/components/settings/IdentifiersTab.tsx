/**
 * IdentifiersTab - Team line identifier management (A/B/C or colors)
 * 
 * Identifiers help distinguish teams within same category
 * e.g., "Cadete A", "Cadete B" or "Cadete Taronja"
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { identifierService, IdentifierDB, IdentifierCreate } from '@/services/identifierService'
import { toast } from 'sonner'
import { useConfirmation } from '@/hooks/useConfirmation'

interface IdentifiersTabProps {
    clubId: string
}

type IdentifierType = 'letter' | 'color'

// Preset colors for quick selection
const PRESET_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#0EA5E9', // Sky
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#000000', // Black
    '#FFFFFF', // White
]

export function IdentifiersTab({ clubId }: IdentifiersTabProps) {
    const [identifiers, setIdentifiers] = useState<IdentifierDB[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingIdentifier, setEditingIdentifier] = useState<IdentifierDB | null>(null)
    const [saving, setSaving] = useState(false)
    const { confirm, ConfirmDialog } = useConfirmation()

    // Form state
    const [formName, setFormName] = useState('')
    const [formType, setFormType] = useState<IdentifierType>('letter')
    const [formCode, setFormCode] = useState('')
    const [formColorHex, setFormColorHex] = useState('#EF4444')

    // Load identifiers
    useEffect(() => {
        loadIdentifiers()
    }, [clubId])

    const loadIdentifiers = async () => {
        setLoading(true)
        try {
            const data = await identifierService.getIdentifiersByClub(clubId)
            setIdentifiers(data)
        } catch (error) {
            console.error('Error loading identifiers:', error)
            toast.error('Error al cargar identificadores')
        } finally {
            setLoading(false)
        }
    }

    // Open modal for creating
    const openCreateModal = () => {
        setEditingIdentifier(null)
        setFormName('')
        setFormType('letter')
        setFormCode('')
        setFormColorHex('#EF4444')
        setShowModal(true)
    }

    // Open modal for editing
    const openEditModal = (id: IdentifierDB) => {
        setEditingIdentifier(id)
        setFormName(id.name)
        setFormType(id.type)
        setFormCode(id.code || '')
        setFormColorHex(id.color_hex || '#EF4444')
        setShowModal(true)
    }

    // Close modal
    const closeModal = () => {
        setShowModal(false)
        setEditingIdentifier(null)
    }

    // Save identifier
    const saveIdentifier = async () => {
        if (!formName.trim()) {
            toast.error('El nombre es requerido')
            return
        }

        const duplicate = identifiers.find(
            i => i.name.toLowerCase() === formName.trim().toLowerCase() &&
                i.id !== editingIdentifier?.id
        )
        if (duplicate) {
            toast.error('Ya existe un identificador con este nombre')
            return
        }

        setSaving(true)
        try {
            if (editingIdentifier) {
                await identifierService.updateIdentifier(editingIdentifier.id, {
                    name: formName.trim(),
                    type: formType,
                    code: formCode.trim() || null,
                    color_hex: formType === 'color' ? formColorHex : null
                })
                toast.success('Identificador actualizado')
            } else {
                const maxOrder = Math.max(...identifiers.map(i => i.sort_order), 0)
                const newIdentifier: IdentifierCreate = {
                    club_id: clubId,
                    name: formName.trim(),
                    type: formType,
                    code: formCode.trim() || null,
                    color_hex: formType === 'color' ? formColorHex : null,
                    is_active: true,
                    sort_order: maxOrder + 1
                }
                await identifierService.createIdentifier(newIdentifier)
                toast.success('Identificador creado')
            }

            closeModal()
            await loadIdentifiers()
        } catch (error) {
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    // Toggle active
    const toggleActive = async (id: IdentifierDB) => {
        try {
            await identifierService.toggleActive(id.id, !id.is_active)
            await loadIdentifiers()
            toast.success(id.is_active ? 'Identificador desactivado' : 'Identificador activado')
        } catch (error) {
            toast.error('Error al cambiar estado')
        }
    }

    // Delete identifier
    const deleteIdentifier = async (id: IdentifierDB) => {
        const confirmed = await confirm({
            title: 'Eliminar Identificador',
            message: `¿Eliminar el identificador "${id.name}"? Esta acción es irreversible y puede afectar equipos que lo usan.`,
            severity: 'danger',
            confirmText: 'ELIMINAR',
            countdown: 3,
            requiresTyping: true
        })

        if (!confirmed) return

        try {
            await identifierService.deleteIdentifier(id.id)
            toast.success('Identificador eliminado')
            await loadIdentifiers()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Description */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-sm text-gray-400">
                    Los identificadores se usan para distinguir equipos dentro de una misma categoría.
                    Por ejemplo: <span className="text-white">Cadete A</span>, <span className="text-white">Cadete B</span> o <span className="text-white">Cadete Taronja</span>.
                </p>
            </div>

            {/* Identifiers List */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h4 className="font-medium text-white">Identificadores de línea</h4>
                    <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
                        Añadir
                    </Button>
                </div>

                <div className="divide-y divide-gray-700">
                    {identifiers.map(identifier => (
                        <div
                            key={identifier.id}
                            className={`flex items-center gap-3 p-4 transition-colors ${identifier.is_active ? 'hover:bg-gray-700/30' : 'opacity-50'
                                }`}
                        >
                            {/* Color/Letter indicator */}
                            {identifier.type === 'color' ? (
                                <div
                                    className="w-8 h-8 rounded-lg border border-gray-600 flex-shrink-0"
                                    style={{ backgroundColor: identifier.color_hex || '#666' }}
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                                    {identifier.code || identifier.name.charAt(0)}
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1">
                                <p className="text-white font-medium">{identifier.name}</p>
                                <p className="text-xs text-gray-500">
                                    {identifier.type === 'letter' ? 'Letra' : 'Color'}
                                    {identifier.code && <span className="ml-2">Código: {identifier.code}</span>}
                                </p>
                            </div>

                            {/* Active status */}
                            {identifier.is_active ? (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Activo</span>
                            ) : (
                                <span className="px-2 py-0.5 bg-gray-700 text-gray-500 rounded text-xs">Inactivo</span>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => toggleActive(identifier)}
                                    className="p-1.5 text-gray-400 hover:text-white"
                                    title={identifier.is_active ? 'Desactivar' : 'Activar'}
                                >
                                    {identifier.is_active
                                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                                        : <ToggleLeft className="w-5 h-5" />
                                    }
                                </button>
                                <button
                                    onClick={() => openEditModal(identifier)}
                                    className="p-1.5 text-gray-400 hover:text-primary-400"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteIdentifier(identifier)}
                                    className="p-1.5 text-gray-400 hover:text-red-400"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {identifiers.length === 0 && (
                        <div className="text-center py-8">
                            <Tag className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No hay identificadores definidos</p>
                            <p className="text-gray-600 text-xs mt-1">
                                Crea identificadores para distinguir equipos de la misma categoría
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">
                                {editingIdentifier ? 'Editar identificador' : 'Nuevo identificador'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Type selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormType('letter')}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${formType === 'letter'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-700 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        Letra
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormType('color')}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${formType === 'color'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-700 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        Color
                                    </button>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder={formType === 'letter' ? 'Ej: A, B, C' : 'Ej: Taronja, Negre'}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código corto</label>
                                <input
                                    type="text"
                                    value={formCode}
                                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                    placeholder="Ej: A, B, TRJ"
                                    maxLength={5}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Color picker (only for color type) */}
                            {formType === 'color' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormColorHex(color)}
                                                className={`w-8 h-8 rounded-lg transition-transform ${formColorHex === color ? 'ring-2 ring-white scale-110' : ''
                                                    }`}
                                                style={{ backgroundColor: color, border: color === '#FFFFFF' ? '1px solid #666' : 'none' }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={formColorHex}
                                            onChange={(e) => setFormColorHex(e.target.value)}
                                            className="w-10 h-10 rounded-lg cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formColorHex}
                                            onChange={(e) => setFormColorHex(e.target.value)}
                                            placeholder="#FF6600"
                                            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            <div className="p-3 bg-gray-900 rounded-lg">
                                <span className="text-xs text-gray-500 block mb-2">Vista previa:</span>
                                <div className="flex items-center gap-2">
                                    {formType === 'color' ? (
                                        <div
                                            className="w-6 h-6 rounded"
                                            style={{ backgroundColor: formColorHex }}
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                                            {formCode || formName.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <span className="text-white">Cadete {formName || '...'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button variant="secondary" className="flex-1" onClick={closeModal}>
                                Cancelar
                            </Button>
                            <Button variant="primary" icon={Save} className="flex-1" onClick={saveIdentifier} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {ConfirmDialog}
        </div>
    )
}
