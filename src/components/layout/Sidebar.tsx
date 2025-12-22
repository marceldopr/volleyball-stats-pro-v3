import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  UserCog,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  Activity
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { useRoleScope } from '@/hooks/useRoleScope'
import { clubService } from '@/services/clubService'

// Navigation item with level-based hierarchy
interface NavItem {
  id: string
  title: string
  href?: string
  icon?: any
  level: 1 | 2 | 3 | 4  // Visual hierarchy level
  children?: { name: string; href: string }[]
}

export function Sidebar() {
  const [isClubMenuOpen, setIsClubMenuOpen] = useState(false)
  const [clubName, setClubName] = useState<string>('')
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { isDT, role } = useRoleScope()

  // Expanded items (for items with children)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set())

  // Fetch club name
  useEffect(() => {
    async function fetchClub() {
      if (profile?.club_id) {
        try {
          const club = await clubService.getClub(profile.club_id)
          if (club) {
            setClubName(club.name)
          }
        } catch (error) {
          console.error('Error fetching club:', error)
        }
      }
    }
    fetchClub()
  }, [profile?.club_id])

  // New flat navigation structure with levels
  const navigation: NavItem[] = useMemo(() => {
    if (!isDT) {
      // Coach navigation (simplified)
      return [
        { id: 'inicio', title: 'Inicio', href: '/', icon: Home, level: 1 },
        { id: 'calendario', title: 'Calendario', href: '/calendario', icon: Calendar, level: 1 },
        { id: 'equipos', title: 'Mis Equipos', href: '/teams', icon: Users, level: 2 },
        { id: 'partidos', title: 'Partidos', href: '/matches', icon: Trophy, level: 2 },
        { id: 'informes', title: 'Informes', href: '/reports/players', icon: BarChart3, level: 3 }
      ]
    }

    // DT navigation (4-level hierarchy)
    return [
      // LEVEL 1 - Daily Operations
      { id: 'inicio', title: 'Inicio', href: '/', icon: Home, level: 1 },
      { id: 'calendario', title: 'Calendario', href: '/calendario', icon: Calendar, level: 1 },

      // LEVEL 2 - Main Entities (no duplications)
      { id: 'equipos', title: 'Equipos', href: '/teams', icon: Users, level: 2 },
      { id: 'jugadores', title: 'Jugadores', href: '/players', icon: Users, level: 2 },
      { id: 'entrenadores', title: 'Entrenadores', href: '/coaches', icon: UserCog, level: 2 },
      { id: 'partidos', title: 'Partidos', href: '/matches', icon: Trophy, level: 2 },

      // LEVEL 3 - Analytics & Tracking
      {
        id: 'estadisticas',
        title: 'Estadísticas',
        icon: BarChart3,
        level: 3,
        children: [
          { name: 'Equipos', href: '/stats' },
          { name: 'Jugadores', href: '/reports/players' }
        ]
      },
      { id: 'informes', title: 'Informes', href: '/club/dashboard', icon: FileText, level: 3 },
      { id: 'salud', title: 'Salud y disponibilidad', href: '/salud-disponibilidad', icon: Activity, level: 3 },

      // LEVEL 4 - Structure & Configuration
      {
        id: 'planificacion',
        title: 'Planificación',
        icon: FileText,
        level: 4,
        children: [
          { name: 'Temporada activa', href: '/reports/team-plans' },
          { name: 'Próxima temporada', href: '/next-season' }
        ]
      },

      { id: 'temporadas', title: 'Temporadas', href: '/settings?section=temporada', icon: Calendar, level: 4 },
      { id: 'ajustes', title: 'Ajustes del club', href: '/settings', icon: Settings, level: 4 }
    ]
  }, [isDT])

  // Auto-expand items when navigating to child route
  useEffect(() => {
    const path = location.pathname

    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child =>
          child.href && path.startsWith(child.href.split('?')[0])
        )
        if (hasActiveChild) {
          setExpandedItems(prev => new Set([...prev, item.id]))
        }
      }
    })
  }, [location.pathname, navigation])

  const displayName = profile?.full_name || 'Usuario'

  let roleLabel = 'Usuario'
  const roleStr = role as string
  if (roleStr === 'dt' || roleStr === 'director_tecnic') roleLabel = 'Director Técnico'
  if (roleStr === 'coach' || roleStr === 'entrenador') roleLabel = 'Entrenador'
  if (roleStr === 'admin') roleLabel = 'Administrador'

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const isItemActive = (href?: string) => {
    if (!href) return false
    const [path, query] = href.split('?')
    if (location.pathname !== path && !location.pathname.startsWith(path + '/')) return false
    if (query && !location.search.includes(query)) return false
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Helper to get spacing based on level transitions
  const getLevelSpacing = (currentLevel: number, nextLevel?: number) => {
    if (!nextLevel) return '' // Last item, no margin

    if (currentLevel === 1 && nextLevel === 2) return 'mb-6' // Large gap after daily ops
    if (currentLevel === 2 && nextLevel === 3) return 'mb-5' // Medium gap before analytics
    if (currentLevel === 3 && nextLevel === 4) return 'mb-6' // Large gap before config

    return '' // No extra gap within same level
  }

  // Helper to get styles based on level
  const getLevelStyles = (level: number, isActive: boolean) => {
    const baseStyles = 'flex items-center gap-3 w-full rounded-lg transition-all duration-200'

    switch (level) {
      case 1: // Daily Operations - Bold, prominent
        return clsx(
          baseStyles,
          'px-3 py-2.5 text-base font-semibold',
          isActive
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        )

      case 2: // Main Entities - Medium weight
        return clsx(
          baseStyles,
          'px-3 py-2 text-sm font-medium',
          isActive
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        )

      case 3: // Analytics - Same as Level 2
        return clsx(
          baseStyles,
          'px-3 py-2 text-sm font-medium',
          isActive
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        )

      case 4: // Configuration - Lighter, less prominent
        return clsx(
          baseStyles,
          'px-3 py-1.5 text-sm font-normal',
          isActive
            ? 'bg-gray-700/30 text-gray-300'
            : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-300'
        )

      default:
        return baseStyles
    }
  }

  // Helper for children/subitems
  const getSubitemStyles = (isActive: boolean) => {
    return clsx(
      'flex items-center w-full py-1.5 pl-11 pr-3 rounded-lg text-sm transition-colors',
      isActive
        ? 'text-primary-400 bg-primary-600/10'
        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
    )
  }

  const renderNavItem = (item: NavItem, index: number, allItems: NavItem[]) => {
    const isActive = isItemActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = hasChildren && expandedItems.has(item.id)
    const nextItem = allItems[index + 1]
    const spacing = getLevelSpacing(item.level, nextItem?.level)

    if (hasChildren) {
      return (
        <div key={item.id} className={spacing}>
          <button
            onClick={() => toggleItem(item.id)}
            className={getLevelStyles(item.level, false)}
          >
            {item.icon && <item.icon className="w-5 h-5 flex-shrink-0 text-gray-400" />}
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronRight
              className={clsx(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
          <div
            className={clsx(
              'overflow-hidden transition-all duration-200',
              isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="mt-1 space-y-0.5">
              {item.children!.map(child => {
                const childActive = isItemActive(child.href)
                return (
                  <Link
                    key={child.name}
                    to={child.href}
                    className={getSubitemStyles(childActive)}
                  >
                    {child.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        to={item.href!}
        className={clsx(getLevelStyles(item.level, isActive), spacing)}
      >
        {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="flex flex-col items-center justify-center h-20 px-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary-500" />
          <h1 className="text-white font-bold text-lg">Volleyball Stats</h1>
        </div>
        <p className="text-gray-400 text-xs mt-1">Pro Analytics</p>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-3 flex-1 overflow-y-auto">
        <div className="pb-4">
          {navigation.map((item, index) => renderNavItem(item, index, navigation))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
        {profile && (
          <div>
            <button
              type="button"
              onClick={() => setIsClubMenuOpen(open => !open)}
              className="w-full flex items-center justify-between gap-3 text-left hover:bg-gray-800/50 rounded-lg p-2 transition-colors"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-base font-semibold text-white truncate" title={clubName}>
                  {clubName || 'Cargando...'}
                </span>
                <span className="text-xs text-white truncate" title={displayName}>
                  {displayName}
                </span>
                <span className="text-xs font-medium text-primary-500">
                  {roleLabel}
                </span>
              </div>

              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-600 text-gray-200 flex-shrink-0">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${isClubMenuOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {isClubMenuOpen && (
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}