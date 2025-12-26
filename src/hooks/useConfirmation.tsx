import { useState, useCallback } from 'react'
import { ConfirmationModal, ConfirmationModalProps } from '@/components/common/ConfirmationModal'

/**
 * Hook for programmatic confirmation dialogs
 * 
 * Replacement for window.confirm() with await/async pattern
 * 
 * @example
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirmation()
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Eliminar Jugadora',
 *     message: 'Esta jugadora tiene datos asociados',
 *     severity: 'danger',
 *     confirmText: 'ELIMINAR',
 *     countdown: 3,
 *     requiresTyping: true,
 *     itemsToLose: ['Reportes', 'Estadísticas', 'Convocatorias']
 *   })
 *   
 *   if (confirmed) {
 *     await deletePlayer(id)
 *   }
 * }
 * 
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     {ConfirmDialog}
 *   </>
 * )
 * ```
 */

type ConfirmOptions = Omit<ConfirmationModalProps, 'isOpen' | 'onClose' | 'onConfirm'>

interface UseConfirmationReturn {
    confirm: (options: ConfirmOptions) => Promise<boolean>
    ConfirmDialog: JSX.Element | null
    isOpen: boolean
}

export function useConfirmation(): UseConfirmationReturn {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions | null>(null)
    const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts)
        setIsOpen(true)

        return new Promise<boolean>((resolve) => {
            setResolvePromise(() => resolve)
        })
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
        if (resolvePromise) {
            resolvePromise(false)
            setResolvePromise(null)
        }
    }, [resolvePromise])

    const handleConfirm = useCallback(() => {
        setIsOpen(false)
        if (resolvePromise) {
            resolvePromise(true)
            setResolvePromise(null)
        }
    }, [resolvePromise])

    // Direct import instead of require()
    const ConfirmDialog = isOpen && options ? (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            {...options}
        />
    ) : null

    return {
        confirm,
        ConfirmDialog,
        isOpen
    }
}
