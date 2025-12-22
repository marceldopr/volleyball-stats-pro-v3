import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, Zap } from 'lucide-react'
import { clsx } from 'clsx'

interface AppLayoutProps {
    children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const location = useLocation()

    // Close sidebar on route change automatically
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [location.pathname])

    // Helper to get title based on path
    const getPageTitle = (pathname: string): string => {
        if (pathname === '/' || pathname === '/home') return 'Inicio'
        if (pathname.startsWith('/teams')) return 'Equipos'
        if (pathname.startsWith('/players')) return 'Jugadores'
        if (pathname.startsWith('/matches')) return 'Partidos'
        if (pathname.startsWith('/calendar')) return 'Calendario'
        if (pathname.startsWith('/stats')) return 'Estadísticas'
        if (pathname.startsWith('/settings')) return 'Configuración'
        if (pathname.startsWith('/club')) return 'Club'
        if (pathname.startsWith('/reports')) return 'Informes'
        if (pathname.startsWith('/trainings')) return 'Entrenamientos'
        if (pathname.startsWith('/coaches')) return 'Entrenadores'
        if (pathname.startsWith('/exports')) return 'Exportar Datos'
        if (pathname.startsWith('/next-season')) return 'Próxima Temporada'
        return 'Volleyball Stats'
    }

    const pageTitle = getPageTitle(location.pathname)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row">
            {/* Mobile Topbar (Fixed) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 z-50 flex items-center px-4 justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                        aria-label="Menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="text-white font-semibold text-lg tracking-tight truncate max-w-[200px]">
                        {pageTitle}
                    </span>
                </div>
                {/* Optional: Right side icon or action for mobile */}
                <div className="flex items-center">
                    <Zap className="w-5 h-5 text-primary-500" />
                </div>
            </div>

            {/* Mobile Sidebar Drawer Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            {/* Mobile: Drawer (Fixed + Transform) | Desktop: Static (Block) */}
            <aside
                className={clsx(
                    'fixed inset-y-0 left-0 z-[60] w-64 bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:shadow-none lg:z-auto',
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* 
                    We pass a specialized prop or just render Sidebar.
                    Since we are refactoring Sidebar to be "dumb", 
                    it will just take the space of this container.
                */}
                <Sidebar />
            </aside>

            {/* Main Content Area */}
            {/* Mobile: pt-16 to account for Topbar | Desktop: No padding top needed as sidebar is side-by-side */}
            <main className="flex-1 min-w-0 pt-16 lg:pt-0 overflow-y-auto h-screen">
                {children}
            </main>

        </div>
    )
}
