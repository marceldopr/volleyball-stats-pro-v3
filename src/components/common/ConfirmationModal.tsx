import { ReactNode, useEffect, useState, useRef } from 'react'
import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type ConfirmationSeverity = 'danger' | 'warning' | 'info'

export interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string | ReactNode
    severity?: ConfirmationSeverity
    confirmText?: string  // Text user must type (e.g., "ELIMINAR")
    requiresTyping?: boolean  // Force user to type confirmText
    countdown?: number  // Seconds before enabling confirm button
    itemsToLose?: string[]  // List of things that will be lost
}

/**
 * Robust Confirmation Modal (Dark Theme)
 * 
 * Replacement for unsafe window.confirm() with:
 * - Countdown timer before enabling confirm
 * - Required text input for critical operations
 * - Clear severity levels (danger/warning/info)
 * - List of items that will be lost
 * - Cannot close with ESC or click outside in danger mode
 */
export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    severity = 'warning',
    confirmText = 'CONFIRMAR',
    requiresTyping = false,
    countdown = 0,
    itemsToLose = []
}: ConfirmationModalProps) {
    const [typedText, setTypedText] = useState('')
    const [secondsLeft, setSecondsLeft] = useState(countdown)
    const inputRef = useRef<HTMLInputElement>(null)

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTypedText('')
            setSecondsLeft(countdown)

            // Auto-focus input if requires typing
            if (requiresTyping) {
                setTimeout(() => inputRef.current?.focus(), 100)
            }
        }
    }, [isOpen, countdown, requiresTyping])

    // Countdown timer
    useEffect(() => {
        if (!isOpen || secondsLeft <= 0) return

        const timer = setTimeout(() => {
            setSecondsLeft(prev => prev - 1)
        }, 1000)

        return () => clearTimeout(timer)
    }, [isOpen, secondsLeft])

    // Determine if confirm is allowed
    const textMatches = !requiresTyping || typedText === confirmText
    const countdownFinished = secondsLeft <= 0
    const canConfirm = textMatches && countdownFinished

    // Handle close - prevent in danger mode
    const handleClose = () => {
        if (severity === 'danger' && !canConfirm) return  // Block close in danger
        onClose()
    }

    // Handle confirm
    const handleConfirm = () => {
        if (!canConfirm) return
        onConfirm()
        onClose()
    }

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && canConfirm) {
            handleConfirm()
        } else if (e.key === 'Escape') {
            handleClose()
        }
    }

    if (!isOpen) return null

    // Severity configurations (dark theme)
    const severityConfig = {
        danger: {
            icon: AlertTriangle,
            bgColor: 'bg-red-900/30',
            borderColor: 'border-red-500/50',
            iconColor: 'text-red-500',
            buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
            iconBg: 'bg-red-500/20'
        },
        warning: {
            icon: AlertCircle,
            bgColor: 'bg-yellow-900/30',
            borderColor: 'border-yellow-500/50',
            iconColor: 'text-yellow-500',
            buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
            iconBg: 'bg-yellow-500/20'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-900/30',
            borderColor: 'border-blue-500/50',
            iconColor: 'text-blue-500',
            buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
            iconBg: 'bg-blue-500/20'
        }
    }

    const config = severityConfig[severity]
    const Icon = config.icon

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className={`relative max-w-md w-full mx-4 bg-gray-800 rounded-xl shadow-2xl border ${config.borderColor}`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Close button - disabled in danger mode if not confirmed */}
                {!(severity === 'danger' && !canConfirm) && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-700 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                )}

                <div className="p-6">
                    {/* Header with icon */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${config.iconColor}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">
                                {title}
                            </h3>
                            <div className="text-gray-300">
                                {typeof message === 'string' ? <p>{message}</p> : message}
                            </div>
                        </div>
                    </div>

                    {/* Items to lose */}
                    {itemsToLose.length > 0 && (
                        <div className={`mb-4 p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                            <p className="font-semibold text-gray-200 mb-2">Se perderán:</p>
                            <ul className="space-y-1">
                                {itemsToLose.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                        <span className={`w-1.5 h-1.5 rounded-full ${config.iconColor.replace('text-', 'bg-')}`} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Typing requirement */}
                    {requiresTyping && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Para confirmar, escribe: <span className="font-mono font-bold text-white">{confirmText}</span>
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={typedText}
                                onChange={(e) => setTypedText(e.target.value)}
                                className={`w-full px-3 py-2 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 text-white placeholder-gray-500 ${typedText && !textMatches
                                    ? 'border-red-500/50 focus:ring-red-500'
                                    : 'border-gray-600 focus:ring-primary-500'
                                    }`}
                                placeholder={confirmText}
                                autoComplete="off"
                            />
                            {typedText && !textMatches && (
                                <p className="mt-1 text-sm text-red-400">
                                    El texto no coincide
                                </p>
                            )}
                        </div>
                    )}

                    {/* Countdown warning */}
                    {secondsLeft > 0 && (
                        <div className={`mb-4 p-3 rounded-lg ${config.bgColor} text-center`}>
                            <p className={`text-sm font-medium ${config.iconColor}`}>
                                Espera {secondsLeft} segundo{secondsLeft !== 1 ? 's' : ''}...
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <button
                            onClick={handleConfirm}
                            disabled={!canConfirm}
                            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${canConfirm
                                ? config.buttonClass
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
