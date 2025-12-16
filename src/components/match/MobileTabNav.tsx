import { clsx } from 'clsx'
import { Activity, RotateCw, List } from 'lucide-react'

export type TabView = 'actions' | 'rotation' | 'timeline'

interface MobileTabNavProps {
    activeTab: TabView
    onTabChange: (tab: TabView) => void
    className?: string
}

export function MobileTabNav({ activeTab, onTabChange, className }: MobileTabNavProps) {
    const tabs: { id: TabView; label: string; icon: React.ElementType }[] = [
        { id: 'actions', label: 'Acciones', icon: Activity },
        { id: 'rotation', label: 'Rotación', icon: RotateCw },
        { id: 'timeline', label: 'Timeline', icon: List },
    ]

    return (
        <div className={clsx("flex items-center bg-zinc-900 border-b border-zinc-800 sticky z-20 top-[92px] lg:hidden", className)}>
            {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={clsx(
                            "flex-1 flex flex-col items-center justify-center py-2.5 transition-colors relative",
                            isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-400"
                        )}
                    >
                        <Icon size={20} className="mb-0.5" />
                        <span className="text-[10px] uppercase font-bold tracking-wide">{tab.label}</span>

                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_-2px_6px_rgba(16,185,129,0.3)]" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}
