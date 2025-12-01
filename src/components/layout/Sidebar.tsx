import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Trophy,
  BarChart3,
  Settings,
  Info,
  Menu,
  X,
  LogOut,
  UserCog,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { useRoleScope } from '@/hooks/useRoleScope'

// Navigation item types
interface NavItem {
  name: string
  href?: string
  icon: any
  placeholder?: boolean
  children?: NavItem[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { isDT, isCoach, role } = useRoleScope()

  // Navigation structure based on role
  const navigation: NavSection[] = []

  if (isDT) {
    navigation.push(
      {
        items: [
          { name: 'Inicio', href: '/', icon: Home }
        ]
      },
      {
        title: 'Club',
        items: [
          { name: 'Jugadoras', href: '/players', icon: Users },
          { name: 'Equipos', href: '/teams', icon: Users },
          { name: 'Partidos', href: '/matches', icon: Trophy }
        ]
      },
      {
        title: 'Gestión',
        items: [
          { name: 'Planificación', href: '/reports/team-plans', icon: FileText },
          { name: 'Informes', href: '/reports/players', icon: BarChart3 },
          { name: 'Dashboard Club', href: '/club/dashboard', icon: BarChart3 }
        ]
      },
      {
        title: 'Administración',
        items: [
          { name: 'Entrenadores', href: '/coach-assignments', icon: UserCog },
          { name: 'Configuración', href: '/settings', icon: Settings },
          { name: 'Importar / Exportar', href: '/import-export', icon: FileText, placeholder: true },
          { name: 'Sobre la App', href: '/about', icon: Info }
        ]
      }
    )
  } else if (isCoach) {
    navigation.push(
      {
        items: [
          { name: 'Inicio', href: '/', icon: Home }
        ]
      },
      {
        title: 'Mi Gestión',
        items: [
          { name: 'Mis Equipos', href: '/teams', icon: Users },
          { name: 'Partidos', href: '/matches', icon: Trophy },
          { name: 'Informes', href: '/reports/players', icon: BarChart3 }
        ]
      },
      {
        items: [
          { name: 'Sobre la App', href: '/about', icon: Info }
        ]
      }
    )
  }

  const displayName = profile?.full_name || 'Usuario'

  let roleLabel = 'Usuario'
  const roleStr = role as string
  if (roleStr === 'dt' || roleStr === 'director_tecnic') roleLabel = 'Director/a Técnico/a'
  if (roleStr === 'coach' || roleStr === 'entrenador') roleLabel = 'Entrenador/a'
  if (roleStr === 'admin') roleLabel = 'Administrador/a'

  const navigationSections = navigation

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(title)) {
      newExpanded.delete(title)
    } else {
      newExpanded.add(title)
    }
    setExpandedSections(newExpanded)
  }

  const handleItemClick = (item: NavItem) => {
    if (item.placeholder) {
      // Show placeholder message
      return
    }
    setIsOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = item.href && location.pathname === item.href

    if (item.placeholder) {
      return (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-not-allowed opacity-60"
          title="Próximamente"
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{item.name}</span>
          <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded">Pronto</span>
        </div>
      )
    }

    if (item.children) {
      const isExpanded = expandedSections.has(item.name)
      return (
        <div>
          <button
            onClick={() => toggleSection(item.name)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200 font-medium w-full"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.name}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronRight className="w-4 h-4 ml-auto" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => (
                <div key={child.name}>{renderNavItem(child)}</div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        to={item.href!}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200 font-medium',
          isActive && 'bg-gray-800 text-white'
        )}
        onClick={() => handleItemClick(item)}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.name}</span>
      </Link>
    )
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
            <p className="text-xs text-slate-400">Sesión iniciada como</p>
            <p className="text-sm font-medium text-white truncate" title={displayName}>
              {displayName}
            </p>
            <p className="text-xs text-emerald-400">
              {roleLabel}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-3 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <div className="space-y-6">
            {navigationSections.map((section, idx) => (
              <div key={idx}>
                {section.title && (
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      {renderNavItem(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900">
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