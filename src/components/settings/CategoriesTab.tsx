/**
 * CategoriesTab - Category management with modal-based editing
 * 
 * No inline editing - all create/edit operations use modals
 */

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Plus, Edit2, Trash2, Save, X, ChevronDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { categoryService, CategoryDB, CategoryCreate } from '@/services/categoryService'
import { toast } from 'sonner'

interface CategoriesTabProps {
    clubId: string
}

type GenderTab = 'female' | 'male'

export function CategoriesTab({ clubId }: CategoriesTabProps) {
    const [categories, setCategories] = useState<CategoryDB[]>([])
    const [loading, setLoading] = useState(true)
    const [activeGender, setActiveGender] = useState<GenderTab>('female')
    const [showModal, setShowModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CategoryDB | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formName, setFormName] = useState('')
    const [formCode, setFormCode] = useState('')
    const [formMinAge, setFormMinAge] = useState<number | ''>('')
    const [formMaxAge, setFormMaxAge] = useState<number | ''>('')

    // Load categories
    useEffect(() => {
        loadCategories()
    }, [clubId])

    const loadCategories = async () => {
        setLoading(true)
        try {
            const data = await categoryService.getCategoriesByClub(clubId)

            if (data.length === 0) {
                await categoryService.initializeDefaultCategories(clubId)
                const newData = await categoryService.getCategoriesByClub(clubId)
                setCategories(newData)
            } else {
                setCategories(data)
            }
        } catch (error) {
            console.error('Error loading categories:', error)
            toast.error('Error al cargar categorías')
        } finally {
            setLoading(false)
        }
    }

    const filteredCategories = categories
        .filter(c => c.gender === activeGender)
        .sort((a, b) => a.sort_order - b.sort_order)

    // Open modal for creating new category
    const openCreateModal = () => {
        setEditingCategory(null)
        setFormName('')
        setFormCode('')
        setFormMinAge('')
        setFormMaxAge('')
        setShowModal(true)
    }

    // Open modal for editing
    const openEditModal = (category: CategoryDB) => {
        setEditingCategory(category)
        setFormName(category.name)
        setFormCode(category.code || '')
        setFormMinAge(category.min_age ?? '')
        setFormMaxAge(category.max_age ?? '')
        setShowModal(true)
    }

    // Close modal
    const closeModal = () => {
        setShowModal(false)
        setEditingCategory(null)
    }

    // Save category
    const saveCategory = async () => {
        if (!formName.trim()) {
            toast.error('El nombre es requerido')
            return
        }

        const duplicate = filteredCategories.find(
            c => c.name.toLowerCase() === formName.trim().toLowerCase() &&
                c.id !== editingCategory?.id
        )
        if (duplicate) {
            toast.error('Ya existe una categoría con este nombre')
            return
        }

        setSaving(true)
        try {
            if (editingCategory) {
                await categoryService.updateCategory(editingCategory.id, {
                    name: formName.trim(),
                    code: formCode.trim() || null,
                    min_age: formMinAge === '' ? null : formMinAge,
                    max_age: formMaxAge === '' ? null : formMaxAge
                })
                toast.success('Categoría actualizada')
            } else {
                const maxOrder = Math.max(...filteredCategories.map(c => c.sort_order), 0)
                const newCategory: CategoryCreate = {
                    club_id: clubId,
                    name: formName.trim(),
                    code: formCode.trim() || null,
                    gender: activeGender,
                    min_age: formMinAge === '' ? null : formMinAge,
                    max_age: formMaxAge === '' ? null : formMaxAge,
                    sort_order: maxOrder + 1,
                    is_active: true
                }
                await categoryService.createCategory(newCategory)
                toast.success('Categoría creada')
            }

            closeModal()
            await loadCategories()
        } catch (error) {
            toast.error('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    // Move category up
    const moveUp = async (category: CategoryDB) => {
        const currentIndex = filteredCategories.findIndex(c => c.id === category.id)
        if (currentIndex <= 0) return

        const prevCategory = filteredCategories[currentIndex - 1]

        try {
            await categoryService.reorderCategories([
                { id: category.id, sort_order: prevCategory.sort_order },
                { id: prevCategory.id, sort_order: category.sort_order }
            ])
            await loadCategories()
        } catch (error) {
            toast.error('Error al reordenar')
        }
    }

    // Move category down
    const moveDown = async (category: CategoryDB) => {
        const currentIndex = filteredCategories.findIndex(c => c.id === category.id)
        if (currentIndex >= filteredCategories.length - 1) return

        const nextCategory = filteredCategories[currentIndex + 1]

        try {
            await categoryService.reorderCategories([
                { id: category.id, sort_order: nextCategory.sort_order },
                { id: nextCategory.id, sort_order: category.sort_order }
            ])
            await loadCategories()
        } catch (error) {
            toast.error('Error al reordenar')
        }
    }

    // Delete category
    const deleteCategory = async (category: CategoryDB) => {
        if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return

        try {
            await categoryService.deleteCategory(category.id)
            toast.success('Categoría eliminada')
            await loadCategories()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    // Age gap warning
    const getAgeGapWarning = (): string | null => {
        const sorted = [...filteredCategories].sort((a, b) => a.sort_order - b.sort_order)
        for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i]
            const next = sorted[i + 1]
            if (current.max_age !== null && next.min_age !== null) {
                if (next.min_age - current.max_age > 1) {
                    return `Hueco de edad entre ${current.name} y ${next.name}`
                }
            }
        }
        return null
    }

    const ageGapWarning = getAgeGapWarning()

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Gender Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveGender('female')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeGender === 'female'
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                >
                    Femenino
                </button>
                <button
                    onClick={() => setActiveGender('male')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeGender === 'male'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                >
                    Masculino
                </button>
            </div>

            {/* Warning */}
            {ageGapWarning && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-400">{ageGapWarning}</p>
                </div>
            )}

            {/* Categories List */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h4 className="font-medium text-white">Jerarquía de categorías</h4>
                    <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
                        Añadir
                    </Button>
                </div>

                <div className="divide-y divide-gray-700">
                    {filteredCategories.map((category, index) => (
                        <div key={category.id} className="flex items-center gap-3 p-4 hover:bg-gray-700/30 transition-colors">
                            {/* Order number */}
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded-lg text-gray-400 font-mono text-sm">
                                {index + 1}
                            </div>

                            {/* Category info */}
                            <div className="flex-1">
                                <p className="text-white font-medium">{category.name}</p>
                                <p className="text-xs text-gray-500">
                                    {category.code && <span className="text-primary-400 mr-2">{category.code}</span>}
                                    {category.min_age !== null && category.max_age !== null && (
                                        <span>{category.min_age}-{category.max_age} años</span>
                                    )}
                                    {category.min_age !== null && category.max_age === null && (
                                        <span>{category.min_age}+ años</span>
                                    )}
                                </p>
                            </div>

                            {/* Arrow indicator */}
                            {index < filteredCategories.length - 1 && (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => moveUp(category)}
                                    disabled={index === 0}
                                    className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Subir"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => moveDown(category)}
                                    disabled={index === filteredCategories.length - 1}
                                    className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Bajar"
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => openEditModal(category)}
                                    className="p-1.5 text-gray-400 hover:text-primary-400"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteCategory(category)}
                                    className="p-1.5 text-gray-400 hover:text-red-400"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredCategories.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No hay categorías definidas
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
                                {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ej: Cadete"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Código</label>
                                <input
                                    type="text"
                                    value={formCode}
                                    onChange={(e) => setFormCode(e.target.value)}
                                    placeholder="Ej: U16"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Edad mínima</label>
                                    <input
                                        type="number"
                                        value={formMinAge}
                                        onChange={(e) => setFormMinAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        placeholder="14"
                                        min={0}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Edad máxima</label>
                                    <input
                                        type="number"
                                        value={formMaxAge}
                                        onChange={(e) => setFormMaxAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        placeholder="15"
                                        min={0}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500">Las edades son orientativas y no bloquean asignaciones.</p>

                            <div className="flex items-center gap-2 p-3 bg-gray-900 rounded-lg">
                                <span className="text-sm text-gray-400">Género:</span>
                                <span className={`px-2 py-0.5 rounded text-sm font-medium ${activeGender === 'female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {activeGender === 'female' ? 'Femenino' : 'Masculino'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button variant="secondary" className="flex-1" onClick={closeModal}>
                                Cancelar
                            </Button>
                            <Button variant="primary" icon={Save} className="flex-1" onClick={saveCategory} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
