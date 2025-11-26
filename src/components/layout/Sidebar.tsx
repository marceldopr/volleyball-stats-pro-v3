import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Trophy,
  BarChart3,
  Settings,
  Download,
  Info,
  Menu,
  X,
  LogOut,
  UserCog
} from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Jugadoras', href: '/players', icon: Users },
  { name: 'Equipos', href: '/teams', icon: Users },
  { name: 'Partidos', href: '/matches', icon: Trophy },
  { name: 'Análisis', href: '/analytics', icon: BarChart3 },
  { name: 'Entrenadores', href: '/coach-assignments', icon: UserCog, roles: ['dt', 'admin'] },
  { name: 'Configuración', href: '/settings', icon: Settings },
  { name: 'Exportaciones', href: '/exports', icon: Download },
  { name: 'Sobre la App', href: '/about', icon: Info },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { role } = useCurrentUserRole()

  // Calculate display name and role label
  const displayName = profile?.full_name || 'Usuario'

  let roleLabel = 'Usuari'
  const roleStr = role as string
  if (roleStr === 'dt' || roleStr === 'director_tecnic') roleLabel = 'Director/a Tècnic/a'
  if (roleStr === 'coach' || roleStr === 'entrenador') roleLabel = 'Entrenador/a'
  if (roleStr === 'admin') roleLabel = 'Administrador/a'

  const filteredNavigation = navigation.filter(item => {
    // Check if item has role restrictions
    if ('roles' in item && item.roles) {
      const roleStr = role as string
      return item.roles.includes(roleStr) || item.roles.includes('admin')
    }

    // Support both new and legacy role names to prevent empty sidebar with stale sessions
    const roleStr = role as string
    if (roleStr === 'dt' || roleStr === 'admin' || roleStr === 'director_tecnic') return true
    if (roleStr === 'coach' || roleStr === 'entrenador') {
      return ['Home', 'Jugadoras', 'Equipos', 'Partidos', 'Configuración', 'Sobre la App'].includes(item.name)
    }
    return false
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-14 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-lg bg-gray-900 shadow-lg text-white hover:bg-gray-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex flex-col items-center justify-center h-20 px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary-500" />
            <h1 className="text-white font-bold text-lg">Volleyball Stats</h1>
          </div>
          <p className="text-gray-400 text-xs mt-1">Pro Analytics</p>
        </div>

        {/* User Profile Section */}
        {profile && (
          <div className="px-4 pt-4 pb-3 border-b border-slate-800">
            <p className="text-xs text-slate-400">Sessió iniciada com</p>
            <p className="text-sm font-medium text-white truncate" title={displayName}>
              {displayName}
            </p>
            <p className="text-xs text-emerald-400">
              {roleLabel}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={clsx(
                      'nav-link',
                      isActive && 'active'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="nav-icon" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="text-center">
            <p className="text-gray-500 text-xs mb-4">v1.0.0</p>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}