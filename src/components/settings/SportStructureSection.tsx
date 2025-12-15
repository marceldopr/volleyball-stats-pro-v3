/**
 * SportStructureSection - Hub for sports structure configuration
 * 
 * Contains tabs for:
 * - Categorías (age categories)
 * - Identificadores (team line identifiers: A/B/C or colors)
 * - Rutas de promoción (placeholder for future)
 */

import { useState } from 'react'
import { Layers, Tag, GitBranch } from 'lucide-react'
import { CategoriesTab } from './CategoriesTab'
import { IdentifiersTab } from './IdentifiersTab'

interface SportStructureSectionProps {
    clubId: string
}

type TabId = 'categories' | 'identifiers' | 'routes'

interface Tab {
    id: TabId
    name: string
    icon: React.ReactNode
    badge?: string
}

export function SportStructureSection({ clubId }: SportStructureSectionProps) {
    const [activeTab, setActiveTab] = useState<TabId>('categories')

    const tabs: Tab[] = [
        { id: 'categories', name: 'Categorías', icon: <Layers className="w-4 h-4" /> },
        { id: 'identifiers', name: 'Identificadores', icon: <Tag className="w-4 h-4" /> },
        { id: 'routes', name: 'Rutas de promoción', icon: <GitBranch className="w-4 h-4" />, badge: 'Pronto' }
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'categories':
                return <CategoriesTab clubId={clubId} />
            case 'identifiers':
                return <IdentifiersTab clubId={clubId} />
            case 'routes':
                return (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                        <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Rutas de promoción</h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto">
                            Define las rutas de promoción entre categorías para automatizar
                            las sugerencias de asignación en la planificación de temporada.
                        </p>
                        <div className="mt-4 inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                            Próximamente
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-1">Estructura Deportiva</h2>
                <p className="text-gray-400 text-sm">
                    Configura las categorías, identificadores de línea y rutas de promoción del club.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        disabled={!!tab.badge}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex-1 justify-center ${activeTab === tab.id
                                ? 'bg-gray-700 text-white'
                                : tab.badge
                                    ? 'text-gray-500 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        {tab.icon}
                        <span>{tab.name}</span>
                        {tab.badge && (
                            <span className="px-1.5 py-0.5 bg-gray-700 text-gray-500 rounded text-xs">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    )
}
