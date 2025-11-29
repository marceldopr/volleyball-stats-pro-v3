import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react'

type BadgeStatusType = 'ok' | 'warning' | 'error' | 'info'
type BadgeSize = 'sm' | 'md'

interface BadgeStatusProps {
    status: BadgeStatusType
    label: string
    size?: BadgeSize
    icon?: boolean
}

const statusConfig = {
    ok: {
        bgLight: 'bg-green-100',
        textLight: 'text-green-800',
        bgDark: 'dark:bg-green-900',
        textDark: 'dark:text-green-200',
        icon: CheckCircle
    },
    warning: {
        bgLight: 'bg-yellow-100',
        textLight: 'text-yellow-800',
        bgDark: 'dark:bg-yellow-900',
        textDark: 'dark:text-yellow-200',
        icon: AlertCircle
    },
    error: {
        bgLight: 'bg-red-100',
        textLight: 'text-red-800',
        bgDark: 'dark:bg-red-900',
        textDark: 'dark:text-red-200',
        icon: XCircle
    },
    info: {
        bgLight: 'bg-blue-100',
        textLight: 'text-blue-800',
        bgDark: 'dark:bg-blue-900',
        textDark: 'dark:text-blue-200',
        icon: Info
    }
}

export function BadgeStatus({
    status,
    label,
    size = 'md',
    icon = true
}: BadgeStatusProps) {
    const config = statusConfig[status]
    const Icon = config.icon

    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-xs'
        : 'px-2.5 py-1 text-sm'

    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgLight} ${config.textLight} ${config.bgDark} ${config.textDark} ${sizeClasses}`}
        >
            {icon && <Icon className={iconSize} />}
            <span>{label}</span>
        </span>
    )
}
