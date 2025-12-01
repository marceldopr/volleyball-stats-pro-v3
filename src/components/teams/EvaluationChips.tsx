import { clsx } from 'clsx'
import type { PlayerEvaluationDB } from '@/services/playerEvaluationService'

interface EvaluationChipsProps {
    evaluations: {
        start?: PlayerEvaluationDB
        mid?: PlayerEvaluationDB
        end?: PlayerEvaluationDB
    }
    onChipClick: (type: 'start' | 'mid' | 'end') => void
    canEdit: boolean
}

export function EvaluationChips({ evaluations, onChipClick, canEdit }: EvaluationChipsProps) {
    const chips: Array<{
        type: 'start' | 'mid' | 'end'
        label: string
        evaluation?: PlayerEvaluationDB
    }> = [
            { type: 'start', label: 'INI', evaluation: evaluations.start },
            { type: 'mid', label: 'MIT', evaluation: evaluations.mid },
            { type: 'end', label: 'FIN', evaluation: evaluations.end }
        ]

    return (
        <div className="flex gap-1.5">
            {chips.map(({ type, label, evaluation }) => {
                const isCompleted = !!evaluation
                const isDisabled = !canEdit

                return (
                    <button
                        key={type}
                        onClick={() => !isDisabled && onChipClick(type)}
                        disabled={isDisabled}
                        className={clsx(
                            'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                            'border focus:outline-none focus:ring-2 focus:ring-offset-1',
                            isCompleted
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 focus:ring-green-500 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700',
                            isDisabled && 'opacity-50 cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800',
                            !isDisabled && 'cursor-pointer'
                        )}
                        title={
                            isDisabled
                                ? 'No tienes permisos para editar evaluaciones'
                                : isCompleted
                                    ? `Evaluación ${label} completada - Click para ver/editar`
                                    : `Click para crear evaluación ${label}`
                        }
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    )
}
